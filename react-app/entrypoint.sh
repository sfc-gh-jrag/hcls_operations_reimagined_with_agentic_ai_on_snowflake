#!/bin/sh
# Substitute PLATFORM_ENDPOINT and CORTEX_CODE_PAT into nginx config at runtime.
# This means the app image never needs to be rebuilt when the platform endpoint changes.
envsubst '${PLATFORM_ENDPOINT} ${CORTEX_CODE_PAT}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec supervisord -c /etc/supervisord.conf
