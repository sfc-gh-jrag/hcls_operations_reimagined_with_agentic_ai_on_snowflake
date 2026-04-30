from dataclasses import dataclass, field
from typing import Any, Callable, Optional


@dataclass
class AgentConfig:
    name: str
    system_prompt: str
    output_schema: dict
    display_name: str = ""
    description: str = ""
    vertical: str = ""
    data_sources: list = field(default_factory=list)
    skills: list = field(default_factory=list)
    capabilities: list = field(default_factory=list)
    is_live: bool = False
    hooks: dict = field(default_factory=dict)
    connection: str = ""
    cwd: str = "/home/agentuser/workspace"
    max_turns: int = 25
    effort: str = "high"
    skills_dir: str = ""
    mcp_servers: dict = field(default_factory=dict)
    prompt_builder: Optional[Callable[[dict], str]] = None
    permission_mode: str = "bypassPermissions"
    allowed_tools: list = field(default_factory=list)
    disallowed_tools: list = field(default_factory=list)
    env: dict = field(default_factory=dict)
