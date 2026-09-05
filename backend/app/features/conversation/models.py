from typing import List

from pydantic import BaseModel


class HistoryTurn(BaseModel):
    role: str
    text: str


class ConversationTurnResponse(BaseModel):
    user_text: str
    assistant_text: str


class AudioReceivedResponse(BaseModel):
    received: bool
    filename: str
    content_type: str
    size_bytes: int
