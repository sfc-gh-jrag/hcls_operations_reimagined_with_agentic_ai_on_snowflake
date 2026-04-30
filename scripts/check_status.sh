#!/bin/bash
# =============================================================================
# check_status.sh — Verify all services and objects are healthy
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

ENV_FILE="${ROOT_DIR}/deploy.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: deploy.env not found."
    exit 1
fi

source "$ENV_FILE"

echo "=== Checking Service Status ==="
echo ""

SNOW_CMD="snow sql"
if ! command -v snow &> /dev/null; then
    echo "WARNING: Snowflake CLI (snow) not found. Use Snowsight to run these queries:"
    echo ""
    echo "  SELECT SYSTEM\$GET_SERVICE_STATUS('${PLATFORM_DATABASE}.SPCS.CORTEX_CODE_SERVICE');"
    echo "  SELECT SYSTEM\$GET_SERVICE_STATUS('${APP_DATABASE}.SPCS.DENIED_CLAIMS_APP');"
    echo "  SHOW ENDPOINTS IN SERVICE ${APP_DATABASE}.SPCS.DENIED_CLAIMS_APP;"
    echo "  SHOW CORTEX SEARCH SERVICES IN SCHEMA ${APP_DATABASE}.${APP_SCHEMA};"
    echo "  SHOW SEMANTIC VIEWS IN SCHEMA ${APP_DATABASE}.${APP_SCHEMA};"
    echo ""
    echo "  -- Data verification:"
    echo "  SELECT 'MEMBERS' AS TBL, COUNT(*) CNT FROM ${APP_DATABASE}.${APP_SCHEMA}.MEMBERS"
    echo "  UNION ALL SELECT 'CLAIMS', COUNT(*) FROM ${APP_DATABASE}.${APP_SCHEMA}.CLAIMS"
    echo "  UNION ALL SELECT 'DENIALS', COUNT(*) FROM ${APP_DATABASE}.${APP_SCHEMA}.DENIALS"
    echo "  UNION ALL SELECT 'PAYER_DOCS', COUNT(*) FROM ${APP_DATABASE}.${APP_SCHEMA}.PAYER_DOCS;"
    exit 0
fi

echo "--- Platform Service ---"
$SNOW_CMD -q "SELECT SYSTEM\$GET_SERVICE_STATUS('${PLATFORM_DATABASE}.SPCS.CORTEX_CODE_SERVICE');" 2>/dev/null || echo "  NOT FOUND or not running"

echo ""
echo "--- App Service ---"
$SNOW_CMD -q "SELECT SYSTEM\$GET_SERVICE_STATUS('${APP_DATABASE}.SPCS.DENIED_CLAIMS_APP');" 2>/dev/null || echo "  NOT FOUND or not running"

echo ""
echo "--- App Endpoint ---"
$SNOW_CMD -q "SHOW ENDPOINTS IN SERVICE ${APP_DATABASE}.SPCS.DENIED_CLAIMS_APP;" 2>/dev/null || echo "  No endpoints found"

echo ""
echo "--- Cortex Services ---"
$SNOW_CMD -q "SHOW CORTEX SEARCH SERVICES IN SCHEMA ${APP_DATABASE}.${APP_SCHEMA};" 2>/dev/null || echo "  No search services found"
$SNOW_CMD -q "SHOW SEMANTIC VIEWS IN SCHEMA ${APP_DATABASE}.${APP_SCHEMA};" 2>/dev/null || echo "  No semantic views found"

echo ""
echo "--- Data Counts ---"
$SNOW_CMD -q "SELECT 'MEMBERS' AS TBL, COUNT(*) CNT FROM ${APP_DATABASE}.${APP_SCHEMA}.MEMBERS UNION ALL SELECT 'CLAIMS', COUNT(*) FROM ${APP_DATABASE}.${APP_SCHEMA}.CLAIMS UNION ALL SELECT 'DENIALS', COUNT(*) FROM ${APP_DATABASE}.${APP_SCHEMA}.DENIALS UNION ALL SELECT 'PAYER_DOCS', COUNT(*) FROM ${APP_DATABASE}.${APP_SCHEMA}.PAYER_DOCS;" 2>/dev/null || echo "  Could not query tables"
