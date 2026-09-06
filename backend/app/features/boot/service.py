import http.client
import logging
import socket
import subprocess
import time
from pathlib import Path
from typing import Mapping, Tuple

from fastapi import Request
from starlette.responses import Response

logger = logging.getLogger("app.boot")

MAIN_PORT = 8000
PROXY_TIMEOUT_SEC = 180
_BACKEND_ROOT = Path(__file__).resolve().parents[3]
_HOP = frozenset(
    {
        "host",
        "connection",
        "transfer-encoding",
        "keep-alive",
        "proxy-connection",
        "te",
        "trailer",
        "upgrade",
        "content-length",
    }
)


def main_is_up() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex(("127.0.0.1", MAIN_PORT)) == 0


def ensure_main() -> None:
    # Si ya hay uvicorn --reload en :8000 (dev), no lanzamos otro.
    if main_is_up():
        return

    log_dir = Path.home() / "Library/Logs/besto-friendo"
    log_dir.mkdir(parents=True, exist_ok=True)
    log = (log_dir / "uvicorn.log").open("ab")
    python = _BACKEND_ROOT / ".venv" / "bin" / "python"
    logger.info("Arrancando uvicorn principal en :%s", MAIN_PORT)
    subprocess.Popen(
        [
            str(python),
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(MAIN_PORT),
        ],
        cwd=str(_BACKEND_ROOT),
        stdout=log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    for _ in range(80):
        if main_is_up():
            return
        time.sleep(0.25)
    raise RuntimeError("uvicorn principal no arrancó en :8000")


def _forward_path(request: Request) -> str:
    path = request.url.path
    query = request.url.query
    if query:
        return f"{path}?{query}"
    return path


def proxy_to_main(request: Request, body: bytes) -> Response:
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in _HOP
    }
    conn = http.client.HTTPConnection("127.0.0.1", MAIN_PORT, timeout=PROXY_TIMEOUT_SEC)
    try:
        conn.request(request.method, _forward_path(request), body=body or None, headers=headers)
        upstream = conn.getresponse()
        payload = upstream.read()
        out_headers: Mapping[str, str] = {
            key: value
            for key, value in upstream.getheaders()
            if key.lower() not in _HOP
        }
        return Response(
            content=payload if request.method != "HEAD" else b"",
            status_code=upstream.status,
            headers=dict(out_headers),
        )
    finally:
        conn.close()


def proxy_request(request: Request, body: bytes) -> Tuple[None, Response] | Tuple[str, None]:
    try:
        ensure_main()
    except Exception as exc:
        logger.warning("No se pudo arrancar el API principal: %s", exc)
        return str(exc), None
    return None, proxy_to_main(request, body)
