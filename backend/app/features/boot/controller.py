import logging
import secrets

from fastapi import APIRouter, HTTPException, Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.features.boot.models import BootStatus
from app.features.boot.service import main_is_up, proxy_request

logger = logging.getLogger("app.boot")

router = APIRouter()

_BOOT_HEADER = "x-besto-boot"


def _secrets_match(got: str, expected: str) -> bool:
    # compare_digest en str solo admite ASCII; BOOT_SECRET puede llevar ñ, etc.
    left = got.encode("utf-8")
    right = expected.encode("utf-8")
    if len(left) != len(right):
        secrets.compare_digest(right, right)
        return False
    return secrets.compare_digest(left, right)


def require_boot_secret(request: Request) -> None:
    expected = (settings.boot_secret or "").strip()
    if not expected:
        # Sin secreto el portero sería un API público hacia tele/PS5.
        raise HTTPException(status_code=503, detail="Falta BOOT_SECRET en backend/.env")
    got = (request.headers.get(_BOOT_HEADER) or "").strip()
    if not _secrets_match(got, expected):
        logger.warning("Portero: header X-Besto-Boot ausente o incorrecto")
        raise HTTPException(status_code=401, detail="X-Besto-Boot inválido")


@router.get("/boot/status", response_model=BootStatus)
def boot_status(request: Request) -> BootStatus:
    require_boot_secret(request)
    return BootStatus(main_up=main_is_up())


@router.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
)
async def proxy_all(request: Request, full_path: str) -> Response:
    del full_path
    require_boot_secret(request)
    body = await request.body()
    err, response = proxy_request(request, body)
    if err:
        return JSONResponse({"detail": err}, status_code=503)
    assert response is not None
    return response
