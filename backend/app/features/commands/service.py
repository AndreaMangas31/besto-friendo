import asyncio
import logging
import re
import time
from typing import Optional, Tuple

from fastapi import UploadFile

from app.features.commands.models import CommandName, DispatchResponse, PracticeMode
from app.features.conversation.service import run_turn_from_text, transcribe_upload
from app.features.ps5.service import power_off as ps5_power_off
from app.features.ps5.service import power_on as ps5_power_on
from app.features.tv.service import back as tv_back
from app.features.tv.service import home as tv_home
from app.features.tv.service import mute as tv_mute
from app.features.tv.service import open_netflix as tv_open_netflix
from app.features.tv.service import open_youtube as tv_open_youtube
from app.features.tv.service import play_pause as tv_play_pause
from app.features.tv.service import power_off as tv_power_off
from app.features.tv.service import power_on as tv_power_on
from app.features.tv.service import search_on_screen as tv_search
from app.features.tv.service import select_hdmi as tv_select_hdmi
from app.features.tv.service import volume_down as tv_volume_down
from app.features.tv.service import volume_up as tv_volume_up

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


def _has_ps5(compact: str) -> bool:
    # Whisper parte "PS5" en "ps 5". "play" suelto es pausa/tutor; "la play" es la consola.
    blob = _collapsed(compact)
    if any(token in blob for token in ("playstation", "ps5", "consola")):
        return True
    if "play station" in compact or re.search(r"\bps\s*5\b", compact):
        return True
    return bool(re.search(r"\b(?:la|el)\s+play\b", compact))


def _has_ps5_off_verb(compact: str) -> bool:
    blob = _collapsed(compact)
    if any(
        token in compact
        for token in ("turn off", "power off", "shut down", "stand by")
    ):
        return True
    return any(
        token in blob
        for token in ("apaga", "apague", "apag", "duerme", "reposo", "standby", "sleep")
    )


def _has_ps5_on_verb(compact: str) -> bool:
    blob = _collapsed(compact)
    if any(token in compact for token in ("turn on", "power on")):
        return True
    return any(
        token in blob
        for token in (
            "enciend",
            "prende",
            "wakeup",
            "despert",
            "wake",
            "enable",
            "enabl",
        )
    )


def _is_ps5_power_on(compact: str) -> bool:
    if not _has_ps5(compact):
        return False
    if _has_ps5_off_verb(compact) and not _has_ps5_on_verb(compact):
        return False
    if _has_ps5_on_verb(compact):
        return True
    return _has_name(compact)


def _is_ps5_power_off(compact: str) -> bool:
    if not _has_ps5(compact):
        return False
    return _has_ps5_off_verb(compact)


def _detect_ps5_command(compact: str) -> Optional[CommandName]:
    if _is_ps5_power_on(compact):
        return "ps5_power_on"
    if _is_ps5_power_off(compact):
        return "ps5_power_off"
    return None


def _has_tv(compact: str) -> bool:
    # Whisper parte "TV" en "t v" / "t.v." y a veces escribe teevee.
    blob = _collapsed(compact)
    if re.search(r"\bt\s*v\b", compact) or "tv" in blob:
        return True
    return any(
        token in blob
        for token in ("tele", "tivi", "teevee", "chromecast", "cromecast")
    )


def _has_tv_off_verb(compact: str) -> bool:
    blob = _collapsed(compact)
    if any(token in compact for token in ("turn off", "power off")):
        return True
    return any(
        token in blob
        for token in ("apaga", "apague", "disable", "duerme", "apag")
    )


def _has_tv_on_verb(compact: str) -> bool:
    # "unable tv" / "in able tv" son enable mal oído, no un verbo exacto.
    blob = _collapsed(compact)
    if any(token in compact for token in ("turn on", "power on", "pon la", "abre la")):
        return True
    return any(
        token in blob
        for token in (
            "enable",
            "enabl",
            "nable",
            "unable",
            "inable",
            "anable",
            "enciend",
            "prende",
            "wakeup",
            "despert",
            "wake",
        )
    )


