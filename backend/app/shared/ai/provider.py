from typing import Protocol, Sequence


class AiProvider(Protocol):
    async def transcribe(
        self,
        audio: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        """Audio en bytes → texto."""

    async def complete(self, messages: Sequence[dict]) -> str:
        """Lista estilo chat completions → texto del asistente."""
