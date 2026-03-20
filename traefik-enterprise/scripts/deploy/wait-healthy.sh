#!/usr/bin/env sh

set -eu

TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-240}"
SLEEP_SECONDS="${SLEEP_SECONDS:-5}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { printf '%s %s\n' "$(ts)" "$*" >&2; }

containers="traefik public-catalog quantum-image-gen web-app static-server"

deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
log "wait_healthy start timeout=${TIMEOUT_SECONDS}s containers=${containers}"

while :; do
  now=$(date +%s)
  if [ "${now}" -ge "${deadline}" ]; then
    log "wait_healthy timeout"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | sed -n '1,40p' || true
    for c in ${containers}; do
      docker logs --tail=80 "${c}" 2>/dev/null || true
    done
    exit 2
  fi

  ok=1
  for c in ${containers}; do
    if ! docker inspect "${c}" >/dev/null 2>&1; then
      ok=0
      log "container_missing name=${c}"
      continue
    fi

    running="$(docker inspect -f '{{.State.Running}}' "${c}" 2>/dev/null || echo false)"
    if [ "${running}" != "true" ]; then
      ok=0
      status="$(docker inspect -f '{{.State.Status}}' "${c}" 2>/dev/null || echo unknown)"
      log "container_not_running name=${c} status=${status}"
      continue
    fi

    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${c}" 2>/dev/null || echo unknown)"
    if [ "${health}" = "none" ]; then
      continue
    fi
    if [ "${health}" != "healthy" ]; then
      ok=0
      log "container_unhealthy name=${c} health=${health}"
    fi
  done

  if [ "${ok}" -eq 1 ]; then
    log "wait_healthy ok"
    exit 0
  fi

  sleep "${SLEEP_SECONDS}"
done

