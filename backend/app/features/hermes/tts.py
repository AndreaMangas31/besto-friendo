import base64
import logging
import time
from io import BytesIO
from typing import Optional

logger = logging.getLogger(__name__)

# Groq TTS es inglés/árabe. Conversación en castellano: Edge, sin pasar por Hermes (404).
EDGE_VOICE = "es-ES-ElviraNeural"


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


async def synthesize_speech(text: str) -> Optional[tuple[str, str]]:
    """Audio del servidor (no speechSynthesis). mime + base64, o None si falla."""
    line = (text or "").strip()
    if not line:
        return None
    started = time.perf_counter()
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
