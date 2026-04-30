# HCLS Operations Reimagined with Agentic AI on Snowflake

## The Operational Burden in Healthcare

Healthcare dedicates over **$1 trillion annually** to operational administration — twenty cents of every dollar spent. Despite decades of investment in EHRs, revenue cycle platforms, and analytics dashboards, that ratio hasn't moved. The reason is structural: the hardest operational workflows in healthcare aren't constrained by data access. They're constrained by **judgment**.

Denied claims, prior authorizations, clinical documentation reviews, compliance audits, coding validation — each of these workflows requires specialists to interpret unstructured contracts, cross-reference structured records, weigh conflicting evidence, and make decisions under time pressure. These are reasoning problems, not retrieval problems. Rule engines automate the predictable. The judgment-heavy work — the work that drives the most cost and the most risk — remains stubbornly manual.

## A Repeatable Pattern for Judgment-Heavy Workflows

This project introduces a **dual-agent architecture** built entirely on Snowflake that redefines how healthcare organizations can approach operational workflows that depend on expert reasoning. The architecture combines two complementary AI agent patterns — each purpose-built for a different aspect of the problem:

**The Interactive Agent** works alongside the specialist in real time. Powered by Snowflake's **Cortex Agent API**, it connects to structured data through **Semantic Views** and to unstructured documents through **Cortex Search**, enabling natural-language exploration across both. The specialist asks; the agent retrieves, analyzes, and presents — keeping the human in control while eliminating the time spent navigating disconnected systems.

**The Worker Agent** operates autonomously before the specialist even opens a case. Built on the **Cortex Code Agent SDK**, it independently investigates, reasons through evidence, classifies, recommends actions, and generates artifacts. It then surfaces a completed work package for human review. The specialist's role shifts from processor to reviewer.

This pattern — an autonomous agent that prepares the work, paired with an interactive agent that supports deeper analysis — is applicable wherever operational workflows require expert judgment at scale.

## Denied Claims Handling: The Reference Implementation

This repository implements the dual-agent pattern against one of the highest-impact workflows in healthcare revenue cycle: **denied claims resolution**. Denials cost U.S. providers an estimated **$262 billion annually**, with individual cases requiring 45–90 minutes of manual investigation across multiple disconnected systems.

### How It Works

The **Worker Agent** receives a denied claim and autonomously conducts a multi-step investigation: pulling claims history, checking eligibility and benefits, searching for prior authorizations (including institutional knowledge like Group NPI fallback), reading payer contract language through Cortex Search, classifying the denial, recommending a resolution strategy, and drafting an appeal letter with citations. Total time: **under 3 minutes**.

The **Interactive Agent** gives revenue cycle specialists, directors, and finance leaders a conversational interface to explore denial trends, model revenue impact, benchmark payer performance, and investigate root causes — all grounded in the organization's governed data.

### Measured Impact

| Metric | Before | With Agents |
|--------|--------|-------------|
| **Specialist role** | Case processor | Work package reviewer |
| **Time per denial** | 45–90 minutes | 30 seconds to review |
| **Systems navigated** | 6+ | 1 unified interface |
| **Onboarding time** | 6 months to full productivity | Day-one contribution |
| **Recovery rate** | ~35% | ~72% |
| **Projected annual recovery** | — | **+$4.4M** in recovered revenue |
| **Specialist time saved** | — | **180 hours/month** redirected to escalations |

### Beyond Denied Claims

The architecture is intentionally workflow-agnostic. The same dual-agent pattern — autonomous preparation plus interactive analysis, running on Snowflake's governed AI platform — can be adapted to:

- **Prior Authorization** — automated evidence assembly and determination support
- **Clinical Documentation Review** — AI-assisted completeness and compliance checks
- **Coding Validation** — autonomous code review against clinical notes and payer rules
- **Compliance Monitoring** — continuous audit with exception surfacing for human review
- **Discharge Planning** — proactive identification of barriers and resource coordination

## Why Snowflake

The platform choice is not incidental. The dual-agent pattern depends on a set of capabilities that must work together within a single governance boundary:

