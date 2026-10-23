# Validation

`npm run check` checks JavaScript/CommonJS syntax. `npm test` tests the real HTTP background API against local mock AI and Home Assistant servers and checks that the real MagicMirror configuration enables only its clock, with no AI frontend module. API tests cover model forwarding, invalid input, body limits, host/origin checks, missing frontend routes, upstream failure, timeout recovery, concurrent chat rejection, read-only entity filtering and token redaction.

`bash test/update-repos.test.sh` tests clean fast-forward updates and preservation of edits, untracked files, detached checkouts, local commits, unconfigured tracking and Git operations, including paths with spaces and duplicate roots.

`scripts/smoke-magicmirror.cjs` runs **inside the actual upstream MagicMirror display container**. It checks the MagicMirror HTML, live `/config`, exclusive clock configuration, clock/JS/CSS assets, Socket.IO polling and a real WebSocket handshake. It does not mock MagicMirror. CI also starts both Compose services and builds both images for Linux amd64 and arm64.

Pi evidence before migration: the old background adapter returned a Hailo answer through HTTP 200 in about 12–15 seconds; the Pi has `qwen2.5-instruct:1.5b` installed. The earlier display was a custom dashboard, not MagicMirror². The migration is tested locally and in CI; the user must run the supplied SSH update command on the actual Pi before its displayed page changes.

No agent SSH access to the Pi is assumed. Actual Mirror panel/controller output, portrait rotation, display brightness/reflection, and accelerator performance are checked on that hardware. Software black supports the mirror effect but cannot turn an LCD into transparent glass. Hailo's native process must remain running separately until its boot service is configured. Voice and casting are not implemented or represented as available UI features.
