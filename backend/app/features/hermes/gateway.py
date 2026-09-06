import logging
from typing import Optional, Sequence

from openai import AsyncOpenAI

from app.core.config import settings
from app.shared.ai.factory import get_ai_provider

logger = logging.getLogger(__name__)


async def complete_groq(messages: Sequence[dict], temperature: float = 0.2) -> str:
    """Router y rewrite: Groq sin tools. Hermes con search se come el timeout."""
    provider = get_ai_provider()
    return await provider.complete(messages, temperature=temperature)


async def complete(
    messages: Sequence[dict],
    temperature: float = 0.4,
    *,
    timeout_sec: Optional[float] = None,
) -> str:
    """Modo conversación: Hermes HTTP si hay URL (tools web); si no, Groq."""
    base = settings.hermes_api_url.strip()
    if base:
        url = base.rstrip("/")
        if not url.endswith("/v1"):
            url = f"{url}/v1"
        logger.info("Hermes chat url=%s messages=%s timeout=%s", url, len(messages), timeout_sec)
        client = AsyncOpenAI(
            api_key=settings.hermes_api_key.strip() or "none",
            base_url=url,
            timeout=timeout_sec or 90.0,
        )
        result = await client.chat.completions.create(
            model="hermes-agent",
            messages=list(messages),
            temperature=temperature,
        )
        return (result.choices[0].message.content or "").strip()

    logger.info("Hermes URL vacía; chat_turn usa Groq (sin web search)")
    return await complete_groq(messages, temperature=temperature)
