from fastapi import APIRouter, File, UploadFile

from app.features.conversation.models import AudioReceivedResponse
from app.features.conversation.service import receive_audio

router = APIRouter()


@router.post("/conversation/audio", response_model=AudioReceivedResponse)
async def upload_audio(
    # Campo multipart "audio". 422 = nombre distinto o falta python-multipart.
    audio: UploadFile = File(...),
) -> AudioReceivedResponse:
    return await receive_audio(audio)
