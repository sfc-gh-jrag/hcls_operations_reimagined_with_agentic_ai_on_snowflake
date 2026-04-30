#!/bin/sh
mkdir -p /home/agentuser/.snowflake

WH="${SNOWFLAKE_WAREHOUSE:-COMPUTE_WH}"
DB="${SNOWFLAKE_DATABASE:-AGENTIC_DENIED_CLAIMS_HANDLING}"
SCH="${SNOWFLAKE_SCHEMA:-DENIED_CLAIMS}"

cat > /home/agentuser/.snowflake/connections.toml << EOF
[default]
host = "${SNOWFLAKE_HOST}"
account = "${SNOWFLAKE_ACCOUNT}"
authenticator = "oauth"
token = "$(cat /snowflake/session/token)"
warehouse = "${WH}"
database = "${DB}"
schema = "${SCH}"
EOF

chmod 600 /home/agentuser/.snowflake/connections.toml

exec uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 1 --loop asyncio
