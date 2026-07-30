#!/usr/bin/env bash
set -Eeuo pipefail

verify_sanitize_step_name() {
  local name="$1"
  name="${name//:/-}"
  name="${name//\//-}"
  printf '%s' "$name"
}

verify_display_path() {
  local repo_root="$1"
  local path="$2"
  printf '%s' "${path#"$repo_root"/}"
}

verify_step_log_path() {
  local report_dir="$1"
  local step="$2"
  printf '%s/%s.log' "$report_dir" "$(verify_sanitize_step_name "$step")"
}

verify_append_summary() {
  local summary_file="$1"
  local line="$2"
  printf '%s\n' "$line" >>"$summary_file"
}

verify_init_report_dir() {
  local report_dir="$1"
  mkdir -p "$report_dir"
}

