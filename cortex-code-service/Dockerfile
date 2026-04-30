FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git supervisor && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash agentuser

RUN curl -LsS https://ai.snowflake.com/static/cc-scripts/install.sh -o /tmp/install.sh && \
    sed -i 's|read -r .*install_podman.*|install_podman="n"|g' /tmp/install.sh && \
    sed -i '/cannot open \/dev\/tty/d' /tmp/install.sh && \
    sed -i 's|read .*< /dev/tty|install_podman="n" #|g' /tmp/install.sh && \
    sh /tmp/install.sh || true && \
    CORTEX_BIN=$(find /root/.local -name "cortex" -type f 2>/dev/null | head -1) && \
    if [ -n "$CORTEX_BIN" ]; then \
      cp "$CORTEX_BIN" /usr/local/bin/cortex && \
      chmod +x /usr/local/bin/cortex && \
      /usr/local/bin/cortex --version; \
    else \
      echo "ERROR: cortex binary not found" && exit 1; \
    fi

WORKDIR /opt/agent-framework

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY tools/ /home/agentuser/workspace/tools/
COPY .cortex/ /home/agentuser/workspace/.cortex/
COPY entrypoint.sh /entrypoint.sh

RUN mkdir -p /home/agentuser/workspace && \
    chmod +x /entrypoint.sh && \
    chown -R agentuser:agentuser /home/agentuser /opt/agent-framework /entrypoint.sh

USER agentuser

ENV PATH="/home/agentuser/.local/bin:/usr/local/bin:$PATH"
ENV PYTHONPATH="/opt/agent-framework"
ENV HOME="/home/agentuser"

EXPOSE 8080

CMD ["/entrypoint.sh"]
