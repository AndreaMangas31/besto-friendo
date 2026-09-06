import base64
import logging
import time
from io import BytesIO
from typing import Optional

from openai import APIStatusError, AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback si no hay OPENAI_API_KEY o OpenAI falla (429, red).
EDGE_VOICE = "es-ES-ElviraNeural"
_OPENAI_TTS_TIMEOUT_SEC = 20.0
# Nova + esto: lo más cerca de un crío minúsculo sin voz custom de OpenAI.
OPENAI_TTS_INSTRUCTIONS = (
    "Español de ESPAÑA (es-ES), no de Latinoamérica. Distinción: la Z y la C ante E/I "
    "suenan como la TH inglesa de think (gracias, cielo, Barcelona, zapato, necesita). "
    "NUNCA seseo: no digas S donde va C o Z. Niño o niña muy pequeño, aguda, juguetona y maja. "
    "Ríe los jajaja con risita de crío, sin chillido de dibujo animado ni voz de adulto."
)


async def _edge_speech(text: str) -> Optional[tuple[str, bytes]]:
    try:
        import edge_tts
    except ImportError:
        logger.info("TTS: falta el paquete edge-tts")
        return None
    buf = BytesIO()
    communicate = edge_tts.Communicate(text, EDGE_VOICE)
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio":
            buf.write(chunk["data"])
    payload = buf.getvalue()
    if not payload:
        return None
    logger.info("TTS Edge voice=%s bytes=%s", EDGE_VOICE, len(payload))
    return ("audio/mpeg", payload)


async def _openai_speech(text: str) -> Optional[tuple[str, bytes]]:
    key = settings.openai_api_key.strip()
    if not key:
        return None
    model = settings.openai_tts_model.strip() or "gpt-4o-mini-tts"
    voice = settings.openai_tts_voice.strip() or "nova"
    # Cliente propio: Groq usa otro base_url y no sirve para /audio/speech.
    client = AsyncOpenAI(api_key=key, timeout=_OPENAI_TTS_TIMEOUT_SEC)
    response = await client.audio.speech.create(
        model=model,
        voice=voice,
        input=text,
        instructions=OPENAI_TTS_INSTRUCTIONS,
        response_format="mp3",
    )
    payload = response.content
    if not payload:
        return None
    logger.info("TTS OpenAI model=%s voice=%s bytes=%s", model, voice, len(payload))
    return ("audio/mpeg", payload)


async def synthesize_speech(text: str) -> Optional[tuple[str, str]]:
    """Audio del servidor (no speechSynthesis). mime + base64, o None si falla."""
    line = (text or "").strip()
    if not line:
        return None
    started = time.perf_counter()
    pair: Optional[tuple[str, bytes]] = None
    try:
        pair = await _openai_speech(line)
    except APIStatusError as exc:
        # 429 = tope o rate limit; el resto también cae a Edge para no dejar el turno mudo.
        logger.info("TTS OpenAI HTTP status=%s err=%s", exc.status_code, exc)
    except Exception as exc:
        logger.info("TTS OpenAI falló err=%s", exc)
    if pair is None:
        try:
            pair = await _edge_speech(line)
        except Exception as exc:
            logger.info("TTS Edge falló err=%s", exc)
            pair = None
    if pair is None:
        logger.info("TTS sin audio chars=%s", len(line))
        return None
    mime, payload = pair
    logger.info(
        "TTS listo mime=%s bytes=%s ms=%.0f",
        mime,
        len(payload),
        (time.perf_counter() - started) * 1000,
    )
    return mime, base64.b64encode(payload).decode("ascii")
