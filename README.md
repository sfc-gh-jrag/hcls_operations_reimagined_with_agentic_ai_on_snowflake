# HCLS Operations Reimagined with Agentic AI on Snowflake

## The Problem: $262B in Denied Claims, Powered by Manual Judgment

Healthcare spends over **$1 trillion per year** on operational administration — twenty cents of every dollar. Denied claims alone cost the industry **$262 billion annually**, yet the workflows to resolve them remain stubbornly manual: 45–90 minutes per denial, six disconnected systems, and deep subject matter expertise that takes months to develop.

The bottleneck isn't data access. It's **judgment** — interpreting payer contracts, cross-referencing prior authorizations, weighing competing evidence, and choosing the right resolution strategy under ambiguity and deadline pressure.

## The Solution: Two Complementary AI Agent Patterns

This solution demonstrates how **two Snowflake-native agent patterns** work together to transform denied claims handling from a manual, error-prone process into an AI-augmented review workflow:

### Interactive Agent (Cortex Agent API)
The **human-in-the-driver's-seat** model. Revenue cycle specialists, CFOs, and clinicians ask questions in plain language — denial trends, revenue impact, payer benchmarking, root-cause analysis — and the agent responds with data-grounded answers by querying a **Semantic View** over structured claims data and a **Cortex Search** service over payer contract documents. The human guides; the agent executes.

### Worker Agent (Cortex Code Agent SDK)
The **autonomous investigator**. When a new denial arrives, the Worker Agent independently investigates — pulling claims history, eligibility, prior authorizations (including Group NPI fallback), and payer contract language. It classifies the denial, recommends a resolution strategy, and drafts an appeal letter with citations. The entire investigation completes in **under 3 minutes** versus 45–90 minutes manually.

### The Result: From Processor to Reviewer

| | Before | After |
|---|---|---|
| **Role** | Processor | Reviewer |
| **Time per denial** | 45–90 minutes | 30 seconds |
| **Systems touched** | 6+ | 1 |
| **Time to productivity** | 6 months | Day one |
| **Recovery rate** | ~35% | ~72% |

**Projected impact**: $4.4M additional annual revenue recovered. 180 hours/month of specialist time redirected from processing to high-value review and escalation.

### Why Snowflake

Both agents run entirely within Snowflake — claims data, contract documents, AI models, and agent logic in one governed environment. No data leaves the platform. No external AI calls. Enterprise governance, role-based access, full auditability, and zero data movement from day one. The dual-agent pattern is repeatable across every judgment-heavy workflow in healthcare: prior authorization, clinical documentation, compliance monitoring, and coding review.

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

### Snowflake AI Capabilities Used

| Capability | Role in Solution |
|-----------|-----------------|
| **Cortex Agent API** | Powers the Interactive Agent — connects Semantic Views and Cortex Search in a single conversational interface |
| **Cortex Code Agent SDK** | Powers the Worker Agent — autonomous multi-step investigation with code execution, data queries, and chained reasoning |
| **Cortex Search Service** | Semantic search over 25 payer contract documents for policy interpretation during investigation |
| **Semantic Views** | Business-level semantic layer over claims data enabling natural language SQL queries |
| **Snowpark Container Services** | Hosts both services with enterprise governance, auto-scaling, and public ingress |

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
