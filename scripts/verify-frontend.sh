#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
app_root="$repo_root/app"
default_report_root="$repo_root/.reports/verify"
report_dir="${REPORT_DIR:-$default_report_root/frontend-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
summary_file="$report_dir/summary.txt"
source "$script_dir/verify-common.sh"

readonly -a default_steps=(
  typecheck
  lint:js
  check:structure
  check:architecture
  check:styles
  check:contrast
  lint:css
  test
  build
)

readonly -a theme_steps=(
  check:styles
  check:contrast
  build
)

verify_init_report_dir "$report_dir"
: >"$summary_file"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/verify-frontend.sh
  ./scripts/verify-frontend.sh [step ...]
  ./scripts/verify-frontend.sh --list

Available steps:
  typecheck
  lint:js
  check:structure
  check:architecture
  check:styles
  check:contrast
  lint:css
  test
  build
EOF
}

list_steps() {
  printf '%s\n' "${default_steps[@]}"
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
    target_steps=("${default_steps[@]}")
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
        selected=("${default_steps[@]}")
        ;;
      typecheck|lint:js|check:structure|check:architecture|check:styles|check:contrast|lint:css|test|build)
        selected+=("$step")
        ;;
      *)
        printf 'verify-frontend failed: unknown step "%s"\n\n' "$step" >&2
        usage >&2
        exit 1
        ;;
    esac
  done

  target_steps=("${selected[@]}")
}

step_needs_theme_prep() {
  local step="$1"
  for theme_step in "${theme_steps[@]}"; do
    if [[ "$step" == "$theme_step" ]]; then
      return 0
    fi
  done
  return 1
}

run_theme_precheck_once() {
  local -a requested_steps=("$@")
  local needs_theme=false

  for step in "${requested_steps[@]}"; do
    if step_needs_theme_prep "$step"; then
      needs_theme=true
      break
    fi
  done

  if [[ "$needs_theme" != true ]]; then
    return 0
  fi

  local theme_log="$report_dir/theme-prep.log"
  local started_at finished_at duration status
  started_at="$(date +%s)"

  if {
    printf '$ cd %q && node ./scripts/generate-theme-colors.mjs\n' "$app_root"
    (cd "$app_root" && node ./scripts/generate-theme-colors.mjs)
  } >"$theme_log" 2>&1; then
    status=0
  else
    status=$?
  fi

  finished_at="$(date +%s)"
  duration=$((finished_at - started_at))

  if [[ "$status" -eq 0 ]]; then
    append_summary "OK theme-prep (${duration}s) -> $(verify_display_path "$repo_root" "$theme_log")"
  else
    append_summary "FAIL theme-prep (${duration}s) -> $(verify_display_path "$repo_root" "$theme_log")"
  fi

  return "$status"
}

run_step_command() {
  local step="$1"
  case "$step" in
    typecheck|lint:js|check:architecture|lint:css|test)
      (cd "$app_root" && npm run "$step")
      ;;
    check:structure)
      (cd "$app_root" && npm run check:structure)
      ;;
    check:styles)
      (cd "$app_root" && node ./scripts/check-style-architecture.mjs)
      ;;
    check:contrast)
      (cd "$app_root" && node ./scripts/check-color-contrast.mjs)
      ;;
    build)
      (cd "$app_root" && npm run build:bundle)
      ;;
  esac
}

run_step_batch() {
  local -n batch_steps="$1"

  if ((${#batch_steps[@]} == 0)); then
    return 0
  fi

  local -a step_names=()
  local -a step_pids=()
  local -a step_started_at=()
  local -a step_logs=()

  local step log_file started_at pid
  for step in "${batch_steps[@]}"; do
    log_file="$(step_log_path "$step")"
    started_at="$(date +%s)"
    printf 'started: %s\n' "$step"
    {
      printf '$ %s\n' "$step"
      run_step_command "$step"
    } >"$log_file" 2>&1 &
    pid="$!"

    step_names+=("$step")
    step_pids+=("$pid")
    step_started_at+=("$started_at")
    step_logs+=("$log_file")
  done

  local overall_status=0
  local index current_step current_pid current_started_at current_log status finished_at duration
  for index in "${!step_names[@]}"; do
    current_step="${step_names[$index]}"
    current_pid="${step_pids[$index]}"
    current_started_at="${step_started_at[$index]}"
    current_log="${step_logs[$index]}"

    if wait "$current_pid"; then
      status=0
    else
      status=$?
      overall_status=1
    fi

    finished_at="$(date +%s)"
    duration=$((finished_at - current_started_at))

    if [[ "$status" -eq 0 ]]; then
      append_summary "OK $current_step (${duration}s) -> $(verify_display_path "$repo_root" "$current_log")"
      printf 'done: %s\n' "$current_step"
    else
      append_summary "FAIL $current_step (${duration}s) -> $(verify_display_path "$repo_root" "$current_log")"
      printf 'failed: %s -> %s\n' "$current_step" "$(verify_display_path "$repo_root" "$current_log")"
    fi
  done

  return "$overall_status"
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

  if ! run_theme_precheck_once "${steps[@]}"; then
    exit 1
  fi

  local -a parallel_steps=()
  local -a serial_steps=()
  local step
  for step in "${steps[@]}"; do
    if [[ "$step" == test ]]; then
      serial_steps+=("$step")
    else
      parallel_steps+=("$step")
    fi
  done

  if ! run_step_batch parallel_steps; then
    exit 1
  fi

  if ! run_step_batch serial_steps; then
    exit 1
  fi

  printf 'frontend OK -> %s\n' "$(display_path "$report_dir")"
}

main "$@"
