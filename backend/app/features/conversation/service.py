import logging

from fastapi import UploadFile

from app.features.conversation.models import AudioReceivedResponse

logger = logging.getLogger(__name__)


async def receive_audio(audio: UploadFile) -> AudioReceivedResponse:
    # Solo leemos en memoria. Si size_bytes es 0, el navegador envió un blob vacío.
    payload = await audio.read()
    content_type = audio.content_type or "application/octet-stream"
    filename = audio.filename or "recording"

    logger.info(
        "Audio recibido filename=%s content_type=%s size_bytes=%s",
        filename,
        content_type,
        len(payload),
    )

    return AudioReceivedResponse(
        received=True,
        filename=filename,
        content_type=content_type,
        size_bytes=len(payload),
    )
