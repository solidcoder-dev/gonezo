#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Runtime surfaces that must not couple to Spring HTTP routes/hosts.
TARGETS=(
  "$ROOT_DIR/app/src"
  "$ROOT_DIR/app/android/app/src/main/java"
  "$ROOT_DIR/app/ios/App/App/Plugins"
)

# Ignore expected false positives like XML namespace URLs and docs.
EXCLUDE_PATTERNS=(
  "xmlns=\"http://"
  "https://vite.dev"
  "https://react.dev"
)

PATTERN='localhost:8080|127\.0\.0\.1:8080|/accounts\b|/transactions\b|/budget-periods\b|/reservations\b|/investments\b|@RequestMapping|@RestController'

matches="$(rg -n --no-heading --glob '!**/*.svg' "$PATTERN" "${TARGETS[@]}" || true)"

if [[ -n "$matches" ]]; then
  filtered="$matches"
  for exclude in "${EXCLUDE_PATTERNS[@]}"; do
    filtered="$(printf '%s\n' "$filtered" | rg -v "$exclude" || true)"
  done

  if [[ -n "$filtered" ]]; then
    echo "ERROR: Spring runtime coupling detected in app runtime code:" >&2
    printf '%s\n' "$filtered" >&2
    exit 1
  fi
fi

echo "OK: no Spring runtime coupling detected in app runtime code."