def _is_tv_power_on(compact: str) -> bool:
    if not _has_tv(compact):
        return False
    if _has_tv_off_verb(compact) and not _has_tv_on_verb(compact):
        return False
    if _has_tv_on_verb(compact):
        return True
    # "ey besto friendo … tv" aunque se coma el enable.
    return _has_name(compact)


def _is_tv_power_off(compact: str) -> bool:
    # No usar un "apaga" suelto: hace falta tele/tv.
    if not _has_tv(compact):
        return False
    return _has_tv_off_verb(compact)


def _has_youtube(compact: str) -> bool:
    blob = _collapsed(compact)
    return "youtube" in blob or "yutube" in blob or "youtobe" in blob


def _has_netflix(compact: str) -> bool:
    return "netflix" in _collapsed(compact)


def _has_tv_surface(compact: str) -> bool:
    # Home/pausa sin "tele" se come frases del tutor; YouTube/Netflix sí anclan.
    return _has_tv(compact) or _has_youtube(compact) or _has_netflix(compact)


def _has_media_control_verb(compact: str) -> bool:
    blob = _collapsed(compact)
    if "play pause" in compact or "playpause" in blob:
        return True
    return any(
        token in blob
        for token in ("pausa", "pause", "reproduce", "reanuda", "resume")
    ) or bool(re.search(r"\bplay\b", compact))


def _has_volume_word(compact: str) -> bool:
    blob = _collapsed(compact)
    return "volumen" in blob or "volume" in blob or "volúmen" in blob


def _is_tv_volume_down(compact: str) -> bool:
    if not _has_volume_word(compact):
        return False
    blob = _collapsed(compact)
    if any(token in compact for token in ("volume down", "turn down")):
        return True
    return any(
        token in blob
        for token in ("baja", "bajar", "baje", "menos", "disminu", "quiet")
    )


def _is_tv_volume_up(compact: str) -> bool:
    if not _has_volume_word(compact):
        return False
    if _is_tv_volume_down(compact):
        return False
    blob = _collapsed(compact)
    if any(token in compact for token in ("volume up", "turn up")):
        return True
    return any(
        token in blob
        for token in ("sube", "subi", "subir", "aument", "mas", "más", "loud", "alza")
    )


def _is_tv_mute(compact: str) -> bool:
    blob = _collapsed(compact)
    # "silencio" suelto en el tutor no debe mutear; mute en inglés sí es específico.
    if "mute" in blob or "unmute" in blob:
        return True
    if any(token in blob for token in ("silenci",)):
        return _has_tv_surface(compact) or _has_volume_word(compact)
    if "sonido" in blob and any(token in blob for token in ("quita", "sin", "apaga")):
        return _has_tv_surface(compact) or _has_volume_word(compact)
    return False


def _is_tv_home(compact: str) -> bool:
    # Inicio de la tele (apps). YouTube se abre con “abre youtube”.
    blob = _collapsed(compact).replace("ú", "u").replace("é", "e")
    has_menu = "menu" in blob
    if has_menu and any(
        token in blob for token in ("vuelve", "volver", "almenu", "elmenu")
    ):
        return True
    if not _has_tv_surface(compact):
        return False
    return has_menu or any(token in blob for token in ("home", "inicio", "menuprincipal"))


def _is_tv_back(compact: str) -> bool:
    if not _has_tv_surface(compact):
        return False
    blob = _collapsed(compact)
    if "go back" in compact:
        return True
    return any(token in blob for token in ("atras", "atrás", "back"))


def _is_tv_play_pause(compact: str) -> bool:
    if not _has_tv_surface(compact):
        return False
    return _has_media_control_verb(compact)


def _is_tv_open_youtube(compact: str) -> bool:
    if not _has_youtube(compact):
        return False
    # "pausa youtube" es play/pausa, no relanzar la app.
    return not _has_media_control_verb(compact)