| Capability | Role in the Architecture |
|-----------|--------------------------|
| **Cortex Agent API** | Powers the Interactive Agent — orchestrates Semantic Views and Cortex Search in one conversational interface |
| **Cortex Code Agent SDK** | Powers the Worker Agent — autonomous multi-step reasoning with code execution, data queries, and artifact generation |
| **Cortex Search** | Semantic retrieval over unstructured documents (payer contracts, clinical policies) during agent investigation |
| **Semantic Views** | Business-level semantic layer over operational data, enabling natural language queries without pre-built dashboards |
| **Snowpark Container Services** | Hosts both agent services with enterprise-grade security, RBAC, and public ingress — no external infrastructure needed |

Data, documents, AI models, and agent logic all reside in one environment. No data leaves the platform. No external LLM calls. Full auditability on every agent decision. Enterprise governance and role-based access from day one.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SNOWFLAKE ACCOUNT                     │
│                                                         │
│  ┌─────────────────────┐  ┌───────────────────────────┐ │
│  │  PLATFORM DATABASE   │  │      APP DATABASE          │ │
│  │  (CORTEX_CODE_DB)    │  │ (AGENTIC_DENIED_CLAIMS_    │ │
│  │                      │  │       HANDLING)             │ │
│  │  ┌────────────────┐  │  │                             │ │
│  │  │ Cortex Code    │  │  │  ┌─────────────────────┐   │ │
│  │  │ Service        │  │  │  │ Denied Claims App   │   │ │
│  │  │ (Agent SDK)    │◄─┼──┼──│ (React + FastAPI)   │   │ │
│  │  │ Port 8080      │  │  │  │ Port 3000           │   │ │
│  │  └────────────────┘  │  │  └──────────┬──────────┘   │ │
│  └─────────────────────┘  │              │               │ │
│                            │  ┌───────────▼───────────┐  │ │
│                            │  │ DENIED_CLAIMS Schema  │  │ │
│                            │  │ • 14 Tables           │  │ │
│                            │  │ • Cortex Search       │  │ │
│                            │  │ • Semantic View       │  │ │
│                            │  │ • Stages              │  │ │
│                            │  └───────────────────────┘  │ │
│                            └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Two-Service Architecture

| Service | Database | Purpose | Port |
|---------|----------|---------|------|
| **Cortex Code Service** | `CORTEX_CODE_DB` | Runs Cortex Code Agent SDK — headless agent execution for autonomous claim processing | 8080 |
| **Denied Claims App** | `AGENTIC_DENIED_CLAIMS_HANDLING` | React UI + FastAPI backend — review queue, interactive agent chat, appeal documents | 3000 |

## Prerequisites

- **Snowflake Account** with ACCOUNTADMIN role
- **Docker Desktop** installed (for building images)
- **Snowflake CLI** (`snow`) or **SnowSQL** (for running SQL scripts)
- **Python 3.10+** (optional, for running the seed data export script)

## Quick Start

### Step 1: Configure

```bash
# Copy and edit the environment file
cp deploy.env.example deploy.env
# Fill in your Snowflake account, username, etc.
vim deploy.env

# Run the configuration script to replace all placeholders
bash scripts/configure.sh
```

### Step 2: Create Snowflake Objects

Run the SQL scripts **in order** in Snowsight or SnowSQL:

```sql
-- 1. Create databases, schemas, warehouse, compute pool
@sql/01_databases_and_roles.sql

-- 2. Create all tables
@sql/02_tables.sql

-- 3. Insert seed data (members, claims, denials, payer docs, etc.)
@sql/03_seed_data.sql

-- 4. Create Cortex Search service and Semantic View
-- NOTE: Upload semantic model first (see Step 3b below)
@sql/04_cortex_services.sql
```

### Step 3: Build and Push Docker Images

```bash
bash scripts/build_and_push.sh
```

This builds both Docker images with `--platform linux/amd64` (required for SPCS) and pushes them to your Snowflake container registry.

### Step 3b: Upload Semantic Model

After running `build_and_push.sh`, upload the semantic model YAML to the Snowflake stage:

```sql
PUT 'file://react-app/semantic_model/denied_claims_model.yaml'
    '@<YOUR_APP_DATABASE>.<YOUR_APP_SCHEMA>.MODELS'
    OVERWRITE=TRUE AUTO_COMPRESS=FALSE;
```

Then run `sql/04_cortex_services.sql` to create the Cortex Search service and Semantic View.

### Step 4: Deploy SPCS Services

