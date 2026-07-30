#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

REPORT_DIR="${REPORT_DIR:-$repo_root/.reports/verify/build-frontend-$(date -u +%Y%m%dT%H%M%SZ)-$$}" \
  bash "$repo_root/scripts/verify-frontend.sh" build
