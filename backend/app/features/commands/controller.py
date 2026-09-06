from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile

from app.features.commands.catalog import get_catalog
from app.features.commands.models import CommandCatalogResponse, DispatchResponse
from app.features.commands.service import dispatch

router = APIRouter()


@router.get("/commands/catalog", response_model=CommandCatalogResponse)
def command_catalog() -> CommandCatalogResponse:
    return get_catalog()


@router.post("/commands/dispatch", response_model=DispatchResponse)
async def dispatch_command(
    audio: UploadFile = File(...),
    # Flags de UI: el service decide enable / disable / turno, no el frontend.
    japanese_enabled: str = Form("false"),
    conversation_enabled: str = Form("false"),
    history: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
) -> DispatchResponse:
    jp = japanese_enabled.strip().lower() in {"true", "1", "yes"}
    chat = conversation_enabled.strip().lower() in {"true", "1", "yes"}
    return await dispatch(audio, jp, history, mode, chat)
