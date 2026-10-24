# Deploy actual MagicMirror² without replacing the Pi installation

## Existing installation: one update

From the Pi's SSH terminal:

```sh
cd ~/mirror-os
git status --short
git pull --ff-only
sudo docker compose --progress plain -p mirror-os up -d --build --wait --wait-timeout 120
```

Commit or back up your own source edits before pulling. This changes only the `mirror-os` Compose project. Its existing `dashboard` service becomes actual upstream MagicMirror²; a new `backend` service provides a background API. It does not remove other containers, format storage, change boot settings, install Hailo drivers, or download/replace AI models. Your existing `.env` is kept. The earlier `MODULES` and `MIRROR_TITLE` keys no longer affect the display.

MagicMirror² is fetched from the official v2.38.0 release commit `f138f5b690ceab6450f55c852ac81d268363f563`. Its upstream lockfile determines dependencies. Both images run as an unprivileged user with a read-only filesystem and no host file/device or Docker socket mounts. Linux host networking reaches existing host services; the servers bind to loopback by default. No hard memory cap is requested, avoiding the unsupported-cgroup memory warning on the user's Pi.

The first MagicMirror image build needs internet access and may take several minutes. Plain progress avoids terminal redraw noise. The readiness wait begins after the build. If a port is occupied, inspect its owner and select unused ports in `.env`; do not stop unrelated services.

## Viewing over SSH from Windows

The Pi currently has no screen/keyboard attached. A browser's `127.0.0.1` means the computer running that browser. An SSH tunnel forwards a Windows-local port to the Pi's loopback display port.

In a separate **Windows PowerShell** window:

```powershell
ssh -N -L 127.0.0.1:13300:127.0.0.1:3000 mirror@10.0.0.177
```

Enter the Pi password and leave that window running. It normally appears idle. Open **http://127.0.0.1:13300** in the Windows browser. Reuse your usual SSH identity/port options if needed. If the Pi address changes, obtain it with `hostname -I` in the existing Pi terminal. Use the LAN address, not Docker's bridge address.

The existing tunnel does not need changing during this migration. Reload the page after the containers become healthy; use Ctrl+Shift+R if an old browser page remains visible. The expected page has MagicMirror²'s clock and date at the upper left and one rotating news headline at the bottom, with no AI cards, input fields or branding. The Pi needs outbound internet access to fetch news from the New York Times RSS feed; the clock and local Hailo inference do not require that feed.

## When the physical Mirror display is connected

The Pi must have a working graphical session and browser and a working connection to the Mirror panel/controller. The containers run servers; they do not configure HDMI, panel power, rotation, a desktop environment or the original Mirror computer.

In the Pi's graphical desktop, display `http://127.0.0.1:3000`. To use an already installed Chromium in full screen:

```sh
chromium --kiosk --no-first-run http://127.0.0.1:3000
```

Some installations name it `chromium-browser`. Use the desktop display settings for portrait orientation. Test before adding the browser command to desktop Startup Applications. SSH alone cannot open a visible browser without a graphical session. Exit the kiosk with Alt+F4.

## Hailo remains a background service

Your existing native Hailo-Ollama server stays at `127.0.0.1:8000`. It is not installed or replaced by Compose, and nothing from it is shown on the mirror. Keep its current server terminal running until you separately configure a boot service. Its installed model names include `qwen2.5-instruct:1.5b`.

In a second Pi terminal:

```sh
curl -fsS http://127.0.0.1:8000/api/tags
curl -sS --max-time 130 http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hello in one sentence."}]}' \
  -w '\nHTTP %{http_code}; elapsed %{time_total}s\n'
```

The background API has moved from port **3000** to **3001**. In the verified Pi session, the old adapter returned the requested answer in about 12–15 seconds. A later five-minute Hailo `generation_context` reset can be ordinary idle-model unloading; use the actual HTTP response to judge inference success. Do not reinstall working runtime/driver packages just because the idle reset appears. [Hailo's source](https://github.com/hailo-ai/hailo_model_zoo_genai/blob/v5.1.1/src/library/config/static_config.hpp) defines its default keep-alive.

## Configuration

| Setting | Purpose |
| --- | --- |
| `HOST`, `PORT` | MagicMirror bind address/port, default `127.0.0.1:3000` |
| `API_PORT` | Background API port, default `3001` |
| `TIMEZONE` | Clock timezone, default `America/Toronto` |
| `AI_BASE_URL`, `AI_MODEL`, `AI_TIMEOUT_MS` | Existing Hailo endpoint, installed model, request timeout |
| `HA_BASE_URL`, `HA_TOKEN`, `HA_ENTITIES` | Optional background read-only HA adapter; no screen module |

For display modules and positioning, edit `magicmirror/config.cjs`; use official [MagicMirror² documentation](https://docs.magicmirror.builders/). Rebuild after changing it or `magicmirror/custom.css`. Calendar/weather are available through MagicMirror's normal module system but are deliberately unconfigured here. Keep API credentials in `.env`; `chmod 600 .env` restricts local access. The display container receives only its host, port and timezone, not AI or HA settings.

Keep default loopback binding and the SSH tunnel. These services have no user login interface. MagicMirror's loopback IP whitelist is also retained. LAN/public exposure needs deliberate access-control configuration; it is not required for the tunnel.

## New clone prerequisites

Use your existing 64-bit Pi Linux installation. `uname -m` should report `aarch64`; Git, Docker Engine and the Compose plugin must be available. Follow [Docker's Debian installation guide](https://docs.docker.com/engine/install/debian/) if missing. No OS reinstall is needed. Create `.env` from the example only if it does not already exist. If Docker needs administrator access, use the `sudo docker compose` commands above. The repository is public and requires no GitHub authentication for HTTPS cloning.

## Update other Pi source repositories

```sh
bash scripts/update-repos.sh
```

This searches readable Git checkouts under `/home`, `/opt`, `/srv`, `/usr/local/src`, `/mnt` and `/media`. Pass other roots explicitly if needed. It fetches configured remotes and fast-forwards clean current branches to their configured tracking branches. It preserves edits, untracked files, local commits and in-progress Git operations, and reports `ATTENTION` entries. It does not guess a fork's upstream, reset, stash, push, install packages or change submodules. The earlier Pi scan found only `~/mirror-os` in these roots.

MagicMirror's upstream source lives in its image, not in a new checkout on the Pi. Updating the pinned official commit in the Dockerfile and rebuilding updates that source reproducibly.

## Health, logs, stop and rollback

```sh
sudo docker compose -p mirror-os ps
curl -fsS http://127.0.0.1:3000/version
curl -fsS http://127.0.0.1:3001/api/health
sudo docker compose -p mirror-os logs --tail=100 dashboard backend
```

To stop only this project, run `sudo docker compose -p mirror-os down`. For rollback, inspect `git status` and select a known-good commit from `git log`, then use `git switch --detach COMMIT_SHA` and rebuild. A rollback to the former one-container version can leave the new backend container as an orphan; remove only that project service explicitly if needed. No hard reset or storage cleanup is needed. A rollback does not modify Hailo or its model files.
