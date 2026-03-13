#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Simple HTTP Monitor for a service on port 3002
#
# Pings a target URL and reports status. If ALERT_WEBHOOK_URL is set,
# posts a JSON payload with the result. Intended for cron or CI usage.
# -----------------------------------------------------------------------------
set -euo pipefail

TARGET_URL="${TARGET_URL:-http://172.20.10.6:3002/}"
TIMEOUT="${TIMEOUT:-5}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { printf '%s %s\n' "$(ts)" "$*" >&2; }

status="unknown"
code=""
err=""

if output=$(curl -sS -m "${TIMEOUT}" -o /dev/null -w "%{http_code}" "${TARGET_URL}" 2>&1); then
  code="${output}"
  if [[ "${code}" =~ ^2[0-9][0-9]$ || "${code}" =~ ^3[0-9][0-9]$ ]]; then
    status="up"
  else
    status="degraded"
  fi
else
  err="${output}"
  status="down"
fi

log "Monitor result: status=${status} code=${code} url=${TARGET_URL}"

payload=$(cat <<JSON
{"status":"${status}","code":"${code}","url":"${TARGET_URL}","time":"$(ts)","error":"${err}"}
JSON
)

if [[ -n "${ALERT_WEBHOOK_URL}" ]]; then
  curl -sS -m "${TIMEOUT}" -X POST -H "content-type: application/json" -d "${payload}" "${ALERT_WEBHOOK_URL}" >/dev/null || true
fi

if [[ "${status}" != "up" ]]; then
  exit 2
fi
