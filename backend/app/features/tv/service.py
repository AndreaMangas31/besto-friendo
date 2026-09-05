import asyncio
import itertools
import logging
import time
from pathlib import Path
from typing import List, Optional, Tuple

import pychromecast
from androidtvremote2 import AndroidTVRemote, CannotConnect, ConnectionClosed, InvalidAuth

from app.core.config import settings
from app.features.tv.models import TvActionResult, TvCastDevice, TvCastList

logger = logging.getLogger(__name__)

# Archivos distintos: Chromecast ignora el mismo contentId aunque le pongas ?wake=.
_WAKE_IMAGES = (
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg",
)
_wake_seq = itertools.count()

# Mando Google TV. Los .pem no se commitean.
_CERT_DIR = Path(__file__).resolve().parents[3] / ".androidtv"
_CERTFILE = _CERT_DIR / "cert.pem"
_KEYFILE = _CERT_DIR / "key.pem"
_PAIR_HINT = (
    "Tele encendida, POST http://127.0.0.1:8000/tv/pair/start "
    "y el PIN de 6 dígitos a POST /tv/pair/finish {\"pin\":\"123456\"}."
)
_pairing_remote: Optional[AndroidTVRemote] = None


def _next_wake_media() -> Tuple[str, str]:
    n = next(_wake_seq)
    url = _WAKE_IMAGES[n % len(_WAKE_IMAGES)]
    return url, f"besto-wake-{n}"


def _cast_name(cast: pychromecast.Chromecast) -> str:
    info = getattr(cast, "cast_info", None)
    if info and getattr(info, "friendly_name", None):
        return str(info.friendly_name)
    return str(getattr(cast, "name", None) or "Chromecast")


def _discover() -> Tuple[List[pychromecast.Chromecast], object]:
    # tries finito: None reintenta para siempre si la tele no está en la red.
    chromecasts, browser = pychromecast.get_chromecasts(
        tries=2,
        retry_wait=1,
        timeout=8,
    )
    return list(chromecasts or []), browser


def _stop_browser(browser: object) -> None:
    if browser is None:
        return
    stop = getattr(browser, "stop_discovery", None)
    if callable(stop):
        stop()


def _pick_cast(
    chromecasts: List[pychromecast.Chromecast],
) -> Tuple[Optional[pychromecast.Chromecast], str]:
    if not chromecasts:
        return None, (
            "No vi ningún Chromecast en la Wi‑Fi. "
            "Mac y tele en la misma red, tele en standby (no apagada del todo)."
        )

    wanted = (settings.tv_cast_name or "").strip().lower()
    names = [_cast_name(cast) for cast in chromecasts]
    if wanted:
        matches = [cast for cast in chromecasts if wanted in _cast_name(cast).lower()]
        if not matches:
            return None, (
                f"Ningún aparato coincide con TV_CAST_NAME={wanted!r}. "
                f"Vi: {', '.join(names)}"
            )
        return matches[0], ""

    if len(chromecasts) == 1:
        return chromecasts[0], ""

    for cast in chromecasts:
        blob = _cast_name(cast).lower()
        if "tv" in blob or "tele" in blob or "daewoo" in blob:
            return cast, ""

    return chromecasts[0], ""


def list_casts() -> TvCastList:
    chromecasts, browser = _discover()
    try:
        devices: List[TvCastDevice] = []
        for cast in chromecasts:
            info = getattr(cast, "cast_info", None)
            devices.append(
                TvCastDevice(
                    name=_cast_name(cast),
                    model=str(getattr(info, "model_name", None) or ""),
                    host=str(getattr(info, "host", None) or getattr(cast, "host", None) or ""),
                )
            )
        wanted = (settings.tv_cast_name or "").strip()
        names = [d.name for d in devices]
        logger.info("Cast discovery count=%s names=%s", len(devices), names)
        if not devices:
            message = (
                "Nada en la Wi‑Fi. Tele en standby (no apagada), Mac y tele en la misma red."
            )
        else:
            message = f"Vi {len(devices)}: {', '.join(names)}."
        return TvCastList(devices=devices, wanted=wanted, message=message)
    finally:
        _stop_browser(browser)


def _cast_host(cast: pychromecast.Chromecast) -> str:
    info = getattr(cast, "cast_info", None)
    return str(getattr(info, "host", None) or getattr(cast, "host", None) or "")


def _resolve_target() -> Tuple[str, str, str]:
    chromecasts, browser = _discover()
    try:
        cast, error = _pick_cast(chromecasts)
        if error or cast is None:
            return "", "", error
        host = _cast_host(cast)
        name = _cast_name(cast)
        if not host:
            return name, "", f"Vi {name} pero sin IP."
        return name, host, ""
    finally:
        _stop_browser(browser)


def _new_remote(host: str) -> AndroidTVRemote:
    _CERT_DIR.mkdir(parents=True, exist_ok=True)
    return AndroidTVRemote(
        "besto-friendo",
        str(_CERTFILE),
        str(_KEYFILE),
        host,
        enable_ime=False,
    )


def _with_cast() -> Tuple[Optional[pychromecast.Chromecast], Optional[object], str]:
    chromecasts, browser = _discover()
    cast, error = _pick_cast(chromecasts)
    if error:
        _stop_browser(browser)
        logger.info("Cast no disponible: %s", error)
        return None, None, error
    return cast, browser, ""


