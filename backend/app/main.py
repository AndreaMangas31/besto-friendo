import logging

from fastapi import FastAPI

from app.core.config import settings
from app.core.cors import setup_cors
from app.features.commands.controller import router as commands_router
from app.features.conversation.controller import router as conversation_router
from app.features.health.controller import router as health_router
from app.features.ps5.controller import router as ps5_router
from app.features.tv.controller import router as tv_router

# Uvicorn no enseña logger.info de app.* sin un handler propio.
_app_log = logging.getLogger("app")
if not _app_log.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:     %(message)s"))
    _app_log.addHandler(_handler)
    _app_log.setLevel(logging.INFO)
    _app_log.propagate = False

app = FastAPI(title=settings.app_name)
setup_cors(app)
app.include_router(health_router)
# Voz entra por POST /commands/dispatch; conversation/turn queda para pruebas.
app.include_router(commands_router)
app.include_router(conversation_router)
app.include_router(tv_router)
app.include_router(ps5_router)
