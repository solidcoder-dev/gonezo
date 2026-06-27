#!/usr/bin/env bash
set -euo pipefail

if [ -d app ]; then
  (cd app && npm run check:structure && npm run lint && npm test && npm run build)
fi

if [ -d core ]; then
  (cd core && ./gradlew test checkLayerBoundaries)
fi
