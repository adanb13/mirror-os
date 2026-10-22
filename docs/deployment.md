# Deploy without replacing the Pi installation

## 1. Check the existing Pi

Use the Pi's local terminal with a keyboard, or any terminal session you already have. The project assumes an already booting **64-bit Linux** installation on the NVMe. Keep that installation, its display configuration, Hailo runtime, models and other containers.

```sh
uname -m
git --version
docker version
docker compose version
df -h .
```

On a 64-bit Pi, `uname -m` should report `aarch64`. Allow space for the source, Node image and Docker build cache. If Git is missing, install it with your distribution's package manager. If Docker/Compose are missing, follow [Docker's Debian installation instructions](https://docs.docker.com/engine/install/debian/) for your existing distribution and architecture; do not reinstall Raspberry Pi OS. Raspberry Pi OS is Debian based; use the matching Debian release and `arm64` packages. No installer is silently run by this project.

Your user must be able to run `docker info`. If Docker reports permission denied, use your existing administrator-approved Docker access setup or the [official post-install instructions](https://docs.docker.com/engine/install/linux-postinstall/). Docker group membership grants powerful host access. As an alternative, run the displayed Compose commands with `sudo`; keep the repository and `.env` owned by your normal user.

## 2. Clone the public repository

The repository belongs to **adanb13** and is public. No GitHub account, token, or SSH key is needed for HTTPS cloning:

```sh
git clone https://github.com/adanb13/mirror-os.git
cd mirror-os
```

A local directory named `mirror-os` causes `git clone` to stop; inspect it rather than deleting or overwriting it. If you already cloned this repository successfully, run `git pull --ff-only` from its directory instead.

## 3. Start the dashboard

```sh
sh scripts/deploy.sh
```

This creates a new Compose project named `mirror-os` with one dashboard container. It uses Linux host networking so a Hailo server bound to the Pi's loopback interface remains reachable. The application listens on `127.0.0.1:3000` by default. There are no device mounts, privileged mode, host filesystem mounts or Docker socket mounts.

If port 3000 is already used, edit `PORT` in `.env`, rerun the deployment script and use the chosen port in the browser. Do not stop unrelated containers to free the port.

```sh
docker compose -p mirror-os ps
curl -fsS http://127.0.0.1:3000/api/health
```

The container restarts with Docker after a reboot. The health check checks the dashboard, independently of Hailo availability.

## 4. Reuse the existing Hailo-Ollama installation

The earlier Pi session successfully used this exact request. Verify it still works before troubleshooting the dashboard:

```sh
curl -fsS http://127.0.0.1:8000/api/tags
curl -fsS http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5-instruct:1.5b","messages":[{"role":"user","content":"Say hello in one sentence."}],"stream":false}'
```

If the installed model name differs, copy its exact name from `/api/tags` into `AI_MODEL` in `.env`. The adapter uses `stream:false`, so the browser receives the completed answer and shows an elapsed timer while waiting. It does not promise to remove the original model latency. One request at a time avoids competing mirror requests; requests from other applications can still compete for Hailo. Short questions and short history help. Cold model loading may make the first answer slower.

If this check fails, inspect the existing Hailo service or container you already installed. This repository does not launch a second Hailo server, replace its packages, claim Hailo-8 supports these LLMs, or pull incompatible Ollama GGUF files. Hailo's current GenAI documentation lists Hailo-10H as a prerequisite; preserve the working hardware/runtime combination. See [Hailo's usage guide](https://github.com/hailo-ai/hailo_model_zoo_genai/blob/main/docs/USAGE.rst).

## 5. Display it on the Mirror

Open `http://localhost:3000` in the Pi's browser. Set the display to portrait using your existing desktop display settings if necessary. This app does not change HDMI timings or display rotation. A working connection from the Pi to the Mirror panel/controller is a hardware prerequisite; the original Mirror computer is not configured by this project.

For a full-screen kiosk, run whichever Chromium executable your Pi already has:

```sh
chromium --kiosk --no-first-run http://localhost:3000
# Some installations call the executable chromium-browser instead.
```

Use Alt+F4 to exit. If you want it to start at desktop login, add that command through the desktop's Startup Applications settings after testing it manually. This requires a graphical desktop session; a headless OS does not acquire one from the container. Touchscreen input is optional; keyboard input or a future voice module is needed for chat.

## Optional Home Assistant

Use an existing Home Assistant instance. Create a long-lived access token in its user profile and put its URL, token, and up to 20 entity IDs in `.env`. Keep `.env` readable only by your user (`chmod 600 .env`). Rerun the deployment script. The backend reads each configured entity every 30 seconds while the page is open. It returns only its name, state and unit, and never sends the token to the browser. Missing entities, expired tokens and network failures produce an unavailable state. The integration does not run automations or send device commands.

API reference: [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/).

## Updates, stop and rollback

From this repository's directory:

```sh
git status --short
git pull --ff-only
sh scripts/deploy.sh
docker compose -p mirror-os logs --tail=100 dashboard
```

Commit or back up your own source edits before pulling. `.env` is ignored and is preserved. Browser focus notes are separate from the repository.

Stop and remove only this project's container:

```sh
docker compose -p mirror-os down
```

To roll back, obtain the known-good commit from `git log`, then use `git switch --detach COMMIT_SHA` and rerun the deployment script. Return to `main` with `git switch main`. Inspect local changes first; do not use a hard reset. The application has no database migrations or volume cleanup to perform.

Networking reference: [Docker host networking](https://docs.docker.com/engine/network/drivers/host/).
