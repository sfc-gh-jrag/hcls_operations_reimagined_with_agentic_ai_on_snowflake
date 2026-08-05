-- =============================================================================
-- STEP 4: CORTEX SEARCH SERVICE AND SEMANTIC VIEW
-- Run AFTER 03_seed_data.sql
-- =============================================================================

USE ROLE __DEPLOY_ROLE__;
USE DATABASE __APP_DATABASE__;
USE SCHEMA __APP_SCHEMA__;
USE WAREHOUSE __WAREHOUSE__;

-- =============================================================================
-- 1. CORTEX SEARCH SERVICE (over payer policy documents)
-- =============================================================================

CREATE OR REPLACE CORTEX SEARCH SERVICE PAYER_DOC_SEARCH
    ON CONTENT
    ATTRIBUTES SECTION_NUMBER, SECTION_TITLE, PAYER_NAME, PAYER_ID, DOC_TYPE
    WAREHOUSE = __WAREHOUSE__
    TARGET_LAG = '1 hour'
    AS (
        SELECT
            SECTION_NUMBER,
            SECTION_TITLE,
            CONTENT,
            PAYER_ID,
            PAYER_NAME,
            DOC_TYPE
        FROM __APP_DATABASE__.__APP_SCHEMA__.PAYER_DOCS
    );

-- =============================================================================
-- 2. SEMANTIC VIEW (Cortex Analyst — natural language SQL)
--
-- The semantic view is defined by react-app/semantic_model/denied_claims_semantic_view.yaml
-- (the Semantic View spec). Its __APP_DATABASE__ / __APP_SCHEMA__ placeholders are
-- replaced by scripts/configure.sh.
--
-- NOTE: `CREATE SEMANTIC VIEW ... FROM SEMANTIC MODEL @stage/file.yaml` is not valid
-- syntax. Use the SYSTEM$CREATE_SEMANTIC_VIEW_FROM_YAML stored procedure and pass the
-- YAML contents as a dollar-quoted literal.
--
-- Because the YAML has to be inlined, this step is driven by a script rather than
-- being runnable standalone here:
--
--   scripts/deploy_semantic_view.sh
--
-- To validate a YAML edit without creating anything, pass TRUE as the third argument:
--
--   CALL SYSTEM$CREATE_SEMANTIC_VIEW_FROM_YAML(
--       '__APP_DATABASE__.__APP_SCHEMA__',
--       $yaml$ <contents of denied_claims_semantic_view.yaml> $yaml$,
--       TRUE);
--
-- A successful validation returns:
--   "YAML file is valid for creating a semantic view. No object has been created yet."
-- =============================================================================

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SHOW CORTEX SEARCH SERVICES IN SCHEMA __APP_SCHEMA__;
SHOW SEMANTIC VIEWS IN SCHEMA __APP_SCHEMA__;
