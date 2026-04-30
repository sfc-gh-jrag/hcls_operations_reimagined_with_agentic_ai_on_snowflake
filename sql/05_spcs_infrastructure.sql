-- =============================================================================
-- STEP 5: SPCS INFRASTRUCTURE
-- Run AFTER 04_cortex_services.sql
-- This creates network rules, EAI, secrets, and both SPCS services.
-- =============================================================================

USE ROLE SYSADMIN;

-- =============================================================================
-- 1. PLATFORM SERVICE INFRASTRUCTURE (Cortex Code Agent SDK)
-- =============================================================================

CREATE OR REPLACE NETWORK RULE __PLATFORM_DATABASE__.SPCS.CORTEX_CODE_OUTBOUND
    MODE = EGRESS
    TYPE = HOST_PORT
    VALUE_LIST = ('0.0.0.0:443', '0.0.0.0:80');

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION CORTEX_CODE_EXTERNAL_ACCESS
    ALLOWED_NETWORK_RULES = (__PLATFORM_DATABASE__.SPCS.CORTEX_CODE_OUTBOUND)
    ENABLED = TRUE;

-- Deploy the platform service
-- NOTE: Replace __PLATFORM_IMAGE_REPO_URL__ with the actual registry URL
--       from: SHOW IMAGE REPOSITORIES IN SCHEMA __PLATFORM_DATABASE__.SPCS;
CREATE SERVICE __PLATFORM_DATABASE__.SPCS.CORTEX_CODE_SERVICE
    IN COMPUTE POOL __COMPUTE_POOL__
    EXTERNAL_ACCESS_INTEGRATIONS = (CORTEX_CODE_EXTERNAL_ACCESS)
    QUERY_WAREHOUSE = __WAREHOUSE__
    FROM SPECIFICATION $$
spec:
  containers:
  - name: cortex-code
    image: __PLATFORM_IMAGE_REPO_URL__/cortex-code-service:latest
    resources:
      limits:
        memory: 64Gi
        cpu: "16"
      requests:
        memory: 16Gi
        cpu: "8"
  endpoints:
  - name: api
    port: 8080
    public: true
$$;

