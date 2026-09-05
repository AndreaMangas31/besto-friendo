from fastapi import APIRouter

from app.features.tv.models import TvCastList
from app.features.tv.service import list_casts

router = APIRouter()


@router.get("/tv/casts", response_model=TvCastList)
def get_casts() -> TvCastList:
    # Escaneo mDNS local. Tarda unos segundos; la tele tiene que estar en la red.
    return list_casts()
