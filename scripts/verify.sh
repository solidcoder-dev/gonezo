#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
report_root="$repo_root/.reports/verify"
run_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
run_dir="$report_root/$run_id"
source "$script_dir/verify-common.sh"

verify_init_report_dir "$run_dir"

frontend_dir="$run_dir/frontend"
core_dir="$run_dir/core"
build_dir="$run_dir/build-frontend"
health_dir="$run_dir/health"

verify_init_report_dir "$frontend_dir"
verify_init_report_dir "$core_dir"
verify_init_report_dir "$build_dir"
verify_init_report_dir "$health_dir"

root_summary_file="$run_dir/summary.txt"
: >"$root_summary_file"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/verify.sh
  ./scripts/verify.sh all
  ./scripts/verify.sh frontend [step ...]
  ./scripts/verify.sh core [step ...]
  ./scripts/verify.sh build-frontend
  ./scripts/verify.sh health

Modes:
  all           Run frontend verification and core verification.
  frontend      Run the frontend quality gate, or a subset of frontend steps.
  core          Run the core JVM verification, or a subset of core steps.
  build-frontend Run only the frontend production build.
  health        Run the core buildHealth report.
EOF
}

summary_line() {
  printf '%s\n' "$1" | tee -a "$root_summary_file"
}

run_mode() {
  local mode="$1"
  local dir="$2"
  local script_path="$3"
  shift 3
  local runner_log="$dir/runner.log"

  REPORT_DIR="$dir" bash "$repo_root/$script_path" "$@" >"$runner_log" 2>&1
}

write_mode_start() {
  summary_line "verify run: $run_id"
  summary_line "logs: $run_dir"
  summary_line "running: $1"
}

print_mode_result() {
  local mode="$1"
  local dir="$2"
  local exit_code="$3"
  local summary_file="$dir/summary.txt"

  if [[ "$exit_code" -eq 0 ]]; then
    summary_line "[$mode] OK -> $dir"
    return 0
  fi

  local failure_step="unknown"
  if [[ -f "$summary_file" ]]; then
    failure_step="$(awk '/^FAIL / { print $2; exit }' "$summary_file")"
    if [[ -z "$failure_step" ]]; then
      failure_step="unknown"
    fi
  fi

  summary_line "[$mode] FAIL at $failure_step -> $dir"
}

run_mode_and_report() {
  local mode="$1"
  local dir="$2"
  local script_path="$3"
  local announce_start="$4"
  shift 4

  if [[ "$announce_start" == true ]]; then
    write_mode_start "$mode"
  fi

  if run_mode "$mode" "$dir" "$script_path" "$@"; then
    print_mode_result "$mode" "$dir" 0
  else
    local status=$?
    print_mode_result "$mode" "$dir" "$status"
    return "$status"
  fi
}

run_single_mode() {
  run_mode_and_report "$1" "$2" "$3" true "${@:4}"
}

main() {
  local mode="${1:-all}"
  shift || true

  case "$mode" in
    -h|--help)
      usage
      ;;
    all)
      summary_line "verify run: $run_id"
      summary_line "logs: $run_dir"
      local frontend_status=0
      local core_status=0

      if run_mode_and_report "frontend" "$frontend_dir" "scripts/verify-frontend.sh" false; then
        :
      else
        frontend_status=$?
      fi

      if run_mode_and_report "core" "$core_dir" "scripts/verify-core.sh" false; then
        :
      else
        core_status=$?
      fi

      if [[ "$frontend_status" -eq 0 && "$core_status" -eq 0 ]]; then
        :
      else
        exit 1
      fi
      ;;
    frontend)
      if run_single_mode "frontend" "$frontend_dir" "scripts/verify-frontend.sh" "$@"; then
        :
      else
        status=$?
        exit "$status"
      fi
      ;;
    core)
      if run_single_mode "core" "$core_dir" "scripts/verify-core.sh" "$@"; then
        :
      else
        status=$?
        exit "$status"
      fi
      ;;
    build-frontend)
      if run_single_mode "build-frontend" "$build_dir" "scripts/build-frontend.sh" "$@"; then
        :
      else
        status=$?
        exit "$status"
      fi
      ;;
    health)
      if run_single_mode "health" "$health_dir" "scripts/verify-core.sh" health "$@"; then
        :
      else
        status=$?
        exit "$status"
      fi
      ;;
    *)
      printf 'verify failed: unknown mode "%s"\n\n' "$mode" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
