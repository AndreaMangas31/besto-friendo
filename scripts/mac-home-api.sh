#!/usr/bin/env bash
# Nombre viejo. Usa start-grok.
exec "$(cd "$(dirname "$0")" && pwd)/start-grok" "$@"
