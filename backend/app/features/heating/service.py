import logging
from typing import Optional, Tuple

from myPyllant.api import MyPyllantAPI
from myPyllant.enums import ZoneOperatingMode, ZoneOperatingModeVRC700

from app.core.config import settings
from app.features.heating.models import HeatingActionResult, HeatingStatus

logger = logging.getLogger(__name__)

_TEMP_MIN = 5.0
_TEMP_MAX = 30.0
_STEP = 1.0
# Como la app: veto para que “pon 21” caliente ya aunque el programa diga otra cosa.
_VETO_HOURS = 12.0
_MISSING = (
    "Falta MIGO_EMAIL o MIGO_PASSWORD en backend/.env "
    "(la misma cuenta que MIGo Link)."
)
# HA muestra “Saunier Duval”; la API pide sdbg.
_BRAND_ALIASES = {
    "saunier_duval": "sdbg",
    "saunierduval": "sdbg",
    "migo": "sdbg",
    "migolink": "sdbg",
}


def _creds() -> Tuple[str, str, str, str]:
    brand = (settings.migo_brand or "sdbg").strip().lower().replace(" ", "")
    brand = _BRAND_ALIASES.get(brand, brand)
    return (
        (settings.migo_email or "").strip(),
        (settings.migo_password or "").strip(),
        brand,
        (settings.migo_country or "spain").strip(),
    )


def _need_creds() -> Optional[str]:
    email, password, _, _ = _creds()
    if email and password:
        return None
    return _MISSING


def _clamp(celsius: float) -> float:
    return max(_TEMP_MIN, min(_TEMP_MAX, round(celsius * 2) / 2))


def _is_off(zone) -> bool:
    mode = zone.heating.operation_mode_heating
    return str(mode).upper() == "OFF"


def _on_mode(zone):
    if zone.control_identifier.is_vrc700:
        return ZoneOperatingModeVRC700.DAY
    return ZoneOperatingMode.MANUAL


def _setpoint(zone) -> Optional[float]:
    value = zone.desired_room_temperature_setpoint
    if value is None:
        value = zone.desired_room_temperature_setpoint_heating
    if value is None:
        value = zone.heating.manual_mode_setpoint_heating
    if value is None:
        return None
    return float(value)


async def _first_zone(api):
    async for system in api.get_systems():
        if system.zones:
            return system.zones[0]
    return None


async def _login_zone(api):
    zone = await _first_zone(api)
    if zone is None:
        return None, HeatingActionResult(
            ok=False,
            message="La cuenta MIGo Link no tiene zonas de calefacción.",
        )
    return zone, None


async def _ensure_on(api, zone) -> None:
    if _is_off(zone):
        await api.set_zone_operating_mode(zone, _on_mode(zone), operating_type="heating")


async def _apply_setpoint(api, zone, celsius: float) -> None:
    target = _clamp(celsius)
    await _ensure_on(api, zone)
    await api.set_manual_mode_setpoint(zone, target, setpoint_type="heating")
    await api.quick_veto_zone_temperature(zone, target, duration_hours=_VETO_HOURS)


def _fail(exc: BaseException) -> HeatingActionResult:
    logger.exception("MIGo Link falló")
    return HeatingActionResult(
        ok=False,
        message=f"MIGo Link no respondió: {exc}",
    )


async def status() -> HeatingStatus:
    missing = _need_creds()
    if missing:
        return HeatingStatus(ok=False, message=missing)

    email, password, brand, country = _creds()
    try:
        async with MyPyllantAPI(email, password, brand, country) as api:
            zone, err = await _login_zone(api)
            if err or zone is None:
                return HeatingStatus(ok=False, message=err.message if err else "Sin zona.")
            mode = str(zone.heating.operation_mode_heating)
            setpoint = _setpoint(zone)
            current = zone.current_room_temperature
            logger.info(
                "Heating status zone=%s mode=%s setpoint=%s current=%s",
                zone.name,
                mode,
                setpoint,
                current,
            )
            return HeatingStatus(
                ok=True,
                message=f"{zone.name}: {mode}, consigna {setpoint} °C.",
                zone_name=zone.name or "",
                mode=mode,
                setpoint_c=setpoint,
                current_c=float(current) if current is not None else None,
            )
    except Exception as exc:
        failed = _fail(exc)
        return HeatingStatus(ok=False, message=failed.message)


