#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
core_root="$repo_root/core"
default_report_root="$repo_root/.reports/verify"
report_dir="${REPORT_DIR:-$default_report_root/core-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
summary_file="$report_dir/summary.txt"
source "$script_dir/verify-common.sh"

verify_init_report_dir "$report_dir"
: >"$summary_file"

gradle_user_home="${GRADLE_USER_HOME:-${XDG_CACHE_HOME:-/tmp}/gonezo-docker/core-gradle}"
mkdir -p "$gradle_user_home"
export GRADLE_USER_HOME="$gradle_user_home"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/verify-core.sh
  ./scripts/verify-core.sh [step ...]
  ./scripts/verify-core.sh --list
  ./scripts/verify-core.sh clean

Available steps:
  clean
  fast
  check
  health
EOF
}

list_steps() {
  printf '%s\n' clean fast check health
}

append_summary() {
  verify_append_summary "$summary_file" "$1"
}

step_log_path() {
  local step="$1"
  verify_step_log_path "$report_dir" "$step"
}

resolve_steps() {
  local -n target_steps="$1"
  shift

  if (($# == 0)); then
    target_steps=("check")
    return 0
  fi

  local -a selected=()
  for step in "$@"; do
    case "$step" in
      -h|--help)
        usage
        return 2
        ;;
      --list)
        list_steps
        return 2
        ;;
      all)
        selected+=("check" "health")
        ;;
      clean|fast|check|health)
        selected+=("$step")
        ;;
      *)
        printf 'verify-core failed: unknown step "%s"\n\n' "$step" >&2
        usage >&2
        exit 1
      ;;
    esac
  done

  target_steps=("${selected[@]}")
}

run_logged_command() {
  local step="$1"
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
    append_summary "OK $step (${duration}s) -> $(verify_display_path "$repo_root" "$log_file")"
    printf 'OK %s\n' "$step"
    return 0
  fi

  append_summary "FAIL $step (${duration}s) -> $(verify_display_path "$repo_root" "$log_file")"
  printf 'FAIL %s -> %s\n' "$step" "$(verify_display_path "$repo_root" "$log_file")"
  return "$status"
}

run_step() {
  local step="$1"
  local log_file
  log_file="$(step_log_path "$step")"

  case "$step" in
    clean)
      run_logged_command "$step" "$log_file" bash -lc "cd '$core_root' && ./gradlew clean"
      ;;
    check)
      run_logged_command "$step" "$log_file" bash -lc "cd '$core_root' && ./gradlew check spotlessCheck checkLayerBoundaries"
      ;;
    fast)
      run_logged_command "$step" "$log_file" bash -lc "cd '$core_root' && ./gradlew spotlessCheck checkLayerBoundaries"
      ;;
    health)
      run_logged_command "$step" "$log_file" bash -lc "cd '$core_root' && ./gradlew buildHealth"
      ;;
  esac
}

main() {
  local -a steps=()
  if resolve_steps steps "$@"; then
    :
  else
    local status=$?
    if [[ $status -eq 2 ]]; then
      exit 0
    fi
    exit "$status"
  fi

  for step in "${steps[@]}"; do
    if ! run_step "$step"; then
      exit 1
    fi
  done

  printf 'core OK -> %s\n' "$(verify_display_path "$repo_root" "$report_dir")"
}

main "$@"
