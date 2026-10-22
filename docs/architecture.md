# Modules and future integrations

## Current structure

```text
public/app.js                 UI module registry and lifecycle
public/modules/               clock, notes, assistant, connections, HA cards
public/styles.css             portrait/landscape dashboard styles
src/server.js                 HTTP routes, body limits, static files
src/config.js                 validated environment configuration
src/integrations/ai.js        Hailo-Ollama HTTP adapter, timeout, single chat slot
src/integrations/home-assistant.js  read-only allowlisted entity adapter
src/integrations/registry.js  honest status for planned integrations
scripts/deploy.sh             non-destructive Compose startup
```

No framework build step and no third-party runtime dependencies are needed. Use browser ES modules and Node 24 built-ins. The Docker image supports arm64; Compose uses Linux host networking to reach an already running loopback Hailo service. It does not contain HailoRT or AI models.

## Add a dashboard widget

1. Create `public/modules/your-widget.js` exporting `mount(root, config)`.
2. Render within `root`. Return a cleanup function for intervals, listeners or streams when needed.
3. Register it in `public/app.js` and allow its ID in `src/config.js`.
4. Add its ID to `MODULES` in `.env`, in display order. Default layout is CSS grid; the assistant occupies the right column, and clock/home status span the page.

Use `textContent` for dynamic text. Only fixed static templates use `innerHTML`. Secrets and configured service addresses belong in backend adapters and never in public configuration. Native `fetch` provides server-to-service calls; browser requests stay on the dashboard's origin.

## Current API contracts

| Route | Behavior |
| --- | --- |
| `GET /api/health` | Dashboard liveness only |
| `GET /api/config` | Public title, timezone, module IDs and model name |
| `GET /api/integrations` | AI availability/model list and planned extension statuses |
| `POST /api/chat` | `{messages:[{role:"user" or "assistant",content:string}]}`; returns assistant message and elapsed milliseconds |
| `GET /api/home-assistant` | Configured entity names/states/units, or disabled/offline status |

Chat accepts 1–8 messages, at most 4000 characters per message, a 32 KiB total request body, and must end with a user message. A server-owned system prompt is prepended. The browser keeps the last three exchanges for the next turn. This is a text assistant: model output never executes shell commands or controls devices. Errors use `{error:string}` with meaningful HTTP status codes; concurrent chat returns 429, upstream failure 502, timeout 504.

## Planned voice boundary

Add an explicit user-controlled microphone/voice adapter outside the text chat module. A future local STT adapter should return a transcript to the same validated chat interface; a TTS adapter should accept the resulting answer. Define lifecycle methods such as `start()`, `stop()`, `transcribe(audio)` and `speak(text)` in that adapter, with microphone-active and mute states visible in the UI. Choose hardware, audio devices, speech model, wake word behavior and any Hailo device-sharing settings before implementing it. No browser speech recognition is enabled because its processing may be cloud hosted.

## Planned casting boundary

A receiver is a separate host service with its own audio/display requirements, discovery and compatibility testing. A future casting adapter should report states such as idle/receiving and expose an explicit stop operation; a UI module can replace or overlay the dashboard during playback. AirPlay, Chromecast, screen mirroring and DRM playback are different capabilities. Do not mark casting available until the chosen receiver has been installed and tested with the intended source device. This scaffold does not impersonate an official receiver.

## Home Assistant next steps

Read-only cards work now. Future action support should use an explicit list of allowed service/entity operations with direct user controls, separate from model text. Keep credentials server-side. Realtime updates can later replace polling through a dedicated HA WebSocket adapter without changing the widget interface.
