import asyncio
import itertools
import logging
import time
from pathlib import Path
from typing import List, Optional, Tuple
from urllib.parse import quote_plus

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
# 0.0.x manda el string tal cual; un package sin esquema no abre nada.
_YOUTUBE_LINK = "https://www.youtube.com"
_NETFLIX_LINK = "https://www.netflix.com"
# Un tap de VOLUME_* apenas se nota; varios imitan “sube/baja un poco”.
_VOLUME_REPEATS = 5
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


async def _connect_remote() -> Tuple[Optional[AndroidTVRemote], str, str]:
    # Misma sesión TLS que el pairing. Sin certs o PIN, InvalidAuth.
    name, host, error = await asyncio.to_thread(_resolve_target)
    if error:
        return None, "", error

    remote = _new_remote(host)
    await remote.async_generate_cert_if_missing()
    try:
        await remote.async_connect()
    except InvalidAuth:
        logger.info("Android TV sin pairing name=%s host=%s", name, host)
        return None, name, f"{name} no está emparejada. {_PAIR_HINT}"
    except CannotConnect as exc:
        logger.info("Android TV mando no conectó name=%s host=%s err=%s", name, host, exc)
        return None, name, f"No conecté el mando a {name} ({host}): {exc}"
    return remote, name, ""


async def send_key(key: str, repeats: int, label: str) -> TvActionResult:
    remote, name, error = await _connect_remote()
    if error or remote is None:
        return TvActionResult(ok=False, message=error)

    try:
        for index in range(max(1, repeats)):
            remote.send_key_command(key)
            if index + 1 < repeats:
                await asyncio.sleep(0.08)
        # send_key_command solo encola; si desconectamos al instante a veces no sale.
        await asyncio.sleep(0.25)
        logger.info("Android TV key=%s repeats=%s name=%s", key, repeats, name)
        return TvActionResult(ok=True, message=f"Mandé {label} a {name}.")
    except ValueError:
        logger.info("Android TV key desconocida key=%s name=%s", key, name)
        return TvActionResult(ok=False, message=f"La tele no admite la tecla {key}.")
    except ConnectionClosed as exc:
        logger.info("Android TV key sin conexión name=%s err=%s", name, exc)
        return TvActionResult(ok=False, message=f"Se cortó el mando con {name}: {exc}")
    except Exception as exc:
        logger.exception("Android TV key falló key=%s name=%s", key, name)
        return TvActionResult(ok=False, message=f"Conecté a {name} pero no pude mandar {label}: {exc}")
    finally:
        remote.disconnect()


async def volume_up() -> TvActionResult:
    return await send_key("VOLUME_UP", _VOLUME_REPEATS, "subir volumen")


async def volume_down() -> TvActionResult:
    return await send_key("VOLUME_DOWN", _VOLUME_REPEATS, "bajar volumen")


async def mute() -> TvActionResult:
    # VOLUME_MUTE es el altavoz; MUTE en Android es el micro.
    return await send_key("VOLUME_MUTE", 1, "silenciar")


async def home() -> TvActionResult:
    return await send_key("HOME", 1, "ir al inicio")


async def back() -> TvActionResult:
    return await send_key("BACK", 1, "atrás")


async def play_pause() -> TvActionResult:
    return await send_key("MEDIA_PLAY_PAUSE", 1, "play/pausa")


async def launch_app(app_link: str, label: str) -> TvActionResult:
    remote, name, error = await _connect_remote()
    if error or remote is None:
        return TvActionResult(ok=False, message=error)

    try:
        remote.send_launch_app_command(app_link)
        await asyncio.sleep(0.25)
        logger.info("Android TV launch link=%s name=%s", app_link, name)
        return TvActionResult(ok=True, message=f"Mandé abrir {label} en {name}.")
    except ConnectionClosed as exc:
        logger.info("Android TV launch sin conexión name=%s err=%s", name, exc)
        return TvActionResult(ok=False, message=f"Se cortó el mando con {name}: {exc}")
    except Exception as exc:
        logger.exception("Android TV launch falló link=%s name=%s", app_link, name)
        return TvActionResult(
            ok=False,
            message=f"Conecté a {name} pero no pude abrir {label}: {exc}",
        )
    finally:
        remote.disconnect()


async def open_youtube() -> TvActionResult:
    return await launch_app(_YOUTUBE_LINK, "YouTube")


async def open_netflix() -> TvActionResult:
    return await launch_app(_NETFLIX_LINK, "Netflix")


async def search_on_screen(query: str) -> TvActionResult:
    # KEYCODE_SEARCH en Google TV abre el Asistente (micrófono), no la lupa de YouTube.
    cleaned = " ".join(query.split())
    if not cleaned:
        return TvActionResult(ok=False, message="No oí qué buscar.")
    link = (
        "https://www.youtube.com/results?search_query=" + quote_plus(cleaned)
    )
    return await launch_app(link, f"YouTube “{cleaned}”")


async def power_off() -> TvActionResult:
    remote, name, error = await _connect_remote()
    if error or remote is None:
        return TvActionResult(ok=False, message=error)

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
        logger.info("Android TV off key=%s name=%s", sent, name)
        return TvActionResult(ok=True, message=f"Mandé apagar {name}.")
    except ConnectionClosed as exc:
        logger.info("Android TV off sin conexión name=%s err=%s", name, exc)
        return TvActionResult(ok=False, message=f"Se cortó el mando con {name}: {exc}")
    except Exception as exc:
        logger.exception("Android TV off falló name=%s", name)
        return TvActionResult(ok=False, message=f"Conecté a {name} pero no pude apagar: {exc}")
    finally:
        remote.disconnect()
