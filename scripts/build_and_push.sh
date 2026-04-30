#!/bin/bash
# =============================================================================
# build_and_push.sh — Build Docker images and push to Snowflake registry
# Run AFTER configure.sh and after SQL scripts 01-04 are executed.
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

REGISTRY="${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com"
APP_IMAGE_REPO="${REGISTRY}/$(echo ${APP_DATABASE} | tr '[:upper:]' '[:lower:]')/spcs/app_image_repo"
PLATFORM_IMAGE_REPO="${REGISTRY}/$(echo ${PLATFORM_DATABASE} | tr '[:upper:]' '[:lower:]')/spcs/cortex_code_repo"

echo "=== Logging in to Snowflake Container Registry ==="
echo "Registry: ${REGISTRY}"
docker login "${REGISTRY}" -u "${SNOWFLAKE_USER:-$USER}"

echo ""
echo "=== Building Cortex Code Service (Platform) ==="
docker build --platform linux/amd64 \
    -t "${PLATFORM_IMAGE_REPO}/cortex-code-service:latest" \
    "${ROOT_DIR}/cortex-code-service"

echo ""
echo "=== Building Denied Claims App (React + FastAPI) ==="
docker build --platform linux/amd64 \
    -t "${APP_IMAGE_REPO}/denied-claims-app:latest" \
    "${ROOT_DIR}/react-app"

echo ""
echo "=== Pushing Cortex Code Service ==="
docker push "${PLATFORM_IMAGE_REPO}/cortex-code-service:latest"

echo ""
echo "=== Pushing Denied Claims App ==="
docker push "${APP_IMAGE_REPO}/denied-claims-app:latest"

echo ""
echo "=== Uploading Semantic Model to Stage ==="
echo "Upload the semantic model YAML to Snowflake using SnowSQL or Snowsight:"
echo "  PUT 'file://${ROOT_DIR}/react-app/semantic_model/denied_claims_model.yaml'"
echo "      '@${APP_DATABASE}.${APP_SCHEMA}.MODELS'"
echo "      OVERWRITE=TRUE AUTO_COMPRESS=FALSE;"

echo ""
echo "=== Build and push complete ==="
echo "Next steps:"
echo "  1. Upload semantic model (command above)"
echo "  2. Run sql/04_cortex_services.sql (if not done)"
echo "  3. Run sql/05_spcs_infrastructure.sql to create services"
echo "  4. Run scripts/check_status.sh to verify"
