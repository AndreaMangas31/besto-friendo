from typing import List

from pydantic import BaseModel, Field

from app.features.japanese.models import ContentBlock, JapaneseSegment


class HistoryTurn(BaseModel):
    role: str
    text: str


class ConversationTurnResponse(BaseModel):
    user_text: str
    assistant_text: str
    speak: str = ""
    blocks: List[ContentBlock] = Field(default_factory=list)
    # Modo conversación: mp3/wav del backend. El tutor japonés no lo usa.
    audio_mime: str = ""
    audio_base64: str = ""
    # Compat con el cliente anterior (opcional).
    explanation: str = ""
    segments: List[JapaneseSegment] = Field(default_factory=list)


class AudioReceivedResponse(BaseModel):
    received: bool
    filename: str
    content_type: str
    size_bytes: int
