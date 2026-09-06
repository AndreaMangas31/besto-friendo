# Vacío a propósito: al guardar backend/.env, config.py hace touch() de este .py
# para que uvicorn --reload recargue (no vigila .env: es un dotfile).
