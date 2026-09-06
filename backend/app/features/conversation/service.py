import json
import logging
import time
from typing import List, Optional

from fastapi import HTTPException, UploadFile
from openai import APIError

from app.features.conversation.models import (
    AudioReceivedResponse,
    ConversationTurnResponse,
    HistoryTurn,
)
from app.features.japanese.models import TutorTurn
from app.features.japanese.service import build_messages, flatten_blocks, parse_tutor_reply
from app.shared.ai.factory import AiNotConfiguredError, get_ai_provider

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 10


async def receive_audio(audio: UploadFile) -> AudioReceivedResponse:
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


def _parse_history(raw: Optional[str]) -> List[TutorTurn]:
    if not raw:
        return []

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="history no es JSON válido") from exc

    turns = [HistoryTurn.model_validate(item) for item in payload]
    trimmed = turns[-MAX_HISTORY_TURNS:]
    parsed: List[TutorTurn] = []
    for turn in trimmed:
        if turn.role not in ("user", "assistant"):
            raise HTTPException(
                status_code=400,
                detail="history.role debe ser user o assistant",
            )
        parsed.append(TutorTurn(role=turn.role, text=turn.text))
    return parsed


async def transcribe_upload(audio: UploadFile, *, retry_es: bool = True) -> str:
    try:
        provider = get_ai_provider()
    except AiNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=400, detail="El audio está vacío")

    filename = audio.filename or "recording.webm"
    content_type = audio.content_type or "application/octet-stream"

    started = time.perf_counter()
    try:
        user_text = await provider.transcribe(
            payload, filename, content_type, retry_es=retry_es
        )
    except APIError as exc:
        logger.exception("Error de Groq en STT")
        raise HTTPException(
            status_code=502,
            detail=f"Groq no pudo transcribir: {exc}",
        ) from exc

    if not user_text:
        raise HTTPException(
            status_code=400,
            detail="No se transcribió texto. Prueba a hablar más cerca del micrófono.",
        )
    logger.info(
        "STT listo chars=%s ms=%.0f filename=%s retry_es=%s",
        len(user_text),
        (time.perf_counter() - started) * 1000,
        filename,
        retry_es,
    )
    return user_text


async def run_turn_from_text(
    user_text: str,
    history_json: Optional[str],
    mode: Optional[str] = None,
) -> ConversationTurnResponse:
    try:
        provider = get_ai_provider()
    except AiNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    history = _parse_history(history_json)
    messages = build_messages(history, user_text, mode)

    try:
        raw_reply = await provider.complete(messages)
    except APIError as exc:
        logger.exception("Error de Groq")
        raise HTTPException(
            status_code=502,
            detail=f"Groq no pudo completar el turno: {exc}",
        ) from exc

    reply = parse_tutor_reply(raw_reply)
    assistant_text = flatten_blocks(reply.blocks) or reply.speak or raw_reply

    logger.info(
        "Turno listo user_chars=%s speak_chars=%s blocks=%s mode=%s",
        len(user_text),
        len(reply.speak),
        len(reply.blocks),
        mode,
    )

    return ConversationTurnResponse(
        user_text=user_text,
        assistant_text=assistant_text,
        speak=reply.speak,
        blocks=reply.blocks,
    )


async def run_turn(
    audio: UploadFile,
    history_json: Optional[str],
    mode: Optional[str] = None,
) -> ConversationTurnResponse:
    user_text = await transcribe_upload(audio, retry_es=False)
    return await run_turn_from_text(user_text, history_json, mode)
