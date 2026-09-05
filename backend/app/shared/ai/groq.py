import logging
from io import BytesIO
from typing import Sequence

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class GroqProvider:
    def __init__(self, api_key: str, stt_model: str, chat_model: str) -> None:
        self._stt_model = stt_model
        self._chat_model = chat_model
        self._client = AsyncOpenAI(api_key=api_key, base_url=GROQ_BASE_URL)

    async def transcribe(
        self,
        audio: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        logger.info(
            "Groq STT model=%s filename=%s bytes=%s content_type=%s",
            self._stt_model,
            filename,
            len(audio),
            content_type,
        )
        # No fijes language=ja: si habla castellano/inglés, Whisper lo forzaría a japonés.
        result = await self._client.audio.transcriptions.create(
            model=self._stt_model,
            file=(filename, BytesIO(audio), content_type),
        )
        return (result.text or "").strip()

    async def complete(self, messages: Sequence[dict]) -> str:
        logger.info(
            "Groq chat model=%s messages=%s",
            self._chat_model,
            len(messages),
        )
        # gpt-oss en Groq admite reasoning_effort. Sin stream: el turno
        # espera el JSON completo (user_text + assistant_text).
        result = await self._client.chat.completions.create(
            model=self._chat_model,
            messages=list(messages),
            temperature=0.7,
            max_completion_tokens=2048,
            extra_body={"reasoning_effort": "medium"},
        )
        choice = result.choices[0].message
        text = (choice.content or "").strip()
        # Algunos modelos de razonamiento dejan el JSON en reasoning y content vacío.
        if not text:
            reasoning = getattr(choice, "reasoning", None)
            if isinstance(reasoning, str):
                text = reasoning.strip()
        return text
