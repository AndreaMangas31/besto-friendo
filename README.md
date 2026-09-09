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
| `hermes` | Router `unknown` (Groq, sin tools) y modo conversación (`chat_turn` → sidecar `:8642` con web search, o Groq). |
| `health` / `boot` | Healthcheck y portero (`:7999`) para despertar el API. |

`hermes` no tiene controller HTTP: lo llama `commands`.

### Voz (orbe)

```
mic → POST /commands/dispatch
     → Groq Whisper (castellano/inglés; si el STT sale en tamil/islandés/…, segundo pase language=es)
     → regex (catálogo de casa)
     → si unknown: router Groq (skills = catálogo; agentes: hoy solo chat)
     → comando capado → tv / ps5 / heating
     → japanese_turn → Groq tutor
     → conversation_turn → Hermes chat (web search si hay sidecar)
     → agent_turn → reply one-shot en el hint
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

En `backend/.env`: `GROQ_API_KEY=gsk_...` (https://console.groq.com/keys). Si falta, el backend responde 503. Opcional: `OPENAI_API_KEY` para la voz del chat (`gpt-4o-mini-tts`); sin ella o si OpenAI falla, Edge.

Opcional — modo conversación con internet (sidecar Hermes):

- `~/.hermes/.env`: `API_SERVER_ENABLED=true` y `API_SERVER_KEY`
- `backend/.env`: `HERMES_API_URL=http://127.0.0.1:8642` y `HERMES_API_KEY` igual que esa key
- Toolset **web** (`web_search`, `web_extract`) en el API server. Sin terminal ni archivos. Nous Portal (`hermes setup --portal`) o keys tipo `FIRECRAWL` / `TAVILY`.
- Skill + SOUL del anfitrión: `./scripts/install-hermes-spoken-chat.sh` (copia skill y `SOUL.md` a `~/.hermes`; el SOUL anterior queda en `SOUL.md.bak-besto`)
- El audio de cada **respuesta** lo manda el backend: `OPENAI_API_KEY` → `gpt-4o-mini-tts` (voz `nova`, crío pequeño); si falta o falla (p. ej. 429), Edge. Los “un momento / a ver” son mp3 locales de la misma voz (`scripts/generate-conversation-fillers.py`). El tope de dinero es un **hard monthly limit** en un proyecto de OpenAI, no una env.
- `hermes gateway restart` (un solo proceso en `:8642`)

Sin URL Hermes, el modo conversación habla por Groq **sin** buscar en internet. El router de casa (`unknown`) **siempre** usa Groq.

```bash
uvicorn app.main:app --reload --port 8000
```

Comprueba: http://localhost:8000/health

`--reload` recarga código. Guardar `backend/.env` también recarga el proceso (uvicorn no vigila dotfiles; el backend toca un `.py` de marca).

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

Un comando: portero (`:7999`) + Hermes API (`:8642`, si está instalado) + túnel ngrok. El API `:8000` lo enciende el portero al primer uso. El Mac de casa (portátil o Mini) no puede dormir: `start-grok` lanza `caffeinate`; enchufado no basta si Energía deja suspender.

Máquina nueva (Mini): clone, `./scripts/setup-mac-home.sh`, copia `backend/.env` (no está en git), `ngrok config add-authtoken`. El hostname reservado es de **una** máquina: para el túnel en el portátil **antes** de `start-grok` en el Mini.

```bash
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
