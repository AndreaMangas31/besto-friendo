#!/usr/bin/env bash
# launchd: portero FastAPI :7999 + ngrok fijo. El tutor :8000 arranca en la primera petición.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="${ROOT}/backend"
LOGDIR="${HOME}/Library/Logs/besto-friendo"
NGROK_URL="https://pug-stump-approve.ngrok-free.dev"
mkdir -p "$LOGDIR"

if ! lsof -nP -iTCP:7999 -sTCP:LISTEN >/dev/null 2>&1; then
  # shellcheck source=/dev/null
  source "${BACKEND}/.venv/bin/activate"
  cd "$BACKEND"
  nohup uvicorn app.boot:app --host 127.0.0.1 --port 7999 \
    >>"${LOGDIR}/boot.log" 2>&1 &
  echo "boot portero en :7999 pid $!"
else
  echo "boot :7999 ya escuchaba; no lanzo otro"
fi

for _ in $(seq 1 40); do
  code="$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:7999/boot/status" || echo 000)"
  # 401 = portero vivo (pide secreto). 000 = aún no escucha.
  if [[ "$code" == "401" || "$code" == "503" || "$code" == "200" ]]; then
    break
  fi
  sleep 0.5
done

if command -v ngrok >/dev/null 2>&1; then
  _ngrok_cfg="${HOME}/Library/Application Support/ngrok/ngrok.yml"
  [[ -f "${HOME}/.config/ngrok/ngrok.yml" ]] && _ngrok_cfg="${HOME}/.config/ngrok/ngrok.yml"
  if [[ -f "$_ngrok_cfg" ]] && grep -q "authtoken:" "$_ngrok_cfg" 2>/dev/null; then
    exec ngrok http 7999 --url "$NGROK_URL"
  fi
fi

if [[ -f "${HOME}/.cloudflared/config.yml" ]]; then
  exec cloudflared tunnel run
fi

exec cloudflared tunnel --url "http://127.0.0.1:7999"
