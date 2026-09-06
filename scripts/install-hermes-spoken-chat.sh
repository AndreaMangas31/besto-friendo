#!/usr/bin/env bash
# Instala skill + SOUL del anfitrión en ~/.hermes. El SOUL global pisa el del CLI: hay backup.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL="${ROOT}/backend/app/features/hermes/agent_skills/spoken-chat/SKILL.md"
SOUL="${ROOT}/backend/app/features/hermes/agent_soul/SOUL.md"
DEST_SKILL="${HOME}/.hermes/skills/spoken-chat"
DEST_SOUL="${HOME}/.hermes/SOUL.md"
export PATH="${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

if [[ ! -f "$SKILL" || ! -f "$SOUL" ]]; then
  echo "Falta ${SKILL} o ${SOUL}" >&2
  exit 1
fi

mkdir -p "$DEST_SKILL" "${HOME}/.hermes"
cp "$SKILL" "${DEST_SKILL}/SKILL.md"
echo "Skill spoken-chat en ${DEST_SKILL}"

if [[ -f "$DEST_SOUL" ]] && ! cmp -s "$SOUL" "$DEST_SOUL"; then
  cp "$DEST_SOUL" "${HOME}/.hermes/SOUL.md.bak-besto"
  echo "Backup del SOUL anterior: ~/.hermes/SOUL.md.bak-besto"
fi
cp "$SOUL" "$DEST_SOUL"
echo "SOUL anfitrión en ${DEST_SOUL} (perfil por defecto de Hermes, incluido el API :8642)"

if command -v hermes >/dev/null 2>&1; then
  hermes tools enable web skills --platform api_server || true
  echo "hermes gateway restart  # recarga SOUL y skills"
  hermes gateway restart || true
else
  echo "Sin binario hermes; copia hecha." >&2
fi
echo "Las respuestas las sintetiza Besto (voz Alvaro). Los ‘un momento’ son mp3 locales, no el agente."
