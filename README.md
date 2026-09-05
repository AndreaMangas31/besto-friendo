# Besto Friendo

Tutor de conversación en japonés. Monorepo con frontend Next.js y backend FastAPI.

## Fase 1

Comprobar que el frontend y el backend se comunican (`GET /health`).

## Arquitectura

- `frontend/src/app` — rutas de Next.js (sin lógica de negocio)
- `frontend/src/features/<feature>` — `views`, `components`, `hooks`, `types`
- `frontend/src/shared` — código reutilizable (`api`, `config`, `components`, `hooks`, `utils`, `types`)
- `backend/app/main.py` — ensambla la app
- `backend/app/core` — settings y CORS
- `backend/app/features/<feature>` — `controller`, `service`, `models`
- `backend/app/shared` — helpers entre features

Una feature no importa otra. Si algo se comparte, sube a `shared`.

## Arranque local

Necesitas dos terminales.

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Comprueba: http://localhost:8000/health

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm dev
```

Abre: http://localhost:3000

Si el backend está parado, la página debe mostrar un error claro de conexión.

## Fase 2

Grabar audio en el navegador y enviarlo a `POST /conversation/audio`.

## Fase 3

Turno con IA: `POST /conversation/turn` (Groq Whisper + chat). La respuesta se lee en el navegador (`ja-JP`).

1. Crea una API key en https://console.groq.com/keys (gratis; no es ChatGPT).
2. En `backend/.env`: `GROQ_API_KEY=gsk_...`
3. Reinicia uvicorn e instala deps si hace falta: `pip install -r requirements.txt`

Si falta la key, el backend responde 503.
