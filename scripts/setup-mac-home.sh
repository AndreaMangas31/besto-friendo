#!/usr/bin/env bash
# Primera vez en un Mac de casa (Mini u otro): venv + chequeos. No copia .env ni arranca ngrok.
# En el Mini, con el repo ya clonado:
#   ./scripts/setup-mac-home.sh
#   # copia backend/.env desde el portátil (scp), ngrok config add-authtoken …
#   # en el portátil: launchctl bootout …  (un solo túnel)
#   ./scripts/start-grok
# Fijo al login: ./scripts/setup-mac-home.sh --launchagent
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="${ROOT}/backend"
LAUNCHAGENT=0

usage() {
  cat <<'EOF'
Uso: ./scripts/setup-mac-home.sh [--launchagent]

Prepara el backend en esta máquina (venv, pip). No toca el túnel del portátil.

  --launchagent  instala el plist (no lo arranca: ngrok reservado = una máquina)

Después: copia backend/.env, ngrok authtoken, para el túnel en el portátil, ./scripts/start-grok
EOF
}

for arg in "$@"; do
  case "$arg" in
    --launchagent) LAUNCHAGENT=1 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "flag desconocido: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

export PATH="${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Falta python3 (xcode-select --install o brew install python)" >&2
  exit 1
fi

if [[ ! -d "${BACKEND}/.venv" ]]; then
  python3 -m venv "${BACKEND}/.venv"
  echo "venv en ${BACKEND}/.venv"
else
  echo "venv ya existía"
fi

# shellcheck source=/dev/null
source "${BACKEND}/.venv/bin/activate"
pip install -q -r "${BACKEND}/requirements.txt"
echo "pip: requirements.txt"

if [[ ! -f "${BACKEND}/.env" ]]; then
  echo "Falta ${BACKEND}/.env — cópialo del portátil (no está en git):" >&2
  echo "  scp USER@PORTATIL:${ROOT}/backend/.env ${BACKEND}/.env" >&2
  echo "  (ajusta USER, host y ruta si en el Mini el clone no es el mismo path)" >&2
else
  echo "backend/.env ok"
fi

chmod +x "${ROOT}/scripts/start-grok" \
  "${ROOT}/scripts/mac-home-api.sh" \
  "${ROOT}/scripts/install-mac-launchagent.sh" \
  "${ROOT}/scripts/setup-mac-home.sh"

if command -v ngrok >/dev/null 2>&1; then
  echo "ngrok: $(command -v ngrok)"
else
  echo "Falta ngrok: brew install ngrok/ngrok/ngrok && ngrok config add-authtoken …" >&2
fi

if ! command -v hermes >/dev/null 2>&1; then
  echo "sin hermes en PATH; el router de casa sigue en Groq. Modo conversación con web: instala Hermes y ./scripts/install-hermes-spoken-chat.sh"
fi

if [[ "$LAUNCHAGENT" -eq 1 ]]; then
  "${ROOT}/scripts/install-mac-launchagent.sh"
  echo "Aún no está activo. Cuando el portátil haya soltado ngrok:"
  echo "  launchctl bootstrap gui/\$(id -u) \${HOME}/Library/LaunchAgents/com.bestofriendo.home-api.plist"
fi

echo
echo "Energía: start-grok usa caffeinate. Opcional una vez (sudo):"
echo "  sudo pmset -c sleep 0 disksleep 0"
echo "Orden: 1) bootout/túnel muerto en el portátil  2) ./scripts/start-grok aquí  3) móvil  4) apagar portátil"
