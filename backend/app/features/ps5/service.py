import logging
import socket
from typing import List, Optional, Tuple

from pyremoteplay import RPDevice
from pyremoteplay.const import BROADCAST_IP, DDP_PORT_PS4, DDP_PORT_PS5, TYPE_PS5
from pyremoteplay.ddp import DDP_TYPE_WAKEUP, DDP_VERSION, get_socket
from pyremoteplay.util import format_regist_key

from app.core.config import settings
from app.features.ps5.models import Ps5ActionResult, Ps5Status

logger = logging.getLogger(__name__)

_REGISTER_HINT = (
    "Consola encendida y en la misma Wi‑Fi: "
    "pyremoteplay {host} --register "
    "(cuenta PSN en el navegador + PIN de Remote Play)."
)


def _host() -> str:
    return (settings.ps5_host or "").strip()


def _need_host() -> Tuple[str, Optional[Ps5ActionResult]]:
    host = _host()
    if host:
        return host, None
    return "", Ps5ActionResult(
        ok=False,
        message="Falta PS5_HOST en backend/.env (IP de la consola, DHCP reservada).",
    )


def _normalize_mac(raw: str) -> str:
    cleaned = "".join(ch for ch in raw.upper() if ch in "0123456789ABCDEF")
    return cleaned


def _mac_forms(mac12: str) -> List[str]:
    if len(mac12) != 12:
        return []
    colon = ":".join(mac12[i : i + 2] for i in range(0, 12, 2))
    return [mac12, mac12.lower(), colon, colon.lower()]


def _profile_usernames() -> List[str]:
    try:
        return list(RPDevice.get_all_users() or [])
    except Exception:
        logger.exception("PS5 no pude leer ~/.pyremoteplay")
        return []


def _pick_user(device: RPDevice) -> Tuple[str, str]:
    # En reposo el DDP a veces no trae host-id: get_users() queda vacío.
    # Entonces usamos PS5_USER o el primer perfil de pyremoteplay.
    wanted = (settings.ps5_user or "").strip()
    linked: List[str] = []
    try:
        linked = list(device.get_users() or [])
    except Exception:
        logger.exception("PS5 get_users falló host=%s", device.host)
    known = _profile_usernames()
    pool = linked or known
    logger.info(
        "PS5 users linked=%s known=%s mac=%s",
        linked,
        known,
        device.mac_address,
    )
    if wanted:
        for user in pool:
            if user.lower() == wanted.lower():
                return user, ""
        return "", (
            f"Ningún perfil coincide con PS5_USER={wanted!r}. "
            f"Vi: {', '.join(pool) or 'ninguno'}. "
            + _REGISTER_HINT.format(host=device.host)
        )
    if pool:
        return pool[0], ""
    return "", (
        "No hay perfil Remote Play para esta consola. "
        + _REGISTER_HINT.format(host=device.host)
    )


def _regist_for_user(user: str, mac12: str) -> Tuple[str, str, str]:
    # Clave de wakeup en el perfil; no loguear el valor.
    profiles = RPDevice.get_profiles()
    profile = profiles.get_user_profile(user)
    if profile is None:
        return "", "", f"No hay perfil pyremoteplay para {user!r}."
    hosts = list(profile.hosts or [])
    if not hosts:
        return "", "", (
            f"El perfil {user!r} no tiene consola linkada. "
            + _REGISTER_HINT.format(host=_host() or "?")
        )
    ps5_hosts = [item for item in hosts if str(item.type or "").upper() == TYPE_PS5]
    candidates = ps5_hosts or hosts
    wanted = set(_mac_forms(mac12))
    for host_profile in candidates:
        name = str(host_profile.name or "")
        if name in wanted or _normalize_mac(name) == mac12:
            return host_profile.regist_key, str(host_profile.type or TYPE_PS5), ""
    if len(candidates) == 1:
        only = candidates[0]
        logger.info(
            "PS5_MAC del .env no es el host-id DDP; uso la consola del perfil id=%s",
            only.name,
        )
        return only.regist_key, str(only.type or TYPE_PS5), ""
    names = ", ".join(str(item.name) for item in candidates)
    return "", "", f"PS5_MAC no coincide con las consolas de {user}: {names}."


# Letras de model en el WAKEUP: varían por región/hardware (pyremoteplay usa w).
_WAKE_MODELS = ("w", "m", "a", "i")


def _wake_message(credential: str, model: str) -> str:
    return (
        f"{DDP_TYPE_WAKEUP} * HTTP/1.1\n"
        f"user-credential:{credential}\n"
        f"client-type:vr\n"
        f"auth-type:R\n"
        f"model:{model}\n"
        f"app-type:r\n"
        f"device-discovery-protocol-version:{DDP_VERSION}\n"
    )


