import logging
import re
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.features.japanese.models import (
    ContentBlock,
    JapaneseSegment,
    TutorReply,
    TutorTurn,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a warm Japanese conversation partner who also tutors.

Keep a natural mixed reply: Spanish or English chat PLUS Japanese phrases in the same message (like a bilingual friend). Continue the conversation (react, ask a follow-up). Corrections belong inside that chat, not as the whole message.

Output a single JSON object, no markdown:
{
  "speak": "All Japanese in this turn concatenated, for TTS. No romaji.",
  "blocks": [
    { "type": "text", "text": "Puedes decir " },
    {
      "type": "jp",
      "segments": [
        { "surface": "映画", "romaji": "eiga" },
        { "surface": "が好きですか", "romaji": "ga suki desu ka" }
      ]
    },
    { "type": "text", "text": " si quieres preguntar eso. ¿Y a ti te gusta el cine?" }
  ]
}

Rules:
- Mix languages like a conversation, not a lecture.
- Every Japanese phrase is a "jp" block with Hepburn romaji on each segment. Never leave Japanese only inside a "text" block.
- "text" blocks are Spanish/English (or a short gloss).
- "speak" is required if there is any jp block (what the browser will read aloud).
- Infer level from this message and history. Never mention you are an AI.
"""

MODE_HINTS = {
    "conversar": "Practice mode: keep a natural back-and-forth conversation.",
    "corregir": "Practice mode: still converse, but briefly highlight one correction inside the chat.",
    "ideas": "Practice mode: suggest a topic or phrase they can try next, then keep chatting.",
}


class _LegacyPayload(BaseModel):
    """Por si Groq aún manda explanation + segments en vez de blocks."""

    speak: str = ""
    blocks: List[Dict[str, Any]] = Field(default_factory=list)
    explanation: str = ""
    segments: List[JapaneseSegment] = Field(default_factory=list)


def build_messages(
    history: List[TutorTurn],
    user_text: str,
    mode: Optional[str] = None,
) -> List[dict]:
    messages: List[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    hint = MODE_HINTS.get((mode or "conversar").strip().lower())
    if hint:
        messages.append({"role": "system", "content": hint})

    for turn in history:
        messages.append({"role": turn.role, "content": turn.text})

    messages.append({"role": "user", "content": user_text})
    return messages


def flatten_blocks(blocks: List[ContentBlock]) -> str:
    parts: List[str] = []
    for block in blocks:
        if block.type == "text" and block.text.strip():
            parts.append(block.text.strip())
        elif block.type == "jp":
            surface = "".join(seg.surface for seg in block.segments)
            if surface:
                parts.append(surface)
    return " ".join(parts)


def _extract_json_object(raw: str) -> Optional[str]:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fenced:
        return fenced.group(1)

    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end > start:
        return raw[start : end + 1]
    return None


def _block_from_dict(item: Dict[str, Any]) -> Optional[ContentBlock]:
    kind = item.get("type")
    if kind == "text":
        return ContentBlock(type="text", text=str(item.get("text") or ""))
    if kind == "jp":
        segs = [JapaneseSegment.model_validate(s) for s in item.get("segments") or []]
        return ContentBlock(type="jp", segments=segs)
    return None


def _from_legacy(payload: _LegacyPayload) -> List[ContentBlock]:
    blocks: List[ContentBlock] = []
    if payload.explanation.strip():
        blocks.append(ContentBlock(type="text", text=payload.explanation.strip()))
    if payload.segments:
        blocks.append(ContentBlock(type="jp", segments=payload.segments))
    return blocks


def _jp_surfaces(blocks: List[ContentBlock]) -> str:
    return "".join(
        "".join(seg.surface for seg in block.segments)
        for block in blocks
        if block.type == "jp"
    )


def parse_tutor_reply(raw: str) -> TutorReply:
    blob = _extract_json_object(raw)
    if not blob:
        logger.warning("Tutor sin JSON; burbuja de texto plano. preview=%s", raw[:200])
        return TutorReply(
            speak="",
            blocks=[ContentBlock(type="text", text=raw.strip())],
        )

    try:
        payload = _LegacyPayload.model_validate_json(blob)
    except Exception:
        logger.warning("JSON de tutor inválido; texto plano. preview=%s", blob[:200])
        return TutorReply(
            speak="",
            blocks=[ContentBlock(type="text", text=raw.strip())],
        )

    blocks: List[ContentBlock] = []
    for item in payload.blocks:
        parsed = _block_from_dict(item)
        if parsed:
            blocks.append(parsed)

    if not blocks:
        blocks = _from_legacy(payload)

    speak = (payload.speak or "").strip() or _jp_surfaces(blocks)

    return TutorReply(speak=speak, blocks=blocks)
