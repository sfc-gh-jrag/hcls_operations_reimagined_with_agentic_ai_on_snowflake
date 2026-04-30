import logging
from typing import Any, Optional

from cortex_code_agent_sdk import (
    AssistantMessage,
    CortexCodeAgentOptions,
    HookMatcher,
    ResultMessage,
    SystemMessage,
    query,
)

from .agent_config import AgentConfig

logger = logging.getLogger(__name__)


class AgentRunner:
    def __init__(self, config: AgentConfig):
        self.config = config

    def _build_options(self) -> CortexCodeAgentOptions:
        hook_config = {}
        for event_name, matchers in self.config.hooks.items():
            hook_config[event_name] = [
                HookMatcher(
                    matcher=m.get("matcher"),
                    hooks=m["hooks"],
                    timeout=m.get("timeout", 60.0),
                )
                for m in matchers
            ]

        opts = CortexCodeAgentOptions(
            cwd=self.config.cwd,
            connection=self.config.connection or None,
            output_format=(
                {"type": "json_schema", "schema": self.config.output_schema}
                if self.config.output_schema
                else None
            ),
            max_turns=self.config.max_turns,
            effort=self.config.effort,
            permission_mode=self.config.permission_mode,
            allow_dangerously_skip_permissions=True,
            system_prompt=self.config.system_prompt,
            hooks=hook_config if hook_config else None,
            mcp_servers=self.config.mcp_servers or None,
            allowed_tools=self.config.allowed_tools or [],
            disallowed_tools=self.config.disallowed_tools or [],
            env=self.config.env or {},
            stderr=lambda line: logger.info(f"[cortex-stderr] {line}"),
        )
        return opts

    async def process(self, input_data: dict) -> dict:
        if self.config.prompt_builder:
            prompt = self.config.prompt_builder(input_data)
        else:
            prompt = input_data.get("prompt", "")

        options = self._build_options()
        result = {"status": "error", "error": "Agent did not return a result"}
        messages_log: list[dict] = []

        try:
            async for message in query(prompt=prompt, options=options):
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if hasattr(block, "text"):
                            messages_log.append(
                                {"type": "assistant_text", "text": block.text}
                            )
                        elif hasattr(block, "name"):
                            messages_log.append(
                                {
                                    "type": "tool_use",
                                    "tool": block.name,
                                    "input": block.input,
                                }
                            )
                elif isinstance(message, ResultMessage):
                    if (
                        message.subtype == "success"
                        and message.structured_output
                    ):
                        result = {
                            "status": "success",
                            "data": message.structured_output,
                            "session_id": message.session_id,
                            "duration_ms": message.duration_ms,
                            "num_turns": message.num_turns,
                            "cost_usd": message.total_cost_usd,
                        }
                    elif message.is_error:
                        logger.error(f"Agent error: subtype={message.subtype} result={message.result} stop_reason={message.stop_reason}")
                        result = {
                            "status": "error",
                            "error": message.result or message.subtype,
                            "subtype": message.subtype,
                            "stop_reason": message.stop_reason,
                            "session_id": message.session_id,
                        }
                    else:
                        result = {
                            "status": "completed",
                            "result_text": message.result,
                            "session_id": message.session_id,
                            "duration_ms": message.duration_ms,
                            "num_turns": message.num_turns,
                        }
                elif isinstance(message, SystemMessage):
                    messages_log.append(
                        {"type": "system", "subtype": message.subtype}
                    )

        except Exception as e:
            logger.exception("Agent execution failed")
            result = {"status": "error", "error": str(e)}

        result["messages"] = messages_log
        return result

    async def process_streaming(self, input_data: dict):
        if self.config.prompt_builder:
            prompt = self.config.prompt_builder(input_data)
        else:
            prompt = input_data.get("prompt", "")

        options = self._build_options()

        try:
            async for message in query(prompt=prompt, options=options):
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if hasattr(block, "text"):
                            yield {"type": "text", "content": block.text}
                        elif hasattr(block, "name"):
                            yield {
                                "type": "tool_call",
                                "tool": block.name,
                                "input": block.input,
                            }
                elif isinstance(message, ResultMessage):
                    logger.info(f"Agent result: subtype={message.subtype} has_structured={message.structured_output is not None} is_error={message.is_error}")
                    yield {
                        "type": "result",
                        "subtype": message.subtype,
                        "structured_output": message.structured_output,
                        "result_text": message.result,
                        "duration_ms": message.duration_ms,
                        "num_turns": message.num_turns,
                        "session_id": message.session_id,
                        "cost_usd": message.total_cost_usd,
                        "is_error": message.is_error,
                    }
                elif isinstance(message, SystemMessage):
                    yield {"type": "system", "subtype": message.subtype}
        except Exception as e:
            logger.exception("Streaming agent execution failed")
            yield {
                "type": "result",
                "subtype": "error",
                "structured_output": None,
                "result_text": str(e),
                "duration_ms": None,
                "num_turns": None,
                "session_id": None,
                "cost_usd": None,
                "is_error": True,
            }
