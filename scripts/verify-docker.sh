#!/usr/bin/env bash
set -Eeuo pipefail

verify_docker_probe() {
  local output

  if ! command -v docker >/dev/null 2>&1; then
    printf 'missing docker binary'
    return 1
  fi

  if output="$(docker version 2>&1)"; then
    return 0
  fi

  if [[ "$output" == *"permission denied"* ]]; then
    printf 'cannot access the docker socket'
  else
    printf '%s' "${output//$'\n'/ }"
  fi
  return 1
}

verify_docker_require() {
  local reason
  if reason="$(verify_docker_probe)"; then
    return 0
  fi

  if [[ "$reason" == "missing docker binary" ]]; then
    printf 'verify failed: docker is required for %s\n' "$1" >&2
  else
    printf 'verify failed: docker is not usable for %s (%s)\n' "$1" "$reason" >&2
  fi
  return 1
}

verify_docker_cache_root() {
  printf '%s/gonezo-docker' "${XDG_CACHE_HOME:-/tmp}"
}

verify_docker_build_image() {
  local image_name="$1"
  local dockerfile="$2"
  local context_dir="$3"

  docker build --file "$dockerfile" --tag "$image_name" "$context_dir"
}

verify_docker_run_frontend() {
  local repo_root="$1"
  local image_name="$2"
  shift 2

  local cache_root
  cache_root="$(verify_docker_cache_root)"
  mkdir -p "$cache_root/npm" "$cache_root/node_modules"

  docker run --rm --init --ipc=host \
    --user "$(id -u):$(id -g)" \
    --env CI=1 \
    --env HOME=/tmp \
    --env NPM_CONFIG_CACHE=/tmp/npm-cache \
    --volume "$repo_root:$repo_root" \
    --volume "$cache_root/npm:/tmp/npm-cache" \
    --volume "$cache_root/node_modules:$repo_root/app/node_modules" \
    --workdir "$repo_root" \
    "$image_name" \
    "$@"
}
