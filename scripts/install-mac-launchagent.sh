#!/usr/bin/env bash
# Copia el LaunchAgent. No lo arranca ahora: si ya hay un quick tunnel vivo, otro le cambiaría la URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/scripts/com.bestofriendo.home-api.plist"
DEST="${HOME}/Library/LaunchAgents/com.bestofriendo.home-api.plist"
LOGDIR="${HOME}/Library/Logs/besto-friendo"

mkdir -p "${HOME}/Library/LaunchAgents" "$LOGDIR"
chmod +x "${ROOT}/scripts/start-grok" "${ROOT}/scripts/mac-home-api.sh" \
  "${ROOT}/scripts/install-mac-launchagent.sh" "${ROOT}/scripts/setup-mac-home.sh"

sed -e "s|__ROOT__|${ROOT}|g" -e "s|__HOME__|${HOME}|g" "$SRC" >"$DEST"

echo "LaunchAgent en ${DEST}"
echo "Actívalo (siguiente login o ahora, recicla el túnel):"
echo "  launchctl bootstrap gui/\$(id -u) ${DEST}"
echo "Quitar:"
echo "  launchctl bootout gui/\$(id -u)/com.bestofriendo.home-api"
