from typing import Any

from .agent_config import AgentConfig

_registry: dict[str, AgentConfig] = {}


def register_agent(config: AgentConfig) -> None:
    _registry[config.name] = config


def get_agent(name: str) -> AgentConfig | None:
    return _registry.get(name)


def list_agents() -> list[dict[str, Any]]:
    return [
        {
            "name": c.name,
            "display_name": c.display_name,
            "description": c.description,
            "vertical": c.vertical,
            "skills": c.skills,
            "data_sources": c.data_sources,
            "capabilities": c.capabilities,
            "is_live": c.is_live,
        }
        for c in _registry.values()
    ]
