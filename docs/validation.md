# Validation and hardware limits

Run `npm run check` for all JavaScript syntax and `npm test` for real HTTP integration tests against a local mock Hailo/Home Assistant service. Tests cover static assets, configuration validation, AI forwarding/model selection, invalid input/body limits, cross-origin rejection, file traversal, upstream failure, timeout recovery, concurrent chat rejection, HA entity filtering and token redaction. Mock responses validate protocol behavior; they are not hardware inference benchmarks.

CI repeats these checks, validates the deployment script and Compose configuration, and builds both Linux amd64 and arm64 images. The runtime image contains no npm packages to install. Successful CI is not a guarantee of display, audio or accelerator compatibility.

Before relying on a Pi installation, verify:

1. Existing NVMe OS still boots normally and existing containers/services remain available.
2. Dashboard health is successful, and the browser shows clock, focus, assistant and connections.
3. The existing Hailo endpoint responds directly; a dashboard chat uses the configured installed model.
4. AI offline/timeout behavior leaves the rest of the dashboard working.
5. Portrait display and kiosk input work with the actual panel/controller.
6. Optional HA states match the intended entity IDs.

No SSH access to the user's Pi was available during authoring. Its physical display, NVMe contents, Hailo hardware, live model latency and optional HA instance require validation on that Pi. Voice and casting are roadmap items, not working receivers or speech services.
