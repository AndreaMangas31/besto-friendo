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

El navegador **nunca** llama a `:8000` a pelo. Pide `/bf-api/...` al mismo Next ([`frontend/src/app/bf-api/[...path]/route.ts`](frontend/src/app/bf-api/[...path]/route.ts)).

- **Local** (`pnpm dev`): `BACKEND_URL=http://localhost:8000` en `.env.local`, **sin** `BACKEND_WAKE_KEY`. Mac → Next :3000 → uvicorn :8000.
- **Móvil / Vercel**: el JS pide `/bf-api` a `besto-friendo.vercel.app`. Secrets: `BACKEND_URL` (ngrok) y `BACKEND_WAKE_KEY` (igual que `BOOT_SECRET` del Mac). El Route Handler añade `X-Besto-Boot`. Nada de eso va al bundle.

En local, reinicia `pnpm dev` si cambias `.env.local`.

### Móvil: `start-grok`

Un comando: portero (`:7999`) + túnel ngrok. El tutor `:8000` lo enciende el portero al primer uso. Mac despierto.

```bash
cd /Users/andream31/real-projects/besto-friendo
./scripts/start-grok
```

Deja esa terminal abierta. En el teléfono: [https://besto-friendo.vercel.app](https://besto-friendo.vercel.app).

Vercel Secrets: `BACKEND_URL=https://pug-stump-approve.ngrok-free.dev` y `BACKEND_WAKE_KEY` = `BOOT_SECRET`. Redeploy si cambias el front.

Al iniciar sesión (opcional):

```bash
./scripts/install-mac-launchagent.sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.bestofriendo.home-api.plist
```

Esquema y cada paso en palabras simples: [docs/movil-y-portero.md](docs/movil-y-portero.md).

## Fase 2

Grabar audio en el navegador y enviarlo a `POST /conversation/audio`.

## Fase 3

Turno con IA: `POST /conversation/turn` (Groq Whisper + chat). La respuesta se lee en el navegador (`ja-JP`).

1. Crea una API key en https://console.groq.com/keys (gratis; no es ChatGPT).
2. En `backend/.env`: `GROQ_API_KEY=gsk_...`
3. Reinicia uvicorn e instala deps si hace falta: `pip install -r requirements.txt`

Si falta la key, el backend responde 503.