def _is_tv_open_netflix(compact: str) -> bool:
    if not _has_netflix(compact):
        return False
    return not _has_media_control_verb(compact)


def _tv_hdmi_port(compact: str) -> Optional[int]:
    # Whisper: "hdmi", "hd mi". Sin número = HDMI 1 (la Play).
    blob = _collapsed(compact)
    if "hdmi" not in blob:
        return None
    words = {
        "uno": 1,
        "una": 1,
        "dos": 2,
        "segundo": 2,
        "tres": 3,
        "tercero": 3,
        "cuatro": 4,
        "cuarto": 4,
        "one": 1,
        "two": 2,
        "too": 2,
        "three": 3,
        "four": 4,
    }
    for word, port in words.items():
        if re.search(rf"\b{word}\b", compact):
            return port
    match = re.search(r"\b([1-4])\b", compact)
    if match:
        return int(match.group(1))
    return 1


def _tv_search_query(compact: str) -> Optional[str]:
    # "busca" se come el tutor. "ok tele gatos" / "okay tv cats".
    blob = re.sub(r"\bt\s+v\b", "tv", compact)
    match = re.search(
        r"\b(?:ok(?:ay|ey)?|oye)\s+(?:tele|tv)\b\s+(.+)$",
        blob,
    )
    if not match:
        return None
    query = match.group(1).strip()
    query = re.sub(r"\b(por favor|please)\b", " ", query)
    query = re.sub(r"\s+", " ", query).strip()
    if len(query) < 2:
        return None
    return query[:80]


def _detect_tv_command(compact: str) -> Optional[CommandName]:
    # Apps y teclas antes de power: "besto friendo sube el volumen de la tele"
    # no debe caer en el fallback de encender por nombre+tv.
    if _tv_search_query(compact):
        return "tv_search"
    if _tv_hdmi_port(compact) is not None:
        return "tv_hdmi"
    if _is_tv_open_youtube(compact):
        return "tv_open_youtube"
    if _is_tv_open_netflix(compact):
        return "tv_open_netflix"
    if _is_tv_volume_up(compact):
        return "tv_volume_up"
    if _is_tv_volume_down(compact):
        return "tv_volume_down"
    if _is_tv_mute(compact):
        return "tv_mute"
    if _is_tv_play_pause(compact):
        return "tv_play_pause"
    if _is_tv_home(compact):
        return "tv_home"
    if _is_tv_back(compact):
        return "tv_back"
    if _is_tv_power_on(compact):
        return "tv_power_on"
    if _is_tv_power_off(compact):
        return "tv_power_off"
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

    ps5_command = _detect_ps5_command(compact)
    if ps5_command:
        return ps5_command, None

    tv_command = _detect_tv_command(compact)
    if tv_command:
        return tv_command, None

    if japanese_enabled:
        practice = _detect_practice_mode(compact)
        if practice:
            return "set_practice_mode", practice
        return "japanese_turn", None

    return "unknown", None


_TV_REMOTE_ACTIONS = {
    "tv_power_off": tv_power_off,
    "tv_volume_up": tv_volume_up,
    "tv_volume_down": tv_volume_down,
    "tv_mute": tv_mute,
    "tv_home": tv_home,
    "tv_back": tv_back,
    "tv_play_pause": tv_play_pause,
    "tv_open_youtube": tv_open_youtube,
    "tv_open_netflix": tv_open_netflix,
}


