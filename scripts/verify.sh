#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
app_root="$repo_root/app"
core_root="$repo_root/core"
default_report_root="$repo_root/.reports/verify"
run_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
run_dir="${REPORT_DIR:-$default_report_root/$run_id}"
source "$script_dir/verify-common.sh"
source "$script_dir/verify-docker.sh"

verify_init_report_dir "$run_dir"

frontend_dir="$run_dir/frontend"
frontend_e2e_dir="$run_dir/frontend-e2e"
core_dir="$run_dir/core"
build_dir="$run_dir/build-frontend"
health_dir="$run_dir/health"
frontend_image_tag="gonezo-verify-frontend:node-22.14.0-chromium-1.62.0"
frontend_image_built=false

for dir in "$frontend_dir" "$frontend_e2e_dir" "$core_dir" "$build_dir" "$health_dir"; do
  verify_init_report_dir "$dir"
done

root_summary_file="$run_dir/summary.txt"
: >"$root_summary_file"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/verify.sh
  ./scripts/verify.sh quick
  ./scripts/verify.sh fast
  ./scripts/verify.sh all
  ./scripts/verify.sh standard
  ./scripts/verify.sh frontend [step ...]
  ./scripts/verify.sh frontend-e2e
  ./scripts/verify.sh core [step ...]
  ./scripts/verify.sh build-frontend
  ./scripts/verify.sh health

Modes:
  quick         Compatibility alias for fast.
  fast          Run frontend and core architecture/style/type checks without the full test suites.
  standard      Run complete local frontend and core checks.
  all           Run standard plus Docker E2E.
  frontend      Run the local frontend quality gate, or a subset of frontend steps.
  frontend-e2e  Run the frontend Playwright suite.
  core          Run the local core JVM verification, or a subset of core steps.
  build-frontend Run only the frontend production build.
  health        Run the core buildHealth report.
EOF
}

summary_line() {
  printf '%s\n' "$1" | tee -a "$root_summary_file"
}

run_logged_command() {
  local mode="$1"
  local log_file="$2"
  shift 2
  local started_at finished_at duration status
  started_at="$(date +%s)"

  if {
    printf '$ '
    printf '%q ' "$@"
    printf '\n'
    "$@"
  } >"$log_file" 2>&1; then
    status=0
  else
    status=$?
  fi

  finished_at="$(date +%s)"
  duration=$((finished_at - started_at))

  if [[ "$status" -eq 0 ]]; then
    summary_line "[$mode] OK (${duration}s) -> $(verify_display_path "$repo_root" "$log_file")"
    printf 'OK %s\n' "$mode"
    return 0
  fi

  summary_line "[$mode] FAIL (${duration}s) -> $(verify_display_path "$repo_root" "$log_file")"
  printf 'FAIL %s -> %s\n' "$mode" "$(verify_display_path "$repo_root" "$log_file")"
  return "$status"
}

build_frontend_image() {
  if [[ "$frontend_image_built" == true ]]; then
    return 0
  fi
  verify_docker_build_image "$frontend_image_tag" "$repo_root/docker/frontend.Dockerfile" "$repo_root/docker"
  frontend_image_built=true
}

verify_frontend_local_dependencies() {
  local -a missing=()
  for binary in tsc eslint vite; do
    if [[ ! -e "$app_root/node_modules/.bin/$binary" ]]; then
      missing+=("$binary")
    fi
  done

  if ((${#missing[@]} > 0)); then
    printf 'verify failed: frontend local fallback requires installed app dependencies (%s missing)\n' "${missing[*]}" >&2
    return 1
  fi
}

verify_core_local_dependencies() {
  local -a missing=()

  if [[ ! -x "$core_root/gradlew" ]]; then
    missing+=("$core_root/gradlew")
  fi
  if ! command -v java >/dev/null 2>&1; then
    missing+=(java)
  fi

  if ((${#missing[@]} > 0)); then
    printf 'verify failed: core fast checks require local tools (%s missing)\n' "${missing[*]}" >&2
    return 1
  fi
}

run_frontend_local() {
  local -a steps=("$@")
  verify_frontend_local_dependencies
  run_logged_command "frontend" "$frontend_dir/runner.log" bash -lc 'app_root=$1; report_dir=$2; script_path=$3; changed_only=$4; shift 4; cd "$app_root" && env REPORT_DIR="$report_dir" VERIFY_CHANGED_ONLY="$changed_only" bash "$script_path" "$@"' bash "$app_root" "$frontend_dir" "$repo_root/scripts/verify-frontend.sh" "${VERIFY_CHANGED_ONLY:-0}" "${steps[@]}"
}

run_build_frontend_local() {
  verify_frontend_local_dependencies
  run_logged_command "build-frontend" "$build_dir/runner.log" bash -lc "cd '$app_root' && npm run build:bundle"
}

run_core_local() {
  local -a steps=("$@")
  verify_core_local_dependencies
  if ((${#steps[@]} == 0)); then
    steps=("check")
  fi
  run_logged_command "core" "$core_dir/runner.log" bash -lc 'report_dir=$1; script_path=$2; shift 2; env REPORT_DIR="$report_dir" bash "$script_path" "$@"' bash "$core_dir" "$repo_root/scripts/verify-core.sh" "${steps[@]}"
}

run_frontend() {
  local -a steps=("$@")
  run_frontend_local "${steps[@]}"
}

run_frontend_e2e() {
  verify_docker_require "frontend-e2e"
  build_frontend_image
  run_logged_command "frontend-e2e" "$frontend_e2e_dir/runner.log" verify_docker_run_frontend "$repo_root" "$frontend_image_tag" bash -lc 'cd "$1"; fingerprint=$(sha256sum package.json package-lock.json | sha256sum | cut -d" " -f1); marker="/tmp/npm-cache/gonezo-node-modules-$fingerprint"; if [[ ! -f "$marker" ]]; then npm ci && touch "$marker"; fi; npm run test:e2e' bash "$app_root"
}

run_core() {
  run_core_local "$@"
}

run_build_frontend() {
  run_build_frontend_local
}

run_health() {
  run_core_local health
}

run_quick() {
  run_fast
}

run_fast() {
  local status=0
  VERIFY_CHANGED_ONLY=1 run_frontend_local typecheck lint:js check:structure check:architecture check:styles check:contrast lint:css || status=$?
  run_core_local fast || status=$?
  return "$status"
}

run_standard() {
  local status=0
  run_frontend || status=$?
  run_core || status=$?
  return "$status"
}

run_all() {
  local status=0
  run_standard || status=$?
  run_frontend_e2e || status=$?
  return "$status"
}

main() {
  local mode="${1:-quick}"
  shift || true

  case "$mode" in
    -h|--help)
      usage
      ;;
    quick)
      run_quick
      ;;
    fast)
      run_fast
      ;;
    standard)
      run_standard
      ;;
    all)
      run_all
      ;;
    frontend)
      run_frontend "$@"
      ;;
    frontend-e2e)
      run_frontend_e2e
      ;;
    core)
      run_core "$@"
      ;;
    build-frontend)
      run_build_frontend
      ;;
    health)
      run_health
      ;;
    *)
      printf 'verify failed: unknown mode "%s"\n\n' "$mode" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
