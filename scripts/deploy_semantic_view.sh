#!/bin/bash
# =============================================================================
# deploy_semantic_view.sh — Create the semantic view from its YAML specification.
#
# `CREATE SEMANTIC VIEW ... FROM SEMANTIC MODEL @stage/file.yaml` is not valid
# syntax, so the YAML has to be inlined into a call to the
# SYSTEM$CREATE_SEMANTIC_VIEW_FROM_YAML stored procedure. That is what this
# script does.
#
# Usage:
#   scripts/deploy_semantic_view.sh [--verify-only]
#
#   --verify-only   Validate the YAML without creating the semantic view.
#
# Run scripts/configure.sh first so the __APP_DATABASE__ / __APP_SCHEMA__
# placeholders are resolved.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

ENV_FILE="${ROOT_DIR}/deploy.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: deploy.env not found. Copy deploy.env.example to deploy.env and fill in values."
    exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

: "${APP_DATABASE:?APP_DATABASE must be set in deploy.env}"
: "${APP_SCHEMA:?APP_SCHEMA must be set in deploy.env}"

YAML_FILE="${ROOT_DIR}/react-app/semantic_model/denied_claims_semantic_view.yaml"
if [ ! -f "$YAML_FILE" ]; then
    echo "ERROR: $YAML_FILE not found."
    exit 1
fi

VERIFY_ONLY=FALSE
if [ "${1:-}" = "--verify-only" ]; then
    VERIFY_ONLY=TRUE
fi

if grep -q '__APP_DATABASE__\|__APP_SCHEMA__' "$YAML_FILE"; then
    echo "NOTE: $YAML_FILE still contains placeholders; substituting from deploy.env."
fi

# A '$$' sequence in the YAML would terminate the dollar-quoted literal early.
if grep -q '\$\$' "$YAML_FILE"; then
    echo "ERROR: $YAML_FILE contains a '\$\$' sequence, which would break dollar-quoting."
    echo "       Remove it (even from comments) before deploying."
    exit 1
fi

TMP_SQL="$(mktemp -t deploy_sv.XXXXXX.sql)"
trap 'rm -f "$TMP_SQL"' EXIT

{
    printf "CALL SYSTEM\$CREATE_SEMANTIC_VIEW_FROM_YAML(\n"
    printf "  '%s.%s',\n" "$APP_DATABASE" "$APP_SCHEMA"
    # Bare $$ is used deliberately: the snow CLI does not parse custom-tagged
    # dollar quotes such as $sv_yaml$. The guard above guarantees the YAML
    # contains no $$ sequence that could close this literal early.
    printf "  \$\$\n"
    sed -e "s/__APP_DATABASE__/${APP_DATABASE}/g" \
        -e "s/__APP_SCHEMA__/${APP_SCHEMA}/g" "$YAML_FILE"
    printf "\$\$,\n"
    printf "  %s\n);\n" "$VERIFY_ONLY"
} > "$TMP_SQL"

if [ "$VERIFY_ONLY" = "TRUE" ]; then
    echo "=== Validating semantic view YAML (nothing will be created) ==="
else
    echo "=== Creating semantic view ${APP_DATABASE}.${APP_SCHEMA}.DENIED_CLAIMS_AGENT_SV ==="
fi

snow sql -f "$TMP_SQL" ${SNOWFLAKE_CONNECTION:+--connection "$SNOWFLAKE_CONNECTION"}
