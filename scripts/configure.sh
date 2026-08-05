#!/bin/bash
# =============================================================================
# configure.sh — Replace __PLACEHOLDER__ tokens in all SQL and config files
# Run this FIRST after cloning the repo. Edit deploy.env before running.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

ENV_FILE="${ROOT_DIR}/deploy.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: deploy.env not found. Copy deploy.env.example to deploy.env and fill in values."
    exit 1
fi

source "$ENV_FILE"

REQUIRED_VARS=(
    APP_DATABASE APP_SCHEMA PLATFORM_DATABASE WAREHOUSE COMPUTE_POOL
    SNOWFLAKE_ACCOUNT CORTEX_HOST
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo "ERROR: $var is not set in deploy.env"
        exit 1
    fi
done

echo "=== Configuring project with deploy.env values ==="
echo "  APP_DATABASE:      $APP_DATABASE"
echo "  APP_SCHEMA:        $APP_SCHEMA"
echo "  PLATFORM_DATABASE: $PLATFORM_DATABASE"
echo "  WAREHOUSE:         $WAREHOUSE"
echo "  COMPUTE_POOL:      $COMPUTE_POOL"
echo "  SNOWFLAKE_ACCOUNT: $SNOWFLAKE_ACCOUNT"
echo "  CORTEX_HOST:       $CORTEX_HOST"
echo "  DEPLOY_ROLE:       ${DEPLOY_ROLE:-<unset — will use session role>}"
echo ""

REGISTRY="${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com"
APP_IMAGE_REPO_URL="${REGISTRY}/$(echo ${APP_DATABASE} | tr '[:upper:]' '[:lower:]')/spcs/app_image_repo"
PLATFORM_IMAGE_REPO_URL="${REGISTRY}/$(echo ${PLATFORM_DATABASE} | tr '[:upper:]' '[:lower:]')/spcs/cortex_code_repo"

replace_in_files() {
    local pattern="$1"
    local replacement="$2"
    local target_dir="$3"

    if [[ "$(uname)" == "Darwin" ]]; then
        find "$target_dir" -type f \( -name "*.sql" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" -o -name "*.sh" \) \
            -exec sed -i '' "s|${pattern}|${replacement}|g" {} +
    else
        find "$target_dir" -type f \( -name "*.sql" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" -o -name "*.sh" \) \
            -exec sed -i "s|${pattern}|${replacement}|g" {} +
    fi
}

replace_in_files "__APP_DATABASE__"            "$APP_DATABASE"            "$ROOT_DIR/sql"
replace_in_files "__APP_SCHEMA__"              "$APP_SCHEMA"              "$ROOT_DIR/sql"
replace_in_files "__PLATFORM_DATABASE__"       "$PLATFORM_DATABASE"       "$ROOT_DIR/sql"
replace_in_files "__WAREHOUSE__"               "$WAREHOUSE"               "$ROOT_DIR/sql"
replace_in_files "__COMPUTE_POOL__"            "$COMPUTE_POOL"            "$ROOT_DIR/sql"
replace_in_files "__CORTEX_HOST__"             "$CORTEX_HOST"             "$ROOT_DIR/sql"
replace_in_files "__PLATFORM_ENDPOINT__"       "${PLATFORM_ENDPOINT:-__PLATFORM_ENDPOINT__}" "$ROOT_DIR/sql"
replace_in_files "__YOUR_SNOWFLAKE_PAT__"      "${SNOWFLAKE_PAT:-__YOUR_SNOWFLAKE_PAT__}" "$ROOT_DIR/sql"
replace_in_files "__APP_IMAGE_REPO_URL__"      "$APP_IMAGE_REPO_URL"      "$ROOT_DIR/sql"
replace_in_files "__PLATFORM_IMAGE_REPO_URL__" "$PLATFORM_IMAGE_REPO_URL" "$ROOT_DIR/sql"

# DEPLOY_ROLE is handled specially: the SQL files carry a full `USE ROLE __DEPLOY_ROLE__;`
# statement. Substituting an empty role would emit the invalid `USE ROLE ;`, so when
# DEPLOY_ROLE is unset we comment the statement out instead. This lets the scripts run
# in restricted sessions (e.g. Snowsight worksheets, or a role that cannot USE ROLE
# SYSADMIN) without hand-editing every file first.
if [ -n "${DEPLOY_ROLE:-}" ]; then
    replace_in_files "USE ROLE __DEPLOY_ROLE__;" "USE ROLE ${DEPLOY_ROLE};" "$ROOT_DIR/sql"
else
    replace_in_files "USE ROLE __DEPLOY_ROLE__;" \
        "-- USE ROLE skipped: DEPLOY_ROLE unset in deploy.env; using the session's current role." \
        "$ROOT_DIR/sql"
fi

# SNOWFLAKE_REGIONAL_HOST is optional. When provided it is appended to the Cortex
# egress rule so the app can reach the Cortex Agent API whether it resolved its host
# from CORTEX_HOST (account URL) or from SNOWFLAKE_HOST (regional URL).
if [ -n "${SNOWFLAKE_REGIONAL_HOST:-}" ]; then
    replace_in_files "__REGIONAL_HOST_ENTRY__" ", '${SNOWFLAKE_REGIONAL_HOST}:443'" "$ROOT_DIR/sql"
else
    replace_in_files "__REGIONAL_HOST_ENTRY__" "" "$ROOT_DIR/sql"
fi

replace_in_files "__APP_DATABASE__"  "$APP_DATABASE"  "$ROOT_DIR/react-app/semantic_model"
replace_in_files "__APP_SCHEMA__"    "$APP_SCHEMA"    "$ROOT_DIR/react-app/semantic_model"

replace_in_files "__APP_DATABASE__"  "$APP_DATABASE"  "$ROOT_DIR/cortex-code-service/.cortex"
replace_in_files "__APP_SCHEMA__"    "$APP_SCHEMA"    "$ROOT_DIR/cortex-code-service/.cortex"

echo ""
echo "=== Configuration complete ==="
echo "Next steps:"
echo "  1. Review sql/ files to confirm placeholders were replaced"
echo "  2. Run SQL scripts 01-05 in order in Snowsight or SnowSQL"
echo "  3. Run scripts/build_and_push.sh to build Docker images"
