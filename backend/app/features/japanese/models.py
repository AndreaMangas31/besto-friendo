from typing import List, Literal

from pydantic import BaseModel, Field

Role = Literal["user", "assistant"]
BlockType = Literal["text", "jp"]


class TutorTurn(BaseModel):
    role: Role
    text: str


class JapaneseSegment(BaseModel):
    # Kanji/kana de un trozo y romaji encima (como la captura).
    surface: str
    romaji: str


class ContentBlock(BaseModel):
    type: BlockType
    text: str = ""
    segments: List[JapaneseSegment] = Field(default_factory=list)


class TutorReply(BaseModel):
    speak: str = ""
    blocks: List[ContentBlock] = Field(default_factory=list)
