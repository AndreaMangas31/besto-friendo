import logging

from fastapi import FastAPI

from app.core.cors import setup_cors
from app.features.boot.controller import router as boot_router

# App aparte de main.py. Si el tutor está parado, este proceso sí puede arrancarlo.
_log = logging.getLogger("app.boot")
if not _log.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:     %(message)s"))
    _log.addHandler(_handler)
    _log.setLevel(logging.INFO)
    _log.propagate = False

app = FastAPI(
    title="besto-friendo-boot",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
setup_cors(app)
app.include_router(boot_router)
