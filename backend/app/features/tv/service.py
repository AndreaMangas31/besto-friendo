import itertools
import logging
import time
from typing import List, Optional, Tuple

import pychromecast

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


def power_off() -> TvActionResult:
    cast, browser, error = _with_cast()
    if error or cast is None:
        return TvActionResult(ok=False, message=error)

    name = _cast_name(cast)
    try:
        cast.wait(timeout=10)
        cast.quit_app()
        logger.info("Cast quit_app ok name=%s", name)
        return TvActionResult(
            ok=False,
            message=(
                f"Cerré Cast en {name}. Chromecast casi nunca apaga la tele de verdad; "
                "usa el mando si sigue encendida."
            ),
        )
    except Exception as exc:
        logger.exception("Cast quit falló name=%s", name)
        return TvActionResult(
            ok=False,
            message=f"No pude hablar con {name} para apagar: {exc}",
        )
    finally:
        _stop_browser(browser)
