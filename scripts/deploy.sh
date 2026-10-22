#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ "$(uname -s)" != Linux ]; then
  echo 'This deployment script targets Raspberry Pi Linux.' >&2
  exit 1
fi
if [ "$(uname -m)" = armv7l ]; then
  echo 'Use your existing 64-bit Raspberry Pi OS installation; the container needs arm64.' >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo 'Docker Engine and the Compose plugin are required. See docs/deployment.md.' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo 'Cannot access Docker. Start Docker and check your user permissions (see docs/deployment.md).' >&2
  exit 1
fi
# Never overwrite the user's configuration or touch disks, boot files or other stacks.
if [ ! -e .env ]; then
  (umask 077; cp .env.example .env)
fi
docker compose -p mirror-os config --quiet
docker compose -p mirror-os up -d --build --wait --wait-timeout 120
echo 'Mirror OS is ready. Open http://localhost:3000 on the Pi (or your configured port).'
