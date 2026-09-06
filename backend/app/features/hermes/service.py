import json
import logging
import re
import time
from typing import Optional

from app.features.hermes.gateway import complete, complete_groq
from app.features.hermes.models import CatalogSkill, ChatTurn, PracticeModeName, RouterIntent
from app.features.hermes.registry import is_active_agent
from app.features.hermes.skills import build_router_messages
from app.features.hermes.tts import synthesize_speech
from app.shared.ai.factory import get_ai_provider

logger = logging.getLogger(__name__)

_PRACTICE: set[str] = {"conversar", "corregir", "ideas"}
_CHAT_HISTORY_TURNS = 10
_CHAT_SYSTEM = """Eres Besto: mascota pequeña de esta casa. ESPAÑOL DE ESPAÑA (es-ES, tuteo, vale): no latino ni de call center.
Majo, simpático, servicial y empático. Te ríes con la gente (jaja/jajaja si hay broma). Humor negro solo si se nota que es chiste. Si piden una frase larga, la das; no te niegues.
Sin markdown, listas, JSON ni ensayos. Si preguntan algo de ahora o un hecho que no sepas, busca y resume con la fuente. Si falla, dilo.
No controles tele, Play ni calefacción: eso es otro modo."""

CONVERSATION_HELLO = "Hola. ¿Qué necesitas?"


def _extract_json_object(raw: str) -> Optional[dict]:
    text = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        payload = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _parse_intent(raw: str, skill_ids: set[str]) -> RouterIntent:
    payload = _extract_json_object(raw)
    if payload is None:
        # Groq a veces charla sin JSON: trátalo como agente chat.
        reply = raw.strip() or "¿Qué necesitas?"
        return RouterIntent(agent_id="chat", reply=reply)

    command = payload.get("command")
    if isinstance(command, str):
        command = command.strip() or None
    else:
        command = None
    if command and command not in skill_ids:
        logger.info("Router inventó command=%s; cae a chat", command)
        command = None

    agent_id = payload.get("agent_id")
    if isinstance(agent_id, str):
        agent_id = agent_id.strip() or None
    else:
        agent_id = None
    if agent_id and not is_active_agent(agent_id):
        logger.info("Router eligió agente inactivo=%s; uso chat", agent_id)
        agent_id = "chat"

    practice = payload.get("practice_mode")
    practice_mode: Optional[PracticeModeName] = None
    if isinstance(practice, str) and practice in _PRACTICE:
        practice_mode = practice  # type: ignore[assignment]

    query = payload.get("query")
    if not isinstance(query, str) or not query.strip():
        query = None
    else:
        query = query.strip()

    hdmi = payload.get("hdmi")
    if not isinstance(hdmi, int) or hdmi < 1 or hdmi > 4:
        hdmi = None

    celsius = payload.get("celsius")
    if not isinstance(celsius, int) or celsius < 5 or celsius > 30:
        celsius = None

    reply = payload.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        reply = None
    else:
        reply = reply.strip()

    # Comando capado gana: no conversamos ni despachamos otro agente.
    if command:
        return RouterIntent(
            command=command,
            practice_mode=practice_mode,
            query=query,
            hdmi=hdmi,
            celsius=celsius,
        )

    if not reply:
        reply = "Dime."
    return RouterIntent(agent_id=agent_id or "chat", reply=reply)


async def route_unknown(
    transcript: str,
    skills: list[CatalogSkill],
) -> RouterIntent:
    skill_ids = {item.id for item in skills}
    messages = build_router_messages(transcript, skills)
    raw = await complete_groq(messages)
    logger.info(
        "Router groq raw_chars=%s transcript=%s",
        len(raw),
        transcript[:120],
    )
    intent = _parse_intent(raw, skill_ids)
    logger.info(
        "Router intent command=%s agent_id=%s",
        intent.command,
        intent.agent_id,
    )
    return intent


