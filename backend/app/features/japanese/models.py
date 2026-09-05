from typing import List, Literal

from pydantic import BaseModel, Field

Role = Literal["user", "assistant"]


class TutorTurn(BaseModel):
    role: Role
    text: str


class JapaneseSegment(BaseModel):
    # Texto japonés de un trozo (kanji/kana) y su romaji encima, como en la captura.
    surface: str
    romaji: str


class TutorReply(BaseModel):
    speak: str
    explanation: str = ""
    segments: List[JapaneseSegment] = Field(default_factory=list)
