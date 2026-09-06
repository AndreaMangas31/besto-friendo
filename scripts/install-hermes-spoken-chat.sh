#!/usr/bin/env bash
# Copia spoken-chat a ~/.hermes/skills. El sidecar no instala paths locales.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL="${ROOT}/backend/app/features/hermes/agent_skills/spoken-chat/SKILL.md"
DEST="${HOME}/.hermes/skills/spoken-chat"
export PATH="${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

if [[ ! -f "$SKILL" ]]; then
  echo "No está ${SKILL}" >&2
  exit 1
fi

mkdir -p "$DEST"
cp "$SKILL" "${DEST}/SKILL.md"
echo "Skill spoken-chat en ${DEST}"

if command -v hermes >/dev/null 2>&1; then
  # web_search/extract en el API :8642. Casa sigue capada en Python.
  hermes tools enable web skills --platform api_server || true
  echo "Opcional (noticias sin Portal): hermes skills install official/research/duckduckgo-search -y"
  echo "hermes gateway restart  # recarga skills"
else
  echo "Sin binario hermes; copia hecha. Instala Hermes para tools web." >&2
fi
echo "Sin Nous Portal / FIRECRAWL / TAVILY el chat funciona pero sin internet."
