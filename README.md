# Besto Friendo

Asistente de voz en casa (tele, PS5, calefacción) y tutor de japonés. Monorepo: frontend Next.js, backend FastAPI. Las API keys de IA solo viven en el backend.

## Arquitectura

Mapa del turno de voz (orbe → Whisper → regex → Hermes si hace falta → tele/tutor/chat) y diagramas: [docs/arquitectura.md](docs/arquitectura.md).

- `frontend/src/app` — rutas de Next.js (sin negocio). El navegador habla con `/bf-api/...`, no con `:8000` a pelo.
- `frontend/src/features/<feature>` — `views`, `components`, `hooks`, `types`. La vista orquesta la UI; el hook hace fetch o APIs del navegador.
- `frontend/src/shared` — `api`, `config`, `components`, `hooks`, `utils`, `types`.
- `backend/app/main.py` — ensambla routers y CORS. Sin lógica de dominio.
- `backend/app/core` — settings y arranque.
- `backend/app/features/<feature>` — `controller`, `service`, `models`. El controller no llama a Groq ni escribe prompts.
- `backend/app/shared` — helpers entre features (`shared/ai`: Groq Whisper + chat).

Una feature no importa otra, **salvo** `commands`: orquesta voz y llama a `tv`, `ps5`, `heating`, `conversation` y `hermes`. Si hace falta compartir más, sube a `shared`.

### Qué hace cada feature (backend)

| Feature | Rol |
| --- | --- |
| `commands` | `POST /commands/dispatch`: audio → STT → comando. Es lo que usa el orbe. |
| `conversation` | STT helper y `POST /conversation/turn` (pruebas / tutor). |
| `japanese` | Cerebro del tutor (prompts y parseo). Groq, no Hermes. |
| `tv` / `ps5` / `heating` | Dispositivos. Regex + estos servicios, **nunca** tools de un agente. |
| `hermes` | Router de texto cuando el regex no pilla comando. Sidecar `:8642` si hay `HERMES_API_URL`; si no, Groq. |
| `health` / `boot` | Healthcheck y portero (`:7999`) para despertar el API. |

`hermes` no tiene controller HTTP: lo llama `commands`.

### Voz (orbe)

```
mic → POST /commands/dispatch
     → Groq Whisper (castellano/inglés; si el STT sale en tamil/islandés/…, segundo pase language=es)
     → regex (catálogo de casa)
     → si unknown: router Hermes (skills = catálogo; agentes: hoy solo chat)
     → comando capado → tv / ps5 / heating
     → japanese_turn → Groq tutor
     → agent_turn → reply del chat
```

El hint «Te oí» (`understood`) es una frase corta por Groq, **en paralelo** con la tele/PS5 (máx. 3 s desde que hay comando). Si no llega, el título del catálogo. No pasa por el sidecar Hermes (tools se comían el timeout del front).

Casa y chat no van por el mismo camino: tele/Play/calefacción están capadas en Python. Hermes solo elige id de skill o `chat` cuando no hay match.

Agentes en [`backend/app/features/hermes/registry.py`](backend/app/features/hermes/registry.py): `chat` activo; `web`, `japanese`, `discord` planned.

## Arranque local

Necesitas dos terminales.

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

En `backend/.env`: `GROQ_API_KEY=gsk_...` (https://console.groq.com/keys). Si falta, el backend responde 503.

Opcional — router Hermes en vez de Groq para `unknown`:

- `~/.hermes/.env`: `API_SERVER_ENABLED=true` y `API_SERVER_KEY`
- `backend/.env`: `HERMES_API_URL=http://127.0.0.1:8642` y `HERMES_API_KEY` igual que esa key
- `hermes gateway restart` (un solo proceso en `:8642`; no lances un segundo `hermes gateway`)

```bash
uvicorn app.main:app --reload --port 8000
```

Comprueba: http://localhost:8000/health

`--reload` recarga código; un cambio en `.env` pide reiniciar uvicorn.

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
- **Móvil / Vercel**: el JS pide `/bf-api` a `besto-friendo.vercel.app`. Secrets: `BACKEND_URL` (ngrok), `BACKEND_WAKE_KEY` (igual que `BOOT_SECRET` del Mac) y `GATE_PASSWORD` (PIN de 6 dígitos; no `NEXT_PUBLIC_`). El Route Handler añade `X-Besto-Boot` solo si el token del teléfono es válido. Nada de eso va al bundle.

En local, reinicia `pnpm dev` si cambias `.env.local`.

### Móvil: `start-grok`

Un comando: portero (`:7999`) + Hermes API (`:8642`, si está instalado) + túnel ngrok. El API `:8000` lo enciende el portero al primer uso. Mac despierto.

```bash
cd /Users/andream31/real-projects/besto-friendo
./scripts/start-grok
```

Deja esa terminal abierta. En el teléfono: [https://besto-friendo.vercel.app](https://besto-friendo.vercel.app).

Vercel Secrets: `BACKEND_URL=https://pug-stump-approve.ngrok-free.dev`, `BACKEND_WAKE_KEY` = `BOOT_SECRET`, y `GATE_PASSWORD` (PIN de 6 dígitos, puede ser distinta de `BOOT_SECRET`). Redeploy si cambias el front o un Secret.

Al iniciar sesión (opcional):

```bash
./scripts/install-mac-launchagent.sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.bestofriendo.home-api.plist
```

Esquema y cada paso en palabras simples: [docs/movil-y-portero.md](docs/movil-y-portero.md).
