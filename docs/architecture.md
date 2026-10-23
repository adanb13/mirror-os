# Actual MagicMirror² and separate background integrations

```text
Windows browser -- SSH tunnel 13300 -> Pi 3000 --> dashboard: official MagicMirror²
                                                  defaultmodules/clock only

Background consumers --> Pi 3001 --> backend: existing validated HTTP adapters
                                      |--> native Hailo-Ollama on Pi 8000
                                      `--> optional existing Home Assistant
```

There is no frontend dependency between these services. MagicMirror² starts and displays its clock even when Hailo or the backend is offline. Hailo is not a visible or hidden MagicMirror module. No chat box, status panel, branding or setup instructions are rendered on the mirror.

## Upstream source and display customization

The main `Dockerfile` fetches [MagicMirrorOrg/MagicMirror](https://github.com/MagicMirrorOrg/MagicMirror), official **v2.38.0**, commit **f138f5b690ceab6450f55c852ac81d268363f563**. The release was checked against the official repository when this migration was authored. Source and npm dependencies are pinned by that commit and its lockfile. Optional Electron is omitted because this is a headless server deployment; an existing browser displays the real MagicMirror frontend, including its Socket.IO connection. The upstream license remains in the image.

`magicmirror/config.cjs` is copied as upstream's `config/config.js`. It uses the real built-in clock module in the `top_left` region, an IANA timezone, white text, and a pure black background. `magicmirror/custom.css` adjusts spacing/type while retaining upstream layout. Add calendar, weather or future custom modules through this real configuration, with genuine data sources configured explicitly. A module change requires rebuilding the display image. Future persistent third-party module installation can extend the Dockerfile; there is no generic writable module mount or unreviewed auto-installer.

To upgrade upstream, inspect the latest official release, update `MAGICMIRROR_COMMIT` in the Dockerfile to its verified commit, then run the container and asset/Socket.IO smoke checks. Do not silently track `master` for production builds. A GitHub fork of MagicMirror is not needed: `mirror-os` owns the deployment configuration, not a copy of the upstream source.

## Background API

`Dockerfile.backend` packages `src/` with Node 24 and no third-party npm dependencies. Existing server-side AI and HA adapters remain. The old custom `public/` dashboard has been removed. Requests for HTML or JS frontend assets return 404.

| Route on Pi port 3001 | Behavior |
| --- | --- |
| `GET /api/health` | API liveness, independent of AI |
| `GET /api/config` | Background service identity and model name |
| `GET /api/integrations` | Programmatic AI/planned integration status; no screen widget |
| `POST /api/chat` | Validated messages; completed assistant reply and elapsed time |
| `GET /api/home-assistant` | Allowlisted read-only entity states or disabled/offline status |

Chat accepts 1–8 user/assistant messages, at most 4000 characters each and a 32 KiB request body, ending with a user message. The adapter supplies the server-owned system prompt and configured model. One mirror API request can run at a time; concurrent requests return 429. Upstream errors return 502 and timeouts 504. It retains no transcripts and executes no model text. Service credentials remain server-side. Host/origin checks protect the background API, which stays on loopback in Compose.

Legacy `.env` `MODULES` and `MIRROR_TITLE` values have no effect on the screen. The gateway/frontend has not merely been restyled: it has been replaced by real MagicMirror². The API now uses port 3001, while the established display port 3000 and SSH tunnel remain stable.

## Future voice, casting and home integration

Voice and casting are still unimplemented. A future voice pipeline should route explicit local speech transcripts to the background API and send answers to an audio output adapter. A casting receiver is a separately chosen/tested host service. Neither belongs on the mirror as a connection card. Future Home Assistant screen modules or explicit device actions can be added independently when requested. Existing API entity reads never send HA commands.
