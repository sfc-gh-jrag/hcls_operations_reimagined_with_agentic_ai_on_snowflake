FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.12-slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx gettext-base supervisor && \
    rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir fastapi uvicorn snowflake-connector-python python-docx pydantic httpx

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/conf.d/default.conf.template
RUN rm -f /etc/nginx/sites-enabled/default
COPY server/ /opt/server/server/
COPY supervisord.conf /etc/supervisord.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
CMD ["/entrypoint.sh"]
