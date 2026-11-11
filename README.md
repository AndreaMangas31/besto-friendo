# Besto Friendo

Asistente de voz en casa (tele, PS5, calefacción) y tutor de japonés. Monorepo: frontend Next.js y backend FastAPI. Las API keys de IA solo viven en el backend.

Despliegue del front: [besto-friendo.vercel.app](https://besto-friendo.vercel.app)

## Qué hace

- Un orbe en el navegador captura la voz y la envía a `POST /commands/dispatch`.
- Groq Whisper transcribe (castellano/inglés; si el STT sale en un idioma inesperado, hay un segundo pase con `language=es`).
- Los mandos de casa (tele, Play, calefacción) se resuelven con un catálogo en regex y servicios Python, no con tools de un agente.
- Si el comando no encaja, un router Groq elige skill o chat. El tutor de japonés va por Groq. El modo conversación puede usar un sidecar Hermes (con búsqueda web) o Groq sin internet.
- El hint «Te oí» se genera en paralelo (máx. 3 s). La voz del chat usa OpenAI TTS si hay clave; si no, Edge.
- En el móvil / Vercel hay una pantalla de PIN (`GATE_PASSWORD`) y un portero en el Mac (`:7999`) para despertar el API.

Mapa del turno de voz y diagramas: [docs/arquitectura.md](docs/arquitectura.md). Cómo se llega desde el teléfono: [docs/movil-y-portero.md](docs/movil-y-portero.md).

### Qué hace cada feature (backend)

| Feature | Rol |
| --- | --- |
| `commands` | `POST /commands/dispatch`: audio → STT → comando. Es lo que usa el orbe. |
| `conversation` | STT helper y `POST /conversation/turn` (pruebas / tutor). |
| `japanese` | Cerebro del tutor (prompts y parseo). Groq, no Hermes. |
| `tv` / `ps5` / `heating` | Dispositivos. Regex + estos servicios, **nunca** tools de un agente. |
| `hermes` | Router `unknown` (Groq, sin tools) y modo conversación (`chat_turn` → sidecar `:8642` con web search, o Groq). |
| `health` / `boot` | Healthcheck y portero (`:7999`) para despertar el API. |

`hermes` no tiene controller HTTP: lo llama `commands`. Agentes en `backend/app/features/hermes/registry.py`: `chat` activo; `web`, `japanese`, `discord` planned.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 16.3.4, React 19.2.8, Tailwind CSS 4, lucide-react. Gestor: pnpm 10.20.0 |
| Backend | FastAPI, Uvicorn, pydantic-settings, openai, pychromecast, androidtvremote2, myPyllant, pyremoteplay, edge-tts |
| IA | Groq (STT Whisper y chat; modelos por env). TTS opcional con OpenAI; si no, Edge. Sidecar Hermes opcional en `:8642` |

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

Rellena `backend/.env` (ver tabla más abajo). Si falta `GROQ_API_KEY`, el backend responde 503.

Opcional — modo conversación con internet (sidecar Hermes):

- En `~/.hermes/.env`: `API_SERVER_ENABLED=true` y `API_SERVER_KEY`
- En `backend/.env`: `HERMES_API_URL=http://127.0.0.1:8642` y `HERMES_API_KEY` igual que esa key
- Toolset **web** (`web_search`, `web_extract`) en el API server. Sin terminal ni archivos. Nous Portal (`hermes setup --portal`) o keys tipo `FIRECRAWL` / `TAVILY`.
- Skill + SOUL del anfitrión: `./scripts/install-hermes-spoken-chat.sh` (copia skill y `SOUL.md` a `~/.hermes`; el SOUL anterior queda en `SOUL.md.bak-besto`)
- El audio de cada **respuesta** lo manda el backend: `OPENAI_API_KEY` → `gpt-4o-mini-tts` (voz configurada con `OPENAI_TTS_VOICE`); si falta o falla, Edge. Los “un momento / a ver” son mp3 locales (`scripts/generate-conversation-fillers.py`). El tope de dinero es un hard monthly limit en un proyecto de OpenAI, no una env.
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

El navegador **nunca** llama a `:8000` a pelo. Pide `/bf-api/...` al mismo Next (`frontend/src/app/bf-api/[...path]/route.ts`).

- **Local** (`pnpm dev`): `BACKEND_URL=http://localhost:8000` en `.env.local`, **sin** `BACKEND_WAKE_KEY`. Mac → Next :3000 → uvicorn :8000.
- **Móvil / Vercel**: el JS pide `/bf-api` a `besto-friendo.vercel.app`. Secrets de Vercel: `BACKEND_URL` (túnel, p. ej. ngrok), `BACKEND_WAKE_KEY` (igual que `BOOT_SECRET` del Mac) y `GATE_PASSWORD` (PIN de 6 dígitos; no `NEXT_PUBLIC_`). El Route Handler añade `X-Besto-Boot` solo si el token del teléfono es válido. Nada de eso va al bundle.

En local, reinicia `pnpm dev` si cambias `.env.local`.

### Móvil: `start-grok`

Un comando: portero (`:7999`) + Hermes API (`:8642`, si está instalado) + túnel ngrok. El API `:8000` lo enciende el portero al primer uso. Mac despierto.

```bash
./scripts/start-grok
```

Deja esa terminal abierta. En el teléfono: [https://besto-friendo.vercel.app](https://besto-friendo.vercel.app).

Configura en Vercel los secrets `BACKEND_URL` (URL del túnel), `BACKEND_WAKE_KEY` (= `BOOT_SECRET`) y `GATE_PASSWORD`. Haz redeploy si cambias el front o un Secret.

Al iniciar sesión (opcional):

```bash
./scripts/install-mac-launchagent.sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.bestofriendo.home-api.plist
```

### Variables de entorno

Nombres solamente. Copia desde los `.example` y rellena en local o en Vercel; no subas valores al repo.

Backend (`backend/.env`): `FRONTEND_ORIGIN`, `APP_NAME`, `AI_PROVIDER`, `GROQ_API_KEY`, `GROQ_STT_MODEL`, `GROQ_CHAT_MODEL`, `OPENAI_API_KEY`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `HERMES_API_URL`, `HERMES_API_KEY`, `TV_CAST_NAME`, `TV_CAST_HOST`, `PS5_HOST`, `PS5_MAC`, `PS5_USER`, `TV_HDMI1_UP`, `TV_HDMI1_RIGHT`, `TV_HDMI1_TOP`, `TV_HDMI1_DOWN`, `MIGO_EMAIL`, `MIGO_PASSWORD`, `MIGO_BRAND`, `MIGO_COUNTRY`, `BOOT_SECRET`.

Frontend / Vercel: `BACKEND_URL`, `BACKEND_WAKE_KEY`, `GATE_PASSWORD`.

## Estructura

```
besto-friendo/
├── frontend/                 # Next.js
│   ├── src/app/              # rutas (bf-api, gate, página principal)
│   ├── src/features/         # conversation, gate, home
│   └── src/shared/           # api, config, componentes
├── backend/app/
│   ├── main.py               # ensambla routers y CORS
│   ├── core/                 # settings y arranque
│   ├── features/             # commands, conversation, japanese, tv, ps5, heating, hermes, health, boot
│   └── shared/ai/            # Groq Whisper + chat
├── docs/                     # arquitectura.md, movil-y-portero.md
└── scripts/                  # start-grok, install-mac-launchagent, Hermes, fillers
```

Una feature no importa otra, **salvo** `commands`: orquesta voz y llama a `tv`, `ps5`, `heating`, `conversation` y `hermes`. Si hace falta compartir más, sube a `shared`.
