from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile

from app.features.commands.models import DispatchResponse
from app.features.commands.service import dispatch

router = APIRouter()


@router.post("/commands/dispatch", response_model=DispatchResponse)
async def dispatch_command(
    audio: UploadFile = File(...),
    # Flag de UI: el service decide enable / disable / modo / turno, no el frontend.
    japanese_enabled: str = Form("false"),
    history: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
) -> DispatchResponse:
    enabled = japanese_enabled.strip().lower() in {"true", "1", "yes"}
    return await dispatch(audio, enabled, history, mode)
