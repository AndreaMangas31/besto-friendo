import asyncio
import itertools
import logging
import threading
import time
import uuid
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
_CAST_PORT = 8009
# UUID dummy: get_chromecast_from_host lo exige; no hace falta el real para play_media.
_CAST_UUID = uuid.UUID(int=0)
# IP de un discovery; caduca porque el DHCP puede cambiarla.
_CACHE_TTL_SEC = 8 * 60
_pairing_remote: Optional[AndroidTVRemote] = None
_cache_lock = threading.Lock()
_cached_name = ""
_cached_host = ""
_cached_at = 0.0


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


def _configured_host() -> str:
    return (settings.tv_cast_host or "").strip()


def _forget_cached_target() -> None:
    global _cached_name, _cached_host, _cached_at
    with _cache_lock:
        _cached_name = ""
        _cached_host = ""
        _cached_at = 0.0


def _store_cached_target(name: str, host: str) -> None:
    global _cached_name, _cached_host, _cached_at
    with _cache_lock:
        _cached_name = name
        _cached_host = host
        _cached_at = time.monotonic()


def _read_cached_target() -> Tuple[str, str]:
    with _cache_lock:
        if not _cached_host:
            return "", ""
        if time.monotonic() - _cached_at > _CACHE_TTL_SEC:
            return "", ""
        return _cached_name, _cached_host


def _discover_target() -> Tuple[str, str, str]:
    started = time.perf_counter()
    chromecasts, browser = _discover()
    try:
        cast, error = _pick_cast(chromecasts)
        if error or cast is None:
            logger.info(
                "TV target discover fail ms=%.0f err=%s",
                (time.perf_counter() - started) * 1000,
                error,
            )
            return "", "", error
        host = _cast_host(cast)
        name = _cast_name(cast)
        if not host:
            return name, "", f"Vi {name} pero sin IP."
        _store_cached_target(name, host)
        logger.info(
            "TV target discover host=%s name=%s ms=%.0f",
            host,
            name,
            (time.perf_counter() - started) * 1000,
        )
        return name, host, ""
    finally:
        _stop_browser(browser)


def _resolve_target(force_rediscover: bool = False) -> Tuple[str, str, str]:
    started = time.perf_counter()
    configured = _configured_host()
    if configured:
        name = (settings.tv_cast_name or "").strip() or configured
        logger.info(
            "TV target env host=%s name=%s ms=%.0f",
            configured,
            name,
            (time.perf_counter() - started) * 1000,
        )
        return name, configured, ""

    if not force_rediscover:
        name, host = _read_cached_target()
        if host:
            logger.info(
                "TV target cache hit host=%s name=%s ms=%.0f",
                host,
                name,
                (time.perf_counter() - started) * 1000,
            )
            return name, host, ""

    return _discover_target()


def _new_remote(host: str) -> AndroidTVRemote:
    _CERT_DIR.mkdir(parents=True, exist_ok=True)
    return AndroidTVRemote(
        "besto-friendo",
        str(_CERTFILE),
        str(_KEYFILE),
        host,
        enable_ime=False,
    )


def _chromecast_from_host(host: str, name: str) -> pychromecast.Chromecast:
    return pychromecast.get_chromecast_from_host(
        (host, _CAST_PORT, _CAST_UUID, "Unknown", name or "Chromecast"),
        tries=1,
        retry_wait=0.5,
        timeout=5,
    )


def _disconnect_cast(cast: object) -> None:
    disconnect = getattr(cast, "disconnect", None)
    if not callable(disconnect):
        return
    try:
        disconnect()
    except TypeError:
        try:
            disconnect(blocking=False)
        except Exception:
            logger.info("Cast disconnect no bloqueante falló")
    except Exception:
        logger.info("Cast disconnect falló")


def _finish_wake_later(cast: object, name: str) -> None:
    # CEC ya suele haber disparado con play_media; quit en background para no inflar TTFB.
    try:
        time.sleep(1.5)
        try:
            quit_app = getattr(cast, "quit_app", None)
            if callable(quit_app):
                quit_app()
                logger.info("Cast wake quit receiver name=%s", name)
        except Exception:
            logger.info("Cast wake no pudo cerrar receiver name=%s", name)
    finally:
        _disconnect_cast(cast)