1. **Deploy the Platform Service first** (Cortex Code Service):
   - Run the first half of `sql/05_spcs_infrastructure.sql` (platform service section)
   - Wait for the service to become READY:
     ```sql
     SELECT SYSTEM$GET_SERVICE_STATUS('CORTEX_CODE_DB.SPCS.CORTEX_CODE_SERVICE');
     ```
   - Get the platform endpoint:
     ```sql
     SHOW ENDPOINTS IN SERVICE CORTEX_CODE_DB.SPCS.CORTEX_CODE_SERVICE;
     ```
   - Copy the `ingress_url` (without `https://`) — this is your `PLATFORM_ENDPOINT`

2. **Update deploy.env** with `PLATFORM_ENDPOINT` and `SNOWFLAKE_PAT`:
   - Create a Personal Access Token in Snowsight: User Menu > Settings > Authentication
   - Add both values to `deploy.env`
   - Re-run `bash scripts/configure.sh` to update the SQL

3. **Deploy the App Service**:
   - Run the second half of `sql/05_spcs_infrastructure.sql` (app service section)

### Step 5: Verify

```bash
bash scripts/check_status.sh
```

Or manually:
```sql
SELECT SYSTEM$GET_SERVICE_STATUS('<APP_DATABASE>.SPCS.DENIED_CLAIMS_APP');
SHOW ENDPOINTS IN SERVICE <APP_DATABASE>.SPCS.DENIED_CLAIMS_APP;
```

The app endpoint URL will be your dashboard URL.

## Project Structure

```
├── deploy.env.example          # Configuration template
├── .gitignore
├── README.md
│
├── sql/                        # Snowflake SQL scripts (run in order)
│   ├── 01_databases_and_roles.sql
│   ├── 02_tables.sql
│   ├── 03_seed_data.sql        # Auto-generated from live data
│   ├── 04_cortex_services.sql  # Cortex Search + Semantic View
│   ├── 05_spcs_infrastructure.sql
│   └── 99_teardown.sql         # Complete cleanup
│
├── scripts/
│   ├── configure.sh            # Replace __PLACEHOLDERS__ in all files
│   ├── build_and_push.sh       # Build Docker + push to registry
│   ├── check_status.sh         # Verify service health
│   └── export_seed_data.py     # Regenerate seed data from Snowflake
│
├── react-app/                  # Denied Claims Dashboard (SPCS App Service)
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── supervisord.conf
│   ├── src/                    # React TypeScript frontend
│   ├── server/main.py          # FastAPI data backend
│   ├── nginx/                  # Reverse proxy config
│   └── semantic_model/         # Cortex Analyst YAML model
│
└── cortex-code-service/        # Cortex Code Agent SDK (SPCS Platform Service)
    ├── Dockerfile
    ├── entrypoint.sh
    ├── requirements.txt
    ├── spec.yaml
    ├── app/                    # Agent framework + denied claims agent
    ├── tools/                  # generate_appeal_docx.py
    └── .cortex/skills/         # 3 agent skill definitions (SKILL.md)
```

## Configuration Points

All Python runtime files read configuration from environment variables with sensible defaults:

| Env Variable | Default | Used By |
|-------------|---------|---------|
| `SNOWFLAKE_DATABASE` | `AGENTIC_DENIED_CLAIMS_HANDLING` | Both services |
| `SNOWFLAKE_SCHEMA` | `DENIED_CLAIMS` | Both services |
| `SNOWFLAKE_WAREHOUSE` | `COMPUTE_WH` | Both services |
| `SNOWFLAKE_HOST` | *(auto-injected by SPCS)* | Both services |
| `SNOWFLAKE_ACCOUNT` | *(auto-injected by SPCS)* | Both services |
| `CORTEX_HOST` | *(from deploy.env)* | App service |
| `PLATFORM_ENDPOINT` | *(from deploy.env)* | App service |
| `CORTEX_CODE_PAT` | *(from Snowflake secret)* | App service |

**IMPORTANT**: Do NOT set `SNOWFLAKE_HOST` or `SNOWFLAKE_ACCOUNT` in the SPCS service spec env vars — SPCS auto-injects these and overriding them causes auth failures.

## Teardown

To completely remove all objects:

```sql
@sql/99_teardown.sql
```

**WARNING**: This drops all databases, services, compute pools, and data. This cannot be undone.