async def power_on() -> HeatingActionResult:
    missing = _need_creds()
    if missing:
        return HeatingActionResult(ok=False, message=missing)

    email, password, brand, country = _creds()
    try:
        async with MyPyllantAPI(email, password, brand, country) as api:
            zone, err = await _login_zone(api)
            if err or zone is None:
                return err or HeatingActionResult(ok=False, message="Sin zona.")
            mode = _on_mode(zone)
            await api.set_zone_operating_mode(zone, mode, operating_type="heating")
            logger.info("Heating power_on zone=%s mode=%s ok=True", zone.name, mode)
            return HeatingActionResult(
                ok=True,
                message=f"Calefacción encendida ({zone.name}, {mode}).",
            )
    except Exception as exc:
        return _fail(exc)


async def power_off() -> HeatingActionResult:
    missing = _need_creds()
    if missing:
        return HeatingActionResult(ok=False, message=missing)

    email, password, brand, country = _creds()
    try:
        async with MyPyllantAPI(email, password, brand, country) as api:
            zone, err = await _login_zone(api)
            if err or zone is None:
                return err or HeatingActionResult(ok=False, message="Sin zona.")
            off = (
                ZoneOperatingModeVRC700.OFF
                if zone.control_identifier.is_vrc700
                else ZoneOperatingMode.OFF
            )
            await api.set_zone_operating_mode(zone, off, operating_type="heating")
            logger.info("Heating power_off zone=%s ok=True", zone.name)
            return HeatingActionResult(
                ok=True,
                message=f"Calefacción apagada ({zone.name}).",
            )
    except Exception as exc:
        return _fail(exc)


async def set_temperature(celsius: float) -> HeatingActionResult:
    missing = _need_creds()
    if missing:
        return HeatingActionResult(ok=False, message=missing)

    target = _clamp(celsius)
    email, password, brand, country = _creds()
    try:
        async with MyPyllantAPI(email, password, brand, country) as api:
            zone, err = await _login_zone(api)
            if err or zone is None:
                return err or HeatingActionResult(ok=False, message="Sin zona.")
            await _apply_setpoint(api, zone, target)
            logger.info(
                "Heating set_temp zone=%s requested=%s applied=%s ok=True",
                zone.name,
                celsius,
                target,
            )
            return HeatingActionResult(
                ok=True,
                message=f"Calefacción a {target:g} °C ({zone.name}).",
            )
    except Exception as exc:
        return _fail(exc)


async def nudge(delta: float) -> HeatingActionResult:
    missing = _need_creds()
    if missing:
        return HeatingActionResult(ok=False, message=missing)

    email, password, brand, country = _creds()
    try:
        async with MyPyllantAPI(email, password, brand, country) as api:
            zone, err = await _login_zone(api)
            if err or zone is None:
                return err or HeatingActionResult(ok=False, message="Sin zona.")
            current = _setpoint(zone)
            if current is None:
                current = 20.0
            target = _clamp(current + delta)
            await _apply_setpoint(api, zone, target)
            logger.info(
                "Heating nudge zone=%s from=%s delta=%s to=%s ok=True",
                zone.name,
                current,
                delta,
                target,
            )
            return HeatingActionResult(
                ok=True,
                message=f"Calefacción a {target:g} °C ({zone.name}).",
            )
    except Exception as exc:
        return _fail(exc)


async def temperature_up() -> HeatingActionResult:
    return await nudge(_STEP)


async def temperature_down() -> HeatingActionResult:
    return await nudge(-_STEP)
