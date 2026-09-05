from app.core.config import settings
from app.shared.ai.groq import GroqProvider
from app.shared.ai.provider import AiProvider


class AiNotConfiguredError(Exception):
    """Falta GROQ_API_KEY (o el proveedor no está soportado)."""


def get_ai_provider() -> AiProvider:
    if settings.ai_provider != "groq":
        raise AiNotConfiguredError(
            f"Proveedor de IA no soportado: {settings.ai_provider}"
        )

    if not settings.groq_api_key.strip():
        raise AiNotConfiguredError(
            "Configura GROQ_API_KEY en backend/.env (console.groq.com). "
            "No uses la suscripción de ChatGPT: es otra API."
        )

    return GroqProvider(
        api_key=settings.groq_api_key,
        stt_model=settings.groq_stt_model,
        chat_model=settings.groq_chat_model,
    )
