from fastapi import FastAPI

from app.core.config import settings
from app.core.cors import setup_cors
from app.features.commands.controller import router as commands_router
from app.features.conversation.controller import router as conversation_router
from app.features.health.controller import router as health_router

app = FastAPI(title=settings.app_name)
setup_cors(app)
app.include_router(health_router)
# Voz entra por POST /commands/dispatch; conversation/turn queda para pruebas.
app.include_router(commands_router)
app.include_router(conversation_router)