async def dispatch(
    audio: UploadFile,
    japanese_enabled: bool,
    history_json: Optional[str],
    mode: Optional[str],
) -> DispatchResponse:
    stt_started = time.perf_counter()
    transcript = await transcribe_upload(audio)
    stt_ms = (time.perf_counter() - stt_started) * 1000
    command, practice_mode = detect_command(transcript, japanese_enabled)
    logger.info(
        "Dispatch command=%s practice_mode=%s japanese_enabled=%s stt_ms=%.0f transcript=%s",
        command,
        practice_mode,
        japanese_enabled,
        stt_ms,
        transcript[:120],
    )

    if command == "japanese_turn":
        turn = await run_turn_from_text(transcript, history_json, mode)
        return DispatchResponse(command=command, transcript=transcript, turn=turn)

    if command == "ps5_power_on":
        started = time.perf_counter()
        result = await asyncio.to_thread(ps5_power_on)
        # Sin señal la tele vuelve al launcher; HDMI cuando la Play ya está on.
        hdmi = await tv_select_hdmi(1)
        logger.info(
            "PS5 command=%s ok=%s stt_ms=%.0f ps5_ms=%.0f hdmi_ok=%s message=%s hdmi=%s",
            command,
            result.ok,
            stt_ms,
            (time.perf_counter() - started) * 1000,
            hdmi.ok,
            result.message,
            hdmi.message,
        )
        extra = f" {hdmi.message}" if hdmi.message else ""
        return DispatchResponse(
            command=command,
            transcript=transcript,
            device_message=f"{result.message}{extra}".strip(),
            ok=result.ok,
        )

    if command == "ps5_power_off":
        started = time.perf_counter()
        result = await ps5_power_off()
        logger.info(
            "PS5 command=%s ok=%s stt_ms=%.0f ps5_ms=%.0f message=%s",
            command,
            result.ok,
            stt_ms,
            (time.perf_counter() - started) * 1000,
            result.message,
        )
        return DispatchResponse(
            command=command,
            transcript=transcript,
            device_message=result.message,
            ok=result.ok,
        )

    if command == "tv_power_on":
        tv_started = time.perf_counter()
        result = await asyncio.to_thread(tv_power_on)
        logger.info(
            "TV command=%s ok=%s stt_ms=%.0f tv_ms=%.0f message=%s",
            command,
            result.ok,
            stt_ms,
            (time.perf_counter() - tv_started) * 1000,
            result.message,
        )
        return DispatchResponse(
            command=command,
            transcript=transcript,
            device_message=result.message,
            ok=result.ok,
        )

    if command == "tv_search":
        query = _tv_search_query(_compact(transcript)) or ""
        tv_started = time.perf_counter()
        result = await tv_search(query)
        logger.info(
            "TV command=%s ok=%s chars=%s stt_ms=%.0f tv_ms=%.0f message=%s",
            command,
            result.ok,
            len(query),
            stt_ms,
            (time.perf_counter() - tv_started) * 1000,
            result.message,
        )
        return DispatchResponse(
            command=command,
            transcript=transcript,
            device_message=result.message,
            ok=result.ok,
        )

    if command == "tv_hdmi":
        port = _tv_hdmi_port(_compact(transcript)) or 1
        tv_started = time.perf_counter()
        result = await tv_select_hdmi(port)
        logger.info(
            "TV command=%s ok=%s hdmi=%s stt_ms=%.0f tv_ms=%.0f message=%s",
            command,
            result.ok,
            port,
            stt_ms,
            (time.perf_counter() - tv_started) * 1000,
            result.message,
        )
        return DispatchResponse(
            command=command,
            transcript=transcript,
            device_message=result.message,
            ok=result.ok,
        )

    action = _TV_REMOTE_ACTIONS.get(command)
    if action is not None:
        tv_started = time.perf_counter()
        result = await action()
        logger.info(
            "TV command=%s ok=%s stt_ms=%.0f tv_ms=%.0f message=%s",
            command,
            result.ok,
            stt_ms,
            (time.perf_counter() - tv_started) * 1000,
            result.message,
        )
        return DispatchResponse(
            command=command,
            transcript=transcript,
            device_message=result.message,
            ok=result.ok,
        )

    return DispatchResponse(
        command=command,
        transcript=transcript,
        practice_mode=practice_mode,
    )
