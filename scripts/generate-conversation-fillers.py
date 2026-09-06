#!/usr/bin/env python3
"""Regenera los mp3 de espera con el mismo TTS OpenAI (nova / crío) que el turno."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

from openai import AsyncOpenAI

from app.core.config import settings
from app.features.hermes.tts import OPENAI_TTS_INSTRUCTIONS

OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "conversation-fillers"

CLIPS = {
    "hola.mp3": "Hola. ¿Qué necesitas?",
    "un-momento.mp3": "Un momentito, jajaja.",
    "voy-a-mirarlo.mp3": "Voy a mirarlo, jaja.",
    "un-segundo.mp3": "Un segundito, porfa, jajaja.",
    "a-ver.mp3": "A ver… jajaja.",
    "un-momento-porfa.mp3": "Un momento, porfa, jaja.",
}


async def main() -> None:
    key = settings.openai_api_key.strip()
    if not key:
        raise SystemExit("Falta OPENAI_API_KEY en backend/.env")
    model = settings.openai_tts_model.strip() or "gpt-4o-mini-tts"
    voice = settings.openai_tts_voice.strip() or "nova"
    client = AsyncOpenAI(api_key=key, timeout=30.0)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in CLIPS.items():
        response = await client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            instructions=OPENAI_TTS_INSTRUCTIONS,
            response_format="mp3",
        )
        path = OUT / name
        path.write_bytes(response.content)
        print(f"{path} voice={voice} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    asyncio.run(main())
