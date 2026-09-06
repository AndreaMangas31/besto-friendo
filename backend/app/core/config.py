from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "besto-friendo"
    frontend_origin: str = "http://localhost:3000"

    # groq | (más adelante openai, etc.). La key NUNCA va al frontend.
    ai_provider: str = "groq"
    groq_api_key: str = ""
    groq_stt_model: str = "whisper-large-v3-turbo"
    groq_chat_model: str = "openai/gpt-oss-120b"

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


settings = Settings()
