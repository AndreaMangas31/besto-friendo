from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings


def _frontend_origins() -> list[str]:
    # Varios clients: Mac en :3000 y el móvil en Vercel. Sin coma extra ni espacios sueltos.
    return [part.strip() for part in settings.frontend_origin.split(",") if part.strip()]


def setup_cors(app: FastAPI) -> None:
    # Si el POST de audio falla en el navegador pero curl funciona, mira Origin.
    # FRONTEND_ORIGIN = local. Regex = cualquier *.vercel.app (el claim cambia el host).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_frontend_origins(),
        allow_origin_regex=r"https://[a-z0-9.-]+\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
