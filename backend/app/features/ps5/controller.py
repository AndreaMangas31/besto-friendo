from fastapi import APIRouter

from app.features.ps5.models import Ps5Status
from app.features.ps5.service import status

router = APIRouter()


@router.get("/ps5/status", response_model=Ps5Status)
def get_status() -> Ps5Status:
    # UDP a la consola. Reposo con red sigue contestando; apagado total no.
    return status()
