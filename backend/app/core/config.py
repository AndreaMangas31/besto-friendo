import asyncio
import logging
from pathlib import Path
from typing import Any, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# backend/.env (este archivo está en app/core/). Relativo al cwd de uvicorn falla si arrancas desde otro sitio.
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
_STAMP_PATH = Path(__file__).resolve().parent / "env_reload.py"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
        # Vacío en el entorno del proceso no debe tapar el valor nuevo del archivo.
        env_ignore_empty=True,
    )

    app_name: str = "besto-friendo"
    # Coma-separados: http://localhost:3000,https://xxx.vercel.app
    frontend_origin: str = "http://localhost:3000, https://besto-friendo.vercel.app"

    # groq | (más adelante openai, etc.). La key NUNCA va al frontend.
    ai_provider: str = "groq"
    groq_api_key: str = ""
    groq_stt_model: str = "whisper-large-v3"
    groq_chat_model: str = "openai/gpt-oss-120b"

    # TTS del modo conversación (api.openai.com). Vacío = Edge. No es la key de Groq.
    openai_api_key: str = ""
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_tts_voice: str = "nova"

    # Sidecar Hermes: solo el modo conversación (tools web). El router unknown va a Groq.
    hermes_api_url: str = ""
    hermes_api_key: str = ""

    # Nombre Cast (substring). Vacío = primer Chromecast / el que parezca TV.
    tv_cast_name: str = ""
    # IP Cast. Si hay valor, no hace mDNS en cada encendido/apagado.
    tv_cast_host: str = ""

    # IP de la PS5 (misma LAN que el backend). Vacío = comandos de Play no van.
    ps5_host: str = ""
    # MAC para magic packet si wakeup de Remote Play no está emparejado.
    ps5_mac: str = ""
    # Perfil pyremoteplay. Vacío = el primero registrado para esa consola.
    ps5_user: str = ""
    # Tras reset: 2 UP, 5 RIGHT (Entradas). La lista recuerda el último: TOP UP al primero, luego DOWN HDMI 1.
    tv_hdmi1_up: int = 2
    tv_hdmi1_right: int = 5
    tv_hdmi1_top: int = 12
    tv_hdmi1_down: int = 5

    # Cuenta de la app MIGo Link (Saunier Duval). Vacío = comandos de calefacción no van.
    migo_email: str = ""
    migo_password: str = ""
    # myPyllant usa sdbg para Saunier Duval / MIGo Link, no el nombre de la marca.
    migo_brand: str = "sdbg"
    migo_country: str = "spain"

    # Portero :7999. Mismo valor que BACKEND_WAKE_KEY en Vercel. Nunca NEXT_PUBLIC_.
    boot_secret: str = ""


class _LiveSettings:
    """Relee .env si cambia el archivo. CORS se actualiza si uvicorn --reload ve env_reload.py."""

    def __init__(self) -> None:
        self._inner: Optional[Settings] = None
        self._mtime: Optional[float] = None

    def reload(self) -> Settings:
        self._inner = None
        self._mtime = None
        return self._load()

    def _load(self) -> Settings:
        try:
            mtime = _ENV_PATH.stat().st_mtime
        except OSError:
            mtime = None
        if self._inner is not None and mtime == self._mtime:
            return self._inner
        if self._inner is not None:
            logger.info("Settings recargados path=%s", _ENV_PATH)
        self._inner = Settings()
        self._mtime = mtime
        return self._inner

    def __getattr__(self, name: str) -> Any:
        return getattr(self._load(), name)


settings = _LiveSettings()


async def watch_dotenv(stop: asyncio.Event) -> None:
    """Al guardar .env: recarga settings y toca env_reload.py para el --reload de uvicorn."""
    last: Optional[float] = None
    while not stop.is_set():
        try:
            mtime = _ENV_PATH.stat().st_mtime
        except OSError:
            mtime = None
        if last is not None and mtime != last:
            logger.info("Settings recargados path=%s (guardado .env)", _ENV_PATH)
            settings.reload()
            try:
                _STAMP_PATH.touch()
            except OSError as exc:
                logger.info("No se pudo tocar env_reload.py err=%s", exc)
        last = mtime
        try:
            await asyncio.wait_for(stop.wait(), timeout=0.4)
        except asyncio.TimeoutError:
            continue
