from fastapi import APIRouter

from app.features.tv.models import TvActionResult, TvCastList, TvPairPin
from app.features.tv.service import list_casts, pair_finish, pair_start

router = APIRouter()


@router.get("/tv/casts", response_model=TvCastList)
def get_casts() -> TvCastList:
    # Escaneo mDNS local. Tarda unos segundos; la tele tiene que estar en la red.
    return list_casts()


@router.post("/tv/pair/start", response_model=TvActionResult)
async def start_pair() -> TvActionResult:
    # La tele enseña un PIN de 6 dígitos. Hay que terminar con /tv/pair/finish.
    return await pair_start()


@router.post("/tv/pair/finish", response_model=TvActionResult)
async def finish_pair(body: TvPairPin) -> TvActionResult:
    return await pair_finish(body.pin)
