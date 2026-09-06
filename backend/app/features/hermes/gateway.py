import logging
from typing import Sequence

from openai import AsyncOpenAI

from app.core.config import settings
from app.shared.ai.factory import get_ai_provider

logger = logging.getLogger(__name__)


async def complete(messages: Sequence[dict], temperature: float = 0.2) -> str:
    """Hermes HTTP si HAY URL; si no, Groq. El dispatch no cambia."""

    base = settings.hermes_api_url.strip()
    if base:
        url = base.rstrip("/")
        if not url.endswith("/v1"):
            url = f"{url}/v1"
        logger.info("Hermes gateway url=%s messages=%s", url, len(messages))
        client = AsyncOpenAI(
            api_key=settings.hermes_api_key.strip() or "none",
            base_url=url,
        )
        result = await client.chat.completions.create(
            model="hermes-agent",
            messages=list(messages),
            temperature=temperature,
        )
        return (result.choices[0].message.content or "").strip()

    provider = get_ai_provider()
    return await provider.complete(messages, temperature=temperature)
