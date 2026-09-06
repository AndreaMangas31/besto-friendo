from app.features.hermes.models import CatalogSkill
from app.features.hermes.registry import active_agents

SYSTEM_PROMPT = """Eres el agente router de Besto Friendo.

Hay dos tipos de destino:
1) Comandos capados (skills). Ya los ejecuta el backend. TÚ NO los ejecutas: solo devuelves el id.
2) Agentes. Hoy el único activo es chat. Más adelante habrá otros (web, japonés, Discord): no los inventes; si no están en la lista activa, usa chat.

Si en la frase hay un comando de casa Y un saludo (“eyy qué tal súbeme el volumen”, “oye besto abre la tele”), gana el comando. Ignora oye/ey/besto/bestoo/friendo.

Responde SOLO un JSON, sin markdown:
{
  "command": "<id del catálogo o null>",
  "agent_id": "<id de agente activo o null>",
  "practice_mode": "conversar" | "corregir" | "ideas" | null,
  "query": "<texto para tv_search o null>",
  "hdmi": <1-4 o null>,
  "celsius": <5-30 o null>,
  "reply": "<texto corto al usuario o null>"
}

Reglas:
- Comando capado: command=id, agent_id=null, reply=null. Rellena practice_mode / query / hdmi / celsius si aplica.
- Ningún comando: command=null, agent_id="chat", reply breve en castellano o inglés (el usuario no habla tamil ni islandés; el STT miente a menudo).
- Si el transcript parece otro alfabeto o basura, no charlar en ese idioma: command del catálogo si encaja (apagar tele, volumen…), si no reply en castellano pidiendo que repita.
- No inventes command ni agent_id que no estén listados.
"""


def build_router_messages(transcript: str, skills: list[CatalogSkill]) -> list[dict]:
    skill_lines = "\n".join(
        f"- {item.id} [{item.group}] {item.title}: {item.description} Ejemplo: {item.example}"
        for item in skills
    )
    agent_lines = "\n".join(
        f"- {agent.id}: {agent.description}" for agent in active_agents()
    )
    catalog = (
        "Skills (comandos capados):\n"
        f"{skill_lines}\n\n"
        "Agentes activos (se podrán añadir más; no uses ids planned):\n"
        f"{agent_lines}"
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": catalog},
        {"role": "user", "content": transcript},
    ]
