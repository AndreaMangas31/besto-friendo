import logging
import re
from typing import List, Optional

from app.features.japanese.models import TutorReply, TutorTurn

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a warm Japanese conversation tutor.

Language:
- If the learner's latest utterance is Spanish or English, reply in THAT language in "explanation". Put Japanese only in "speak" and "segments" as the phrase to learn. Do not answer only in Japanese.
- If they spoke Japanese, keep the conversation in Japanese (speak + segments). Use "explanation" only for a short Spanish/English gloss when a correction would be unclear.

Level (infer from this message and chat history; no stored profile):
- Spanish/English or very short Japanese → beginner: short sentences, basic vocab, one example.
- Longer/natural Japanese → match their level; brief corrections (their phrase vs natural), then continue.

Output MUST be a single JSON object, no markdown fences, no extra keys:
{
  "speak": "Japanese only, for text-to-speech. No romaji.",
  "explanation": "Spanish or English prose, or empty string if the turn is Japanese-only.",
  "segments": [
    { "surface": "日本語", "romaji": "nihongo" },
    { "surface": "を", "romaji": "o" }
  ]
}

segments: split the Japanese of "speak" into small chunks (words/particles/mora groups) so romaji can sit above each chunk. Hepburn romaji. Never mention you are an AI.
"""


def build_messages(history: List[TutorTurn], user_text: str) -> List[dict]:
    messages: List[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    for turn in history:
        messages.append({"role": turn.role, "content": turn.text})

    messages.append({"role": "user", "content": user_text})
    return messages


def _extract_json_object(raw: str) -> Optional[str]:
    # gpt-oss a veces envuelve el JSON en ``` o añade texto alrededor.
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fenced:
        return fenced.group(1)

    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end > start:
        return raw[start : end + 1]
    return None


def parse_tutor_reply(raw: str) -> TutorReply:
    blob = _extract_json_object(raw)
    if not blob:
        logger.warning("Tutor sin JSON parseable; se muestra texto plano. preview=%s", raw[:200])
        return TutorReply(speak=raw.strip(), explanation="", segments=[])

    try:
        return TutorReply.model_validate_json(blob)
    except Exception:
        logger.warning("JSON de tutor inválido; fallback plano. preview=%s", blob[:200])
        return TutorReply(speak=raw.strip(), explanation="", segments=[])
