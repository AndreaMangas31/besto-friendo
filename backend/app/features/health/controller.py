from fastapi import APIRouter

from app.features.health.models import HealthResponse
from app.features.health.service import get_health

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return get_health()