def _send_wake(cast: pychromecast.Chromecast, name: str, host: str) -> None:
    started = time.perf_counter()
    cast.wait(timeout=5)
    mc = cast.media_controller
    wake_url, wake_title = _next_wake_media()
    logger.info("Cast wake load name=%s host=%s title=%s url=%s", name, host, wake_title, wake_url)
    mc.play_media(wake_url, "image/jpeg", title=wake_title)
    logger.info(
        "Cast wake sent name=%s host=%s connect_ms=%.0f",
        name,
        host,
        (time.perf_counter() - started) * 1000,
    )
    threading.Thread(
        target=_finish_wake_later,
        args=(cast, name),
        daemon=True,
        name="cast-wake-quit",
    ).start()


def power_on() -> TvActionResult:
    started = time.perf_counter()
    name, host, error = _resolve_target()
    if error:
        return TvActionResult(ok=False, message=error)

    try:
        try:
            cast = _chromecast_from_host(host, name)
            _send_wake(cast, name, host)
        except Exception as first:
            if _configured_host():
                raise first
            logger.info(
                "Cast wake host cache falló host=%s err=%s; redescubro",
                host,
                first,
            )
            _forget_cached_target()
            name, host, error = _resolve_target(force_rediscover=True)
            if error:
                return TvActionResult(ok=False, message=error)
            cast = _chromecast_from_host(host, name)
            _send_wake(cast, name, host)
        logger.info(
            "Cast wake ok name=%s host=%s tv_ms=%.0f",
            name,
            host,
            (time.perf_counter() - started) * 1000,
        )
        return TvActionResult(ok=True, message=f"Mandé despertar {name}.")
    except Exception as exc:
        logger.exception("Cast wake falló name=%s host=%s", name, host)
        if not _configured_host():
            _forget_cached_target()
        return TvActionResult(
            ok=False,
            message=f"Vi {name} pero no pude despertarla: {exc}",
        )


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
    # Un mando por comando, como en el commit que sí apagaba. Sin certs o PIN, InvalidAuth.
    started = time.perf_counter()
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
    logger.info(
        "Android TV connect ok name=%s host=%s ms=%.0f",
        name,
        host,
        (time.perf_counter() - started) * 1000,
    )
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
    # La pantalla del encendido (apps, recomendaciones). No YouTube.
    # Un solo HOME a veces lo traga la app; el intent HOME refuerza el launcher.
    remote, name, error = await _connect_remote()
    if error or remote is None:
        return TvActionResult(ok=False, message=error)

    try:
        remote.send_key_command("HOME")
        await asyncio.sleep(0.35)
        remote.send_key_command("HOME")
        await asyncio.sleep(0.15)
        remote.send_launch_app_command(
            "intent:#Intent;action=android.intent.action.MAIN;"
            "category=android.intent.category.HOME;end"
        )
        await asyncio.sleep(0.25)
        logger.info("Android TV launcher home name=%s", name)
        return TvActionResult(ok=True, message=f"Mandé el inicio de apps de {name}.")
    except ConnectionClosed as exc:
        logger.info("Android TV home sin conexión name=%s err=%s", name, exc)
        return TvActionResult(ok=False, message=f"Se cortó el mando con {name}: {exc}")
    except Exception as exc:
        logger.exception("Android TV home falló name=%s", name)
        return TvActionResult(ok=False, message=f"Conecté a {name} pero no pude ir al inicio: {exc}")
    finally:
        remote.disconnect()


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
        logger.info(
            "Android TV off key=%s name=%s is_on=%s",
            sent,
            name,
            remote.is_on,
        )
        return TvActionResult(ok=True, message=f"Mandé apagar {name}.")
    except ConnectionClosed as exc:
        logger.info("Android TV off sin conexión name=%s err=%s", name, exc)
        return TvActionResult(ok=False, message=f"Se cortó el mando con {name}: {exc}")
    except Exception as exc:
        logger.exception("Android TV off falló name=%s", name)
        return TvActionResult(ok=False, message=f"Conecté a {name} pero no pude apagar: {exc}")
    finally:
        remote.disconnect()
