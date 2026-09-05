from fastapi import FastAPI

from app.core.config import settings
from app.core.cors import setup_cors
from app.features.conversation.controller import router as conversation_router
from app.features.health.controller import router as health_router

app = FastAPI(title=settings.app_name)
setup_cors(app)
app.include_router(health_router)
# POST /conversation/audio. Si al arrancar pide python-multipart: pip install -r requirements.txt y reinicia uvicorn.
app.include_router(conversation_router)
