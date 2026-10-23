# mirror-os

**Actual MagicMirror² for the screen. Hailo AI runs separately in the background.**

A deployment for a Raspberry Pi 5 and repurposed Lululemon Mirror. The display uses the official [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) v2.38.0 release, not a custom dashboard or imitation. The initial layout uses MagicMirror²'s standard clock module: white time, weekday and date in the upper-left corner, with the rest of the screen black. There are no chat boxes, AI status cards, branding, focus inputs or setup panels on the mirror.

## Update the existing Pi deployment

Run in your existing **SSH terminal on the Pi**:

```sh
cd ~/mirror-os
git pull --ff-only
sudo docker compose --progress plain -p mirror-os up -d --build --wait --wait-timeout 120
```

This replaces this project's old dashboard container with actual MagicMirror² and starts a separate background API container. Your existing `.env`, Hailo-Ollama installation, model files, OS and NVMe installation are preserved. The first MagicMirror image build downloads its official source and dependencies and can take several minutes. `--wait-timeout` applies to container readiness, not image download/build time.

The display stays on **Pi port 3000**, so your existing SSH tunnel still works. Leave the Windows tunnel window open:

```powershell
ssh -N -L 127.0.0.1:13300:127.0.0.1:3000 mirror@10.0.0.177
```

Then open **http://127.0.0.1:13300** in the Windows browser. The Pi address above is the address reported in the original setup; use its current address if it changes. When a screen is physically connected to the Pi, a browser there uses **http://127.0.0.1:3000**. Remote SSH alone does not drive a display panel.

## What runs where

| Component | Default Pi address | Role |
| --- | --- | --- |
| MagicMirror² (`dashboard`) | `127.0.0.1:3000` | The mirror screen; clock and date only initially |
| Background API (`backend`) | `127.0.0.1:3001` | Server-side Hailo adapter and optional HA reads; no UI |
| Existing Hailo-Ollama | `127.0.0.1:8000` | Existing native inference service and installed models |

**Migration:** the old custom API routes on port 3000 move to port 3001. Port 3000 now belongs entirely to MagicMirror². The display starts and works independently of Hailo; an offline AI service cannot remove or block the clock.

Your successful Pi test used `qwen2.5-instruct:1.5b`, and that remains the background adapter's default. The background API retains validated chat, bounded history, timeouts, a single in-flight AI request, and optional read-only Home Assistant entity access. It serves no HTML, assets or frontend. Hailo and Home Assistant credentials are not passed to the MagicMirror container.

## Configure the screen

Edit **`magicmirror/config.cjs`** to add standard or custom MagicMirror² modules, then rebuild. Only `clock` is enabled now; no invented weather location, calendar feed or AI module is preconfigured. Edit `magicmirror/custom.css` for screen spacing and type sizes. A black display background supports the mirror/reflection effect; software transparency cannot make an LCD physically transparent.

The shipped configuration uses `TIMEZONE=America/Toronto`, 24-hour time, and no seconds. Existing legacy `.env` settings `MODULES` and `MIRROR_TITLE` are ignored; they do not re-enable the removed custom interface. No settings need changing to migrate an existing default `.env`.

## New install and checks

This repository is public; cloning needs no GitHub login. On an existing 64-bit Pi OS with Docker Engine and Compose:

```sh
git clone https://github.com/adanb13/mirror-os.git
cd mirror-os
sh scripts/deploy.sh
```

The deployment helper expects Docker access for the invoking user. Use the explicit `sudo docker compose` update command above if your Pi requires sudo; create `.env` first with `cp .env.example .env` if it does not exist. Never commit `.env`.

```sh
sudo docker compose -p mirror-os ps
curl -fsS http://127.0.0.1:3000/version
curl -fsS http://127.0.0.1:3001/api/health
```

See [deployment and SSH viewing](docs/deployment.md), [architecture and upstream version](docs/architecture.md), and [validation](docs/validation.md).

Voice and casting remain future background integrations, not installed speech engines or receivers. This project is independent of lululemon, Raspberry Pi, Hailo and the MagicMirror² project. MagicMirror² retains its upstream MIT license and attribution in the built image.
