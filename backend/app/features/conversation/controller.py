from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile

from app.features.conversation.models import (
    AudioReceivedResponse,
    ConversationTurnResponse,
)
from app.features.conversation.service import receive_audio, run_turn

router = APIRouter()


@router.post("/conversation/audio", response_model=AudioReceivedResponse)
async def upload_audio(
    audio: UploadFile = File(...),
) -> AudioReceivedResponse:
    return await receive_audio(audio)


@router.post("/conversation/turn", response_model=ConversationTurnResponse)
async def conversation_turn(
    audio: UploadFile = File(...),
    history: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
) -> ConversationTurnResponse:
    return await run_turn(audio, history, mode)
