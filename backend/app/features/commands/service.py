import logging
import re
from typing import Optional, Tuple

from fastapi import UploadFile

from app.features.commands.models import CommandName, DispatchResponse, PracticeMode
from app.features.conversation.service import run_turn_from_text, transcribe_upload

logger = logging.getLogger(__name__)


def _normalize(text: str) -> str:
    lowered = text.lower().replace("-", " ")
    return re.sub(r"[^a-z0-9ñáéíóúü\s]", " ", lowered)


def _compact(transcript: str) -> str:
    return re.sub(r"\s+", " ", _normalize(transcript)).strip()


def _collapsed(compact: str) -> str:
    return compact.replace(" ", "")


def _has_name(compact: str) -> bool:
    # Whisper oye "best of friend", "best friend", "pesto friendo"...
    blob = _collapsed(compact)
    if "friendo" in blob or "friend" in blob:
        if any(token in blob for token in ("besto", "best", "pesto", "beso")):
            return True
    return "bestofriend" in blob or "bestoffriend" in blob


def _is_enable_japanese(compact: str) -> bool:
    # El payload enable + japanese + mode ya es raro; el nombre puede salir mal.
    has_enable = "enable" in compact or "activa" in compact or "enciende" in compact
    has_jp = "japanese" in compact or "japones" in compact or "japon" in compact
    has_mode = "mode" in compact or "modo" in compact
    if has_enable and has_jp and has_mode:
        return True
    return _has_name(compact) and has_enable and has_jp


def _is_disable_japanese(compact: str) -> bool:
    # Cancelar el tutor, no un "cancel" suelto en mitad de una frase de práctica.
    has_disable = any(
        token in compact
        for token in ("disable", "cancel", "desactiva", "cancela", "apaga", "cierra")
    )
    has_jp = "japanese" in compact or "japones" in compact or "japon" in compact
    has_mode = "mode" in compact or "modo" in compact
    if not has_disable:
        return False
    if _has_name(compact) and (has_jp or has_mode):
        return True
    return has_jp and has_mode


def _detect_practice_mode(compact: str) -> Optional[PracticeMode]:
    # Evita que "quiero conversar de cine" cambie el chip: hace falta modo/mode,
    # el nombre, o una frase tipo "darme ideas".
    explicit = bool(
        re.search(r"\bmodo\b", compact)
        or re.search(r"\bmode\b", compact)
        or "cambia" in compact
        or "switch" in compact
        or "darme ideas" in compact
        or "give me ideas" in compact
    )
    if not (explicit or _has_name(compact)):
        return None

    if "idea" in compact:
        return "ideas"
    if "correg" in compact or "correct" in compact:
        return "corregir"
    if "convers" in compact:
        return "conversar"
    return None


def detect_command(
    transcript: str,
    japanese_enabled: bool,
) -> Tuple[CommandName, Optional[PracticeMode]]:
    compact = _compact(transcript)

    if _is_enable_japanese(compact):
        return "enable_japanese_mode", None
    if _is_disable_japanese(compact):
        return "disable_japanese_mode", None

    if japanese_enabled:
        practice = _detect_practice_mode(compact)
        if practice:
            return "set_practice_mode", practice
        return "japanese_turn", None

    return "unknown", None


async def dispatch(
    audio: UploadFile,
    japanese_enabled: bool,
    history_json: Optional[str],
    mode: Optional[str],
) -> DispatchResponse:
    transcript = await transcribe_upload(audio)
    command, practice_mode = detect_command(transcript, japanese_enabled)
    logger.info(
        "Dispatch command=%s practice_mode=%s japanese_enabled=%s transcript=%s",
        command,
        practice_mode,
        japanese_enabled,
        transcript[:120],
    )

    if command == "japanese_turn":
        turn = await run_turn_from_text(transcript, history_json, mode)
        return DispatchResponse(command=command, transcript=transcript, turn=turn)

    return DispatchResponse(
        command=command,
        transcript=transcript,
        practice_mode=practice_mode,
    )
