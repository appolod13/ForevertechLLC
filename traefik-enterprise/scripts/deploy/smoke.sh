#!/usr/bin/env sh

set -eu

TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-10}"
CATALOG_HOST_PORT="${CATALOG_HOST_PORT:-3001}"
DOMAIN="${DOMAIN:-}"
SKIP_HTTPS_SMOKE="${SKIP_HTTPS_SMOKE:-0}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { printf '%s %s\n' "$(ts)" "$*" >&2; }

curl_ok() {
  url="$1"
  curl -fsS -m "${TIMEOUT_SECONDS}" -o /dev/null "$url"
}

log "smoke_start local=http://127.0.0.1:${CATALOG_HOST_PORT}"

curl_ok "http://127.0.0.1:${CATALOG_HOST_PORT}/api/health"
curl_ok "http://127.0.0.1:${CATALOG_HOST_PORT}/studio"

if [ -n "${DOMAIN}" ] && [ "${SKIP_HTTPS_SMOKE}" != "1" ]; then
  log "smoke_https domain=${DOMAIN}"
  curl_ok "https://${DOMAIN}/api/health"
  curl_ok "https://${DOMAIN}/studio"
fi

log "smoke_ok"

