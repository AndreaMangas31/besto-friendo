from app.features.hermes.models import AgentSpec

# El router elige un id de aquí. planned no va al prompt para que no los invente.
AGENTS: tuple[AgentSpec, ...] = (
    AgentSpec(
        id="chat",
        status="active",
        description="Anfitrión de voz (~37, castellano). Modo conversación: charla, busca, manda el audio del turno.",
    ),
    AgentSpec(
        id="web",
        status="planned",
        description="Búsqueda y navegación. Aún no está activo.",
    ),
    AgentSpec(
        id="japanese",
        status="planned",
        description="Tutor de japonés vía agente. Aún usa el código Groq actual.",
    ),
    AgentSpec(
        id="discord",
        status="planned",
        description="Canal Discord. Aún no está activo.",
    ),
)


def active_agents() -> list[AgentSpec]:
    return [agent for agent in AGENTS if agent.status == "active"]


def is_active_agent(agent_id: str) -> bool:
    return any(agent.id == agent_id for agent in active_agents())
