FROM node:22.14.0-bookworm-slim

ENV CI=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN npx --yes playwright@1.62.0 install --with-deps chromium \
  && npm cache clean --force \
  && rm -rf /var/lib/apt/lists/* /root/.npm

WORKDIR /workspace
