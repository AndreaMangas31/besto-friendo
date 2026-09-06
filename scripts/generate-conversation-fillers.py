#!/usr/bin/env python3
"""Regenera los mp3 de espera (misma voz Edge que el turno)."""
from __future__ import annotations

import asyncio
from pathlib import Path

from edge_tts import Communicate

VOICE = "es-ES-ElviraNeural"
OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "conversation-fillers"

CLIPS = {
    "un-momento.mp3": "Un momento.",
    "voy-a-mirarlo.mp3": "Voy a mirarlo.",
    "un-segundo.mp3": "Un segundo, porfa.",
    "a-ver.mp3": "A ver…",
    "un-momento-porfa.mp3": "Un momento, por favor.",
}


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in CLIPS.items():
        path = OUT / name
        await Communicate(text, VOICE).save(str(path))
        print(f"{path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    asyncio.run(main())
