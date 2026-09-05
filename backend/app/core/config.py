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


settings = Settings()