def power_on() -> TvActionResult:
    cast, browser, error = _with_cast()
    if error or cast is None:
        return TvActionResult(ok=False, message=error)

    name = _cast_name(cast)
    try:
        cast.wait(timeout=10)
        try:
            mc = cast.media_controller
            wake_url, wake_title = _next_wake_media()
            logger.info("Cast wake load name=%s title=%s url=%s", name, wake_title, wake_url)
            mc.play_media(wake_url, "image/jpeg", title=wake_title)
            mc.block_until_active(timeout=10)
        except Exception:
            logger.info("Cast conectó a %s; el media no arrancó", name)
        else:
            # CEC ya disparó; si no cerramos, se queda el receiver (foto de Google) a pantalla completa.
            time.sleep(1.5)
            try:
                cast.quit_app()
                logger.info("Cast wake quit receiver name=%s", name)
            except Exception:
                logger.info("Cast wake no pudo cerrar receiver name=%s", name)
        logger.info("Cast wake ok name=%s", name)
        return TvActionResult(ok=True, message=f"Mandé despertar {name}.")
    except Exception as exc:
        logger.exception("Cast wake falló name=%s", name)
        return TvActionResult(
            ok=False,
            message=f"Vi {name} pero no pude despertarla: {exc}",
        )
    finally:
        _stop_browser(browser)


async def pair_start() -> TvActionResult:
    global _pairing_remote
    name, host, error = await asyncio.to_thread(_resolve_target)
    if error:
        return TvActionResult(ok=False, message=error)

    remote = _new_remote(host)
    await remote.async_generate_cert_if_missing()
    try:
        await remote.async_start_pairing()
    except CannotConnect as exc:
        logger.info("Pairing no conectó name=%s host=%s err=%s", name, host, exc)
        return TvActionResult(
            ok=False,
            message=f"No pude abrir pairing con {name} ({host}): {exc}",
        )
    except ConnectionClosed as exc:
        logger.info("Pairing se cerró name=%s err=%s", name, exc)
        return TvActionResult(
            ok=False,
            message=f"La tele cerró el pairing de {name}. Reintenta start.",
        )

    _pairing_remote = remote
    logger.info("Pairing start ok name=%s host=%s", name, host)
    return TvActionResult(
        ok=True,
        message=(
            f"Emparejando {name}. PIN de 6 dígitos en la tele, "
            'luego POST /tv/pair/finish {"pin":"123456"}.'
        ),
    )


async def pair_finish(pin: str) -> TvActionResult:
    global _pairing_remote
    remote = _pairing_remote
    if remote is None:
        return TvActionResult(
            ok=False,
            message="No hay pairing abierto. POST /tv/pair/start primero.",
        )

    code = pin.strip().replace(" ", "")
    try:
        await remote.async_finish_pairing(code)
    except InvalidAuth:
        logger.info("Pairing PIN inválido")
        return TvActionResult(ok=False, message="PIN incorrecto. Míralo otra vez en la tele.")
    except ConnectionClosed:
        _pairing_remote = None
        logger.info("Pairing cerrado antes de finish")
        return TvActionResult(
            ok=False,
            message="Se cerró el pairing. POST /tv/pair/start otra vez.",
        )

    _pairing_remote = None
    logger.info("Pairing finish ok")
    return TvActionResult(ok=True, message="Emparejado. Ya puedes decir apaga la tele.")


async def power_off() -> TvActionResult:
    name, host, error = await asyncio.to_thread(_resolve_target)
    if error:
        return TvActionResult(ok=False, message=error)

    remote = _new_remote(host)
    await remote.async_generate_cert_if_missing()
    try:
        await remote.async_connect()
    except InvalidAuth:
        logger.info("Android TV sin pairing name=%s host=%s", name, host)
        return TvActionResult(
            ok=False,
            message=f"{name} no está emparejada. {_PAIR_HINT}",
        )
    except CannotConnect as exc:
        logger.info("Android TV mando no conectó name=%s host=%s err=%s", name, host, exc)
        return TvActionResult(
            ok=False,
            message=f"No conecté el mando a {name} ({host}): {exc}",
        )

    try:
        sent = "SLEEP"
        try:
            remote.send_key_command("SLEEP")
        except ValueError:
            remote.send_key_command("POWER")
            sent = "POWER"
        await asyncio.sleep(0.8)
        # SLEEP a veces no hace nada; POWER en Android TV suele ser standby (toggle).
        if remote.is_on:
            remote.send_key_command("POWER")
            sent = "POWER"
            await asyncio.sleep(0.4)
        logger.info("Android TV off key=%s name=%s host=%s", sent, name, host)
        return TvActionResult(ok=True, message=f"Mandé apagar {name}.")
    except ConnectionClosed as exc:
        logger.info("Android TV off sin conexión name=%s err=%s", name, exc)
        return TvActionResult(ok=False, message=f"Se cortó el mando con {name}: {exc}")
    except Exception as exc:
        logger.exception("Android TV off falló name=%s", name)
        return TvActionResult(ok=False, message=f"Conecté a {name} pero no pude apagar: {exc}")
    finally:
        remote.disconnect()
