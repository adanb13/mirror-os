FROM node:24-bookworm-slim AS upstream
# MagicMirror² v2.38.0, pinned to the official release commit.
ARG MAGICMIRROR_COMMIT=f138f5b690ceab6450f55c852ac81d268363f563
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/magicmirror
RUN git init && git remote add origin https://github.com/MagicMirrorOrg/MagicMirror.git \
    && git fetch --depth=1 origin "$MAGICMIRROR_COMMIT" && git checkout --detach FETCH_HEAD \
    && npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund \
    && rm -rf /opt/magicmirror/.git

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /opt/magicmirror
COPY --from=upstream --chown=node:node /opt/magicmirror ./
COPY --chown=node:node magicmirror/config.cjs ./config/config.js
COPY --chown=node:node magicmirror/custom.css ./config/custom.css
# Upstream generates these bootstrap files at startup. Keep the image read-only
# while allowing its normal writes in the private container tmpfs.
RUN ln -s /tmp/mm-basepath.js config/basepath.js \
    && ln -s /tmp/mm-positions.js js/positions.js
USER node
# Official MagicMirror² server-only entry point; Chromium displays it on the Pi.
CMD ["node", "serveronly"]
