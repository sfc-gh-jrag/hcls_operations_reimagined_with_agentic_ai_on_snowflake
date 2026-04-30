import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

BLOCKED_SQL_KEYWORDS = ["DROP", "TRUNCATE", "DELETE", "ALTER", "CREATE", "GRANT", "REVOKE"]
CLINICAL_FIELDS = ["DIAGNOSIS", "CPT", "ICD", "DRG", "PROCEDURE_CODE", "DIAGNOSIS_CODE"]


async def safety_gate(input_data: dict, tool_use_id: str, context) -> dict:
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    if tool_name == "SQL":
        sql = tool_input.get("sql", "").upper()
        if any(kw in sql for kw in BLOCKED_SQL_KEYWORDS):
            logger.warning("BLOCKED: Destructive SQL attempted: %s", sql[:200])
            return {"decision": "block", "reason": "Destructive SQL operations are not allowed. Only SELECT and controlled INSERT/UPDATE are permitted."}
        if "UPDATE" in sql and "CLAIMS" in sql:
            if any(f in sql for f in CLINICAL_FIELDS):
                logger.warning("BLOCKED: Clinical field modification attempted")
                return {"decision": "block", "reason": "Modifications to clinical fields (diagnosis codes, CPT codes, ICD codes, DRG) are prohibited. Only administrative fields may be updated."}

    if tool_name == "Bash":
        command = tool_input.get("command", "")
        dangerous = ["rm ", "rm\t", "rmdir", "mkfs", "dd ", "curl ", "wget "]
        if any(d in command.lower() for d in dangerous):
            logger.warning("BLOCKED: Dangerous bash command: %s", command[:200])
            return {"decision": "block", "reason": "This command is not allowed for safety reasons."}

    return {}


async def audit_logger(input_data: dict, tool_use_id: str, context) -> dict:
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    tool_response = input_data.get("tool_response", "")

    logger.info(
        "AUDIT | tool=%s | id=%s | input_size=%d | response_size=%d",
        tool_name,
        tool_use_id or "N/A",
        len(json.dumps(tool_input, default=str)),
        len(str(tool_response)[:500]),
    )

    return {}
