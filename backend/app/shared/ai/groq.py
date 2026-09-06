import logging
from io import BytesIO
from typing import Sequence

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Whisper sin idioma a veces pinta islandés, tamil, etc. El prompt no fuerza un solo idioma.
_STT_PROMPT = (
    "Spanish or English. Home commands: apaga la tele, enciende la tele, "
    "sube el volumen, baja el volumen, enable japanese mode, turn on the TV, "
    "turn off the PS5."
)


def _looks_wrong_stt(text: str) -> bool:
    """Casa: castellano/inglés. Tamil/árabe/islandés = Whisper se fue de idioma."""

    if any(char in text for char in "ðÐþÞ"):
        return True
    for char in text:
        code = ord(char)
        # Devanagari–Malayalam (incluye tamil), árabe, hebreo, hangul, thai.
        if (
            0x0900 <= code <= 0x0DFF
            or 0x0600 <= code <= 0x06FF
            or 0x0590 <= code <= 0x05FF
            or 0xAC00 <= code <= 0xD7AF
            or 0x0E00 <= code <= 0x0E7F
        ):
            return True
    return False


class GroqProvider:
    def __init__(self, api_key: str, stt_model: str, chat_model: str) -> None:
        self._stt_model = stt_model
        self._chat_model = chat_model
        self._client = AsyncOpenAI(api_key=api_key, base_url=GROQ_BASE_URL)

    async def _transcribe_once(
        self,
        audio: bytes,
        filename: str,
        content_type: str,
        language: str | None,
    ) -> str:
        kwargs: dict = {
            "model": self._stt_model,
            "file": (filename, BytesIO(audio), content_type),
            "prompt": _STT_PROMPT,
        }
        if language:
            kwargs["language"] = language
        result = await self._client.audio.transcriptions.create(**kwargs)
        return (result.text or "").strip()

    async def transcribe(
        self,
        audio: bytes,
        filename: str,
        content_type: str,
        retry_es: bool = True,
    ) -> str:
        logger.info(
            "Groq STT model=%s filename=%s bytes=%s content_type=%s retry_es=%s",
            self._stt_model,
            filename,
            len(audio),
            content_type,
            retry_es,
        )
        # Primer pase sin language: castellano, inglés o japonés del tutor.
        text = await self._transcribe_once(audio, filename, content_type, None)
        if retry_es and text and _looks_wrong_stt(text):
            retry = await self._transcribe_once(audio, filename, content_type, "es")
            logger.info(
                "Groq STT retry_es from=%s to=%s",
                text[:80],
                retry[:80],
            )
            return retry or text
        return text

    async def complete(
        self,
        messages: Sequence[dict],
        temperature: float = 0.7,
    ) -> str:
        logger.info(
            "Groq chat model=%s messages=%s temperature=%s",
            self._chat_model,
            len(messages),
            temperature,
        )
        # gpt-oss en Groq admite reasoning_effort. Sin stream: el turno
        # espera el JSON completo (user_text + assistant_text).
        result = await self._client.chat.completions.create(
            model=self._chat_model,
            messages=list(messages),
            temperature=temperature,
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
