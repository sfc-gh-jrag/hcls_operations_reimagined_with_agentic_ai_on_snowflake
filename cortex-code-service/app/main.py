import asyncio
import logging
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .framework import AgentRunner, get_agent, list_agents

TOKEN_PATH = Path("/snowflake/session/token")
CONN_TOML_PATH = Path.home() / ".snowflake" / "connections.toml"


def _refresh_token():
    if not TOKEN_PATH.exists():
        return
    try:
        fresh_token = TOKEN_PATH.read_text().strip()
        toml_content = CONN_TOML_PATH.read_text()
        import re
        updated = re.sub(r'token\s*=\s*"[^"]*"', f'token = "{fresh_token}"', toml_content)
        CONN_TOML_PATH.write_text(updated)
        os.chmod(CONN_TOML_PATH, 0o600)
    except Exception as e:
        logging.getLogger(__name__).warning(f"Token refresh failed: {e}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cortex Code Agent Framework",
    description="Reusable framework for hosting Cortex Code agents via API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict[str, dict] = {}
bulk_jobs: dict[str, dict] = {}

BULK_CONCURRENCY = 3


class ProcessRequest(BaseModel):
    agent_name: str
    input: dict


class BulkRequest(BaseModel):
    agent_name: str
    claim_ids: list[str]


class HealthResponse(BaseModel):
    status: str
    agents: list[str]


@app.on_event("startup")
async def startup():
    from .agents.denied_claims.config import register_denied_claims_agent
    from .agents.personas import register_placeholder_personas

    register_denied_claims_agent()
    register_placeholder_personas()
    logger.info("Agents registered: %s", [a["name"] for a in list_agents()])


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        agents=[a["name"] for a in list_agents()],
    )


@app.get("/agents")
async def get_agents():
    return list_agents()


@app.get("/agents/{name}")
async def get_agent_detail(name: str):
    agents = list_agents()
    for a in agents:
        if a["name"] == name:
            return a
    raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")


async def _run_agent_job(job_id: str, runner: AgentRunner, input_data: dict):
    _refresh_token()
    try:
        async for event in runner.process_streaming(input_data):
            if event.get("type") == "text":
                jobs[job_id]["messages"].append({"type": "text", "content": event["content"]})
            elif event.get("type") == "tool_call":
                tool_input = event.get("input", {})
                detail = ""
                if isinstance(tool_input, dict):
                    detail = tool_input.get("sql", "") or tool_input.get("command", "") or tool_input.get("query", "") or tool_input.get("pattern", "") or tool_input.get("file_path", "") or ""
                jobs[job_id]["messages"].append({"type": "tool", "content": event["tool"], "detail": str(detail)[:2000]})
            elif event.get("type") == "result":
                jobs[job_id]["result"] = event
                jobs[job_id]["status"] = "error" if event.get("is_error") else "completed"
                logger.info(f"Job {job_id} result: is_error={event.get('is_error')} has_structured={event.get('structured_output') is not None}")
            elif event.get("type") == "system":
                jobs[job_id]["messages"].append({"type": "system", "content": event.get("subtype", "")})
    except Exception as e:
        logger.exception(f"Job {job_id} failed")
        jobs[job_id]["status"] = "error"
        jobs[job_id]["result"] = {"type": "result", "is_error": True, "result_text": str(e), "structured_output": None}


@app.post("/api/submit")
async def submit(req: ProcessRequest):
    config = get_agent(req.agent_name)
    if not config:
        raise HTTPException(status_code=404, detail=f"Agent '{req.agent_name}' not found")

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "running", "messages": [], "result": None}

    runner = AgentRunner(config)
    asyncio.create_task(_run_agent_job(job_id, runner, req.input))
    logger.info(f"Job {job_id} submitted for agent={req.agent_name}")

    return {"job_id": job_id, "status": "running"}


@app.get("/api/status/{job_id}")
async def status(job_id: str, after: int = 0):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    new_messages = job["messages"][after:]
    return {
        "status": job["status"],
        "messages": new_messages,
        "message_count": len(job["messages"]),
        "result": job["result"],
    }


async def _run_throttled_job(sem: asyncio.Semaphore, bulk_id: str, claim_id: str, runner: AgentRunner):
    async with sem:
        bulk_jobs[bulk_id]["jobs"][claim_id]["status"] = "running"
        job_id = f"{bulk_id}-{claim_id}"
        jobs[job_id] = {"status": "running", "messages": [], "result": None}
        try:
            await _run_agent_job(job_id, runner, {"claim_id": claim_id})
        except Exception:
            logger.exception(f"Bulk sub-job {job_id} failed")
            jobs[job_id]["status"] = "error"
        bulk_jobs[bulk_id]["jobs"][claim_id]["status"] = jobs[job_id]["status"]
        bulk_jobs[bulk_id]["jobs"][claim_id]["result"] = jobs[job_id].get("result")


@app.post("/api/bulk-submit")
async def bulk_submit(req: BulkRequest):
    config = get_agent(req.agent_name)
    if not config:
        raise HTTPException(status_code=404, detail=f"Agent '{req.agent_name}' not found")

    bulk_id = str(uuid.uuid4())[:8]
    bulk_jobs[bulk_id] = {
        "status": "running",
        "total": len(req.claim_ids),
        "jobs": {cid: {"status": "queued", "result": None} for cid in req.claim_ids},
    }

    sem = asyncio.Semaphore(BULK_CONCURRENCY)

    async def run_all():
        tasks = []
        for cid in req.claim_ids:
            runner = AgentRunner(config)
            tasks.append(_run_throttled_job(sem, bulk_id, cid, runner))
        await asyncio.gather(*tasks, return_exceptions=True)
        bulk_jobs[bulk_id]["status"] = "completed"

    asyncio.create_task(run_all())
    logger.info(f"Bulk job {bulk_id} submitted: {len(req.claim_ids)} claims for agent={req.agent_name}")
    return {"bulk_id": bulk_id, "status": "running", "total": len(req.claim_ids)}


@app.get("/api/bulk-status/{bulk_id}")
async def bulk_status(bulk_id: str):
    bj = bulk_jobs.get(bulk_id)
    if not bj:
        raise HTTPException(status_code=404, detail="Bulk job not found")

    statuses = [j["status"] for j in bj["jobs"].values()]
    return {
        "status": bj["status"],
        "total": bj["total"],
        "completed": statuses.count("completed"),
        "failed": statuses.count("error"),
        "running": statuses.count("running"),
        "queued": statuses.count("queued"),
        "jobs": bj["jobs"],
    }