def _sony_wakeup(host: str, credential: str) -> None:
    # Unicast + broadcast, puertos PS5 y PS4. En reposo el ID DDP a menudo no llega.
    sock = get_socket()
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        for _ in range(3):
            for model in _WAKE_MODELS:
                payload = _wake_message(credential, model).encode("utf-8")
                for dest in (host, BROADCAST_IP):
                    for port in (DDP_PORT_PS5, DDP_PORT_PS4):
                        try:
                            sock.sendto(payload, (dest, port))
                        except OSError:
                            logger.info(
                                "PS5 wakeup UDP falló dest=%s port=%s", dest, port
                            )
    finally:
        sock.close()


def _poll(device: RPDevice) -> Optional[dict]:
    try:
        status = device.get_status()
    except Exception:
        logger.exception("PS5 get_status falló host=%s", device.host)
        return None
    return status or None


def status() -> Ps5Status:
    host, missing = _need_host()
    if missing:
        return Ps5Status(host="", reachable=False, message=missing.message)

    device = RPDevice(host)
    polled = _poll(device)
    if not polled:
        logger.info("PS5 status inalcanzable host=%s", host)
        return Ps5Status(
            host=host,
            reachable=False,
            message=(
                f"No responde {host}. Reposo con red, misma LAN, o está apagada de verdad. "
                "El LED no cuenta."
            ),
        )

    is_on = bool(device.is_on)
    name = str(device.host_name or "")
    status_name = str(device.status_name or "")
    logger.info(
        "PS5 status host=%s reachable=1 is_on=%s status_name=%s name=%s",
        host,
        is_on,
        status_name,
        name,
    )
    if is_on:
        state = "encendida"
    else:
        # En reposo get_status suele seguir; apagado total no llega aquí.
        state = "en reposo (o standby); el LED puede no verse"
    return Ps5Status(
        host=host,
        reachable=True,
        is_on=is_on,
        status_name=status_name,
        host_name=name,
        message=f"{name or host}: {state}.",
    )


def power_on() -> Ps5ActionResult:
    host, missing = _need_host()
    if missing:
        return missing

    device = RPDevice(host)
    _poll(device)
    if device.is_on:
        logger.info("PS5 ya encendida host=%s", host)
        return Ps5ActionResult(ok=True, message=f"{host} ya estaba encendida.")

    user, user_error = _pick_user(device)
    if user_error:
        return Ps5ActionResult(ok=False, message=user_error)

    mac12 = _normalize_mac(device.mac_address or "") or _normalize_mac(
        settings.ps5_mac or ""
    )
    key, host_type, key_error = _regist_for_user(user, mac12)
    if key_error:
        return Ps5ActionResult(ok=False, message=key_error)

    # DDP WAKEUP de Sony (puerto PS5). El magic packet clásico no despierta la consola.
    kind = host_type or device.host_type or TYPE_PS5
    try:
        credential = format_regist_key(key)
        _sony_wakeup(host, credential)
        logger.info(
            "PS5 ddp wakeup enviado host=%s user=%s type=%s env_mac=%s ddp_mac=%s",
            host,
            user,
            kind,
            _normalize_mac(settings.ps5_mac or ""),
            device.mac_address,
        )
    except Exception as exc:
        logger.exception("PS5 wakeup falló host=%s user=%s", host, user)
        return Ps5ActionResult(ok=False, message=f"No pude despertar {host}: {exc}")

    woke = device.wait_for_wakeup(timeout=40)
    logger.info("PS5 wait_for_wakeup host=%s woke=%s is_on=%s", host, woke, device.is_on)
    if woke or device.is_on:
        return Ps5ActionResult(ok=True, message=f"Mandé wakeup a {host} ({user}).")
    return Ps5ActionResult(
        ok=False,
        message=(
            f"Mandé wakeup a {host} ({user}) pero sigue en reposo. "
            "La MAC del .env (Wi‑Fi) no es el host-id de Remote Play; "
            "si no arranca, prueba otra vez con la Play en reposo y red activa."
        ),
    )


async def power_off() -> Ps5ActionResult:
    # standby = reposo. No es el menú “Apagar PS5”; Sony no lo expone por red.
    host, missing = _need_host()
    if missing:
        return missing

    device = RPDevice(host)
    polled = _poll(device)
    if not polled:
        logger.info("PS5 standby sin status host=%s", host)
        return Ps5ActionResult(
            ok=False,
            message=(
                f"No veo {host} en la red. Si está apagada del todo no hay reposo que mandar; "
                "si está en reposo, revisa ‘seguir conectado a Internet’."
            ),
        )

    user, user_error = _pick_user(device)
    if user_error:
        return Ps5ActionResult(ok=False, message=user_error)

    try:
        ok = await device.standby(user)
    except Exception as exc:
        logger.exception("PS5 standby falló host=%s user=%s", host, user)
        return Ps5ActionResult(
            ok=False,
            message=(
                f"No pude mandar reposo a {host}: {exc}. "
                + _REGISTER_HINT.format(host=host)
            ),
        )

    logger.info("PS5 standby host=%s user=%s ok=%s", host, user, ok)
    # False = la sesión RP se corta al ir a reposo; no es un crash y el comando sí salió.
    return Ps5ActionResult(
        ok=True,
        message=f"Mandé a reposo {host}. Puede no verse LED naranja; sigue en la red.",
    )