_REWRITE_SYSTEM = """El usuario habla a un asistente del hogar. El STT a menudo está mal transcrito.
Comando que sí vamos a ejecutar: {command_id} — {catalog_title}
Responde SOLO una frase corta (castellano o inglés) de lo que quiso decir. Sin comillas, sin JSON, sin explicar."""


async def rewrite_heard(
    transcript: str,
    command_id: str,
    catalog_title: str,
) -> str:
    """Frase para el hint. Groq, no el sidecar: Hermes con tools se come los 20s del front."""

    provider = get_ai_provider()
    messages = [
        {
            "role": "system",
            "content": _REWRITE_SYSTEM.format(
                command_id=command_id,
                catalog_title=catalog_title,
            ),
        },
        {"role": "user", "content": transcript or "(sin texto)"},
    ]
    raw = await provider.complete(messages, temperature=0.2)
    line = (raw or "").strip().split("\n")[0].strip().strip('"“”')
    logger.info(
        "rewrite_heard command=%s chars=%s",
        command_id,
        len(line),
    )
    return line[:160]


def _parse_chat_history(raw: Optional[str]) -> list[dict]:
    if not raw:
        return []
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("history no es JSON válido") from exc
    if not isinstance(payload, list):
        raise ValueError("history debe ser una lista")
    turns: list[dict] = []
    for item in payload[-_CHAT_HISTORY_TURNS:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        text = item.get("text")
        if role not in ("user", "assistant") or not isinstance(text, str) or not text.strip():
            continue
        turns.append({"role": role, "content": text.strip()})
    return turns


_SPEAK_MAX_CHARS = 500


def _speakable(text: str) -> str:
    # El mp3 lee unas frases; el chat puede llevar más. 4 frases para no cortar un jajaja.
    line = re.sub(r"[#*_`]+", "", text)
    line = re.sub(r"\s+", " ", line).strip()
    parts = re.split(r"(?<=[.!?…])\s+", line)
    clipped = " ".join(parts[:4]).strip() or line
    if len(clipped) > _SPEAK_MAX_CHARS:
        clipped = clipped[:_SPEAK_MAX_CHARS].rsplit(" ", 1)[0].strip()
    return clipped


async def chat_turn(transcript: str, history_json: Optional[str]) -> ChatTurn:
    """Un turno de modo conversación. Hermes con tools si hay URL; Groq si no."""
    history = _parse_chat_history(history_json)
    messages = [
        {"role": "system", "content": _CHAT_SYSTEM},
        *history,
        {"role": "user", "content": transcript or "Dime."},
    ]
    started = time.perf_counter()
    raw = await complete(messages, temperature=0.4, timeout_sec=80.0)
    reply = (raw or "").strip() or "Dime."
    speak = _speakable(reply)
    audio_mime = None
    audio_base64 = None
    try:
        tts = await synthesize_speech(speak)
        if tts:
            audio_mime, audio_base64 = tts
    except Exception as exc:
        logger.info("TTS chat_turn falló err=%s", exc)
    logger.info(
        "chat_turn user_chars=%s reply_chars=%s audio_bytes=%s ms=%.0f",
        len(transcript or ""),
        len(reply),
        len(audio_base64) if audio_base64 else 0,
        (time.perf_counter() - started) * 1000,
    )
    return ChatTurn(
        user_text=transcript,
        assistant_text=reply,
        speak=speak,
        audio_mime=audio_mime,
        audio_base64=audio_base64,
    )


async def conversation_hello() -> ChatTurn:
    """Saludo al activar modo conversación. Misma voz que el turno (OpenAI / Edge)."""
    speak = CONVERSATION_HELLO
    audio_mime = None
    audio_base64 = None
    try:
        tts = await synthesize_speech(speak)
        if tts:
            audio_mime, audio_base64 = tts
    except Exception as exc:
        logger.info("TTS conversation_hello falló err=%s", exc)
    logger.info(
        "conversation_hello audio_bytes=%s",
        len(audio_base64) if audio_base64 else 0,
    )
    return ChatTurn(
        user_text="",
        assistant_text=speak,
        speak=speak,
        audio_mime=audio_mime,
        audio_base64=audio_base64,
    )
