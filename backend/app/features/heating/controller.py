from fastapi import APIRouter

from app.features.heating.models import HeatingStatus
from app.features.heating.service import status

router = APIRouter()


@router.get("/heating/status", response_model=HeatingStatus)
async def get_status() -> HeatingStatus:
    # Login a myVAILLANT; sin MIGO_EMAIL/PASSWORD el service responde ok=False.
    return await status()
