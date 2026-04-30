# Agentic Denied Claims Handling

An end-to-end AI-powered denied healthcare claims resolution system built on Snowflake. Uses **Cortex Code Agent SDK** for autonomous claim investigation, **Cortex Search** for payer policy lookup, **Cortex Analyst** (Semantic View) for natural language SQL, and a **React + FastAPI** frontend deployed on **Snowpark Container Services (SPCS)**.

## Architecture

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
github_package/
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

## Key Features

- **Autonomous Claim Processing**: The Cortex Code agent investigates each denied claim through a 4-phase protocol (Investigation → Classification → Artifacts → Work Item)
- **Payer Policy Search**: Cortex Search service indexes 25 payer policy documents for semantic search during investigation
- **Natural Language SQL**: Semantic View enables conversational data exploration via the Interactive Agent
- **Appeal Document Generation**: Generates formatted DOCX appeal letters and uploads to Snowflake stage
- **Demo Reset**: One-click reset restores all data to initial seed state

## Teardown

To completely remove all objects:

```sql
@sql/99_teardown.sql
```

**WARNING**: This drops all databases, services, compute pools, and data. This cannot be undone.
