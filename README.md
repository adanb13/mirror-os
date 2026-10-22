# mirror-os

A custom, modular dashboard for a Raspberry Pi 5 driving a repurposed Lululemon Mirror display. This is an application, not a replacement operating-system image. It runs on the existing 64-bit Pi installation and reuses the local Hailo-Ollama server.

## Run on the Pi

Open a terminal **on the Pi**. No SSH connection is assumed. You need Git, Docker Engine with Compose, and permission to access Docker. This repository is public; no GitHub sign-in is required to clone it.

```sh
git clone https://github.com/adanb13/mirror-os.git
cd mirror-os
sh scripts/deploy.sh
```

Open **http://localhost:3000** in the Pi's browser. AI uses the existing **http://127.0.0.1:8000** service with **qwen2.5-instruct:1.5b**, matching the successful request from the original setup. The dashboard works while AI is offline. The first image build needs internet access; normal dashboard and AI operation use no external assets or cloud AI.

The deployment script creates `.env` only when it does not exist, validates Compose, then builds and starts this project's container. It does not format or mount disks, edit boot settings, install Hailo drivers, download models, or alter other Compose projects. Application files and Docker's ordinary image/cache data consume space on your existing filesystem.

## What works

- Portrait-friendly black dashboard, local clock/date and configurable timezone.
- Focus note saved in this browser's local storage.
- Text chat through a server-side Hailo-Ollama adapter, short-answer system prompt, bounded conversation history, elapsed-time display, timeouts and one in-flight AI request.
- AI status/model listing, with clear offline behavior.
- Optional **read-only** Home Assistant entity cards; credentials stay on the server.
- Configurable module order through `.env` and independent UI/backend modules.

Voice and casting are explicitly **planned extension points**. No microphone capture, wake word, speech engine, AirPlay/Chromecast receiver or home-control actions are installed or claimed. See [extension guide](docs/architecture.md).

## Configure

The first deployment copies `.env.example` to `.env`. Edit it and rerun `sh scripts/deploy.sh`. Never commit `.env`.

| Variable | Default / purpose |
| --- | --- |
| `HOST`, `PORT` | `127.0.0.1`, `3000`; Pi-local access |
| `ALLOWED_HOSTS` | Extra permitted browser hostnames/IPs for optional LAN use; prevents DNS rebinding |
| `MIRROR_TITLE` | `Mirror` |
| `TIMEZONE` | `America/Toronto`; an IANA timezone |
| `MODULES` | `clock,notes,assistant,integrations,home-assistant`; reorder or remove |
| `AI_BASE_URL` | `http://127.0.0.1:8000`; existing Hailo endpoint |
| `AI_MODEL` | `qwen2.5-instruct:1.5b`; must match an installed model |
| `AI_TIMEOUT_MS` | `120000`; maximum chat request duration |
| `HA_BASE_URL` | Optional existing Home Assistant URL, e.g. `http://homeassistant.local:8123` |
| `HA_TOKEN` | Optional long-lived Home Assistant access token |
| `HA_ENTITIES` | Comma-separated entity IDs, e.g. `sensor.living_room_temperature,light.living_room` |

The server has no login system. Keep the default loopback binding for a local kiosk. Changing `HOST` to `0.0.0.0` and adding your Pi address to `ALLOWED_HOSTS` deliberately makes chat and configured Home Assistant states accessible to other LAN devices. Do not forward this port to the internet. Chat history is in page memory only, and notes use browser storage; this app does not log prompts or write transcripts.

## Develop without Docker

Node.js 24 or later is required; there are no third-party npm dependencies.

```sh
cp .env.example .env
npm start
# In another terminal:
npm run check
npm test
```

Native startup uses `.env`; Docker receives it through Compose. On Windows/macOS, native startup is the simplest development path; the provided host-network Compose deployment targets Pi Linux.

See [deployment, updates and rollback](docs/deployment.md), [module architecture and roadmap](docs/architecture.md), and [validation](docs/validation.md).

Independent personal project; not affiliated with lululemon, Raspberry Pi or Hailo. No upstream mirror project was forked or modified.