-- =============================================================================
-- 2. WAIT FOR PLATFORM SERVICE, GET ENDPOINT
-- =============================================================================
-- Run this manually and copy the ingress_url:
-- SELECT SYSTEM$GET_SERVICE_STATUS('__PLATFORM_DATABASE__.SPCS.CORTEX_CODE_SERVICE');
-- SHOW ENDPOINTS IN SERVICE __PLATFORM_DATABASE__.SPCS.CORTEX_CODE_SERVICE;
-- The ingress_url (without https://) is your __PLATFORM_ENDPOINT__

-- =============================================================================
-- 3. APP SERVICE INFRASTRUCTURE (React + FastAPI)
-- =============================================================================

-- Create a Personal Access Token (PAT) in Snowsight first:
--   User Menu > Settings > Authentication > Personal Access Tokens > Generate
-- Then paste it below:
CREATE OR REPLACE SECRET __APP_DATABASE__.SPCS.CORTEX_CODE_PAT
    TYPE = GENERIC_STRING
    SECRET_STRING = '__YOUR_SNOWFLAKE_PAT__';

-- Network rule for the app to reach the platform service
CREATE OR REPLACE NETWORK RULE __APP_DATABASE__.SPCS.CORTEX_CODE_API_EGRESS
    MODE = EGRESS
    TYPE = HOST_PORT
    VALUE_LIST = ('__PLATFORM_ENDPOINT__:443');

-- Network rule for Cortex Agent API (direct Cortex AI calls from the app)
CREATE OR REPLACE NETWORK RULE __APP_DATABASE__.SPCS.CORTEX_API_EGRESS
    MODE = EGRESS
    TYPE = HOST_PORT
    VALUE_LIST = ('__CORTEX_HOST__:443');

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION DENIED_CLAIMS_APP_EAI
    ALLOWED_NETWORK_RULES = (
        __APP_DATABASE__.SPCS.CORTEX_CODE_API_EGRESS,
        __APP_DATABASE__.SPCS.CORTEX_API_EGRESS
    )
    ALLOWED_AUTHENTICATION_SECRETS = (__APP_DATABASE__.SPCS.CORTEX_CODE_PAT)
    ENABLED = TRUE;

-- Deploy the app service
-- NOTE: Replace __APP_IMAGE_REPO_URL__ with the actual registry URL
--       from: SHOW IMAGE REPOSITORIES IN SCHEMA __APP_DATABASE__.SPCS;
CREATE SERVICE __APP_DATABASE__.SPCS.DENIED_CLAIMS_APP
    IN COMPUTE POOL __COMPUTE_POOL__
    EXTERNAL_ACCESS_INTEGRATIONS = (DENIED_CLAIMS_APP_EAI)
    QUERY_WAREHOUSE = __WAREHOUSE__
    FROM SPECIFICATION $$
spec:
  containers:
  - name: app
    image: __APP_IMAGE_REPO_URL__/denied-claims-app:latest
    env:
      CORTEX_HOST: __CORTEX_HOST__
      SNOWFLAKE_WAREHOUSE: __WAREHOUSE__
      SNOWFLAKE_DATABASE: __APP_DATABASE__
      SNOWFLAKE_SCHEMA: __APP_SCHEMA__
      PLATFORM_ENDPOINT: __PLATFORM_ENDPOINT__
    secrets:
    - snowflakeSecret: __APP_DATABASE__.SPCS.CORTEX_CODE_PAT
      secretKeyRef: secret_string
      envVarName: CORTEX_CODE_PAT
    resources:
      requests:
        cpu: 0.5
        memory: 1Gi
      limits:
        cpu: 2
        memory: 4Gi
  endpoints:
  - name: app
    port: 3000
    public: true
$$;

-- =============================================================================
-- 4. SERVICE FUNCTION (optional — SQL callable wrapper)
-- =============================================================================

CREATE OR REPLACE FUNCTION __APP_DATABASE__.__APP_SCHEMA__.PROCESS_DENIED_CLAIM(
    CLAIM_ID VARCHAR
)
RETURNS VARIANT
SERVICE = __PLATFORM_DATABASE__.SPCS.CORTEX_CODE_SERVICE
ENDPOINT = api
MAX_BATCH_ROWS = 1
AS '/api/process';

-- =============================================================================
-- 5. MONITORING TASK (optional — auto-process new denials)
-- =============================================================================

CREATE OR REPLACE TASK __APP_DATABASE__.__APP_SCHEMA__.DENIAL_MONITOR
    WAREHOUSE = __WAREHOUSE__
    SCHEDULE = 'USING CRON */5 * * * * UTC'
AS
DECLARE
    claim_record VARIANT;
BEGIN
    FOR claim_record IN (
        SELECT CLAIM_ID
        FROM __APP_DATABASE__.__APP_SCHEMA__.DENIALS
        WHERE PROCESSED_BY_AGENT = FALSE
        ORDER BY DENIAL_DATE DESC
        LIMIT 5
    ) DO
        LET result VARIANT := (
            SELECT __APP_DATABASE__.__APP_SCHEMA__.PROCESS_DENIED_CLAIM(claim_record.CLAIM_ID)
        );
        UPDATE __APP_DATABASE__.__APP_SCHEMA__.DENIALS
        SET PROCESSED_BY_AGENT = TRUE,
            AGENT_PROCESSED_AT = CURRENT_TIMESTAMP(),
            AGENT_RESULT = :result
        WHERE CLAIM_ID = claim_record.CLAIM_ID
          AND PROCESSED_BY_AGENT = FALSE;
    END FOR;
END;

-- Enable when ready:
-- ALTER TASK __APP_DATABASE__.__APP_SCHEMA__.DENIAL_MONITOR RESUME;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- SELECT SYSTEM$GET_SERVICE_STATUS('__PLATFORM_DATABASE__.SPCS.CORTEX_CODE_SERVICE');
-- SELECT SYSTEM$GET_SERVICE_STATUS('__APP_DATABASE__.SPCS.DENIED_CLAIMS_APP');
-- SHOW ENDPOINTS IN SERVICE __APP_DATABASE__.SPCS.DENIED_CLAIMS_APP;
