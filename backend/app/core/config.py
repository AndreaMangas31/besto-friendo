from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "besto-friendo"
    # Coma-separados: http://localhost:3000,https://xxx.vercel.app
    frontend_origin: str = "http://localhost:3000, https://besto-friendo.vercel.app"

    # groq | (más adelante openai, etc.). La key NUNCA va al frontend.
    ai_provider: str = "groq"
    groq_api_key: str = ""
    groq_stt_model: str = "whisper-large-v3"
    groq_chat_model: str = "openai/gpt-oss-120b"

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


settings = Settings()
