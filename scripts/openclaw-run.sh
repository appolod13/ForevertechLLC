#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# OpenClaw Local Runner (project-isolated)
#
# Purpose:
# - Runs the OpenClaw gateway using project-local, sandbox-friendly directories.
# - Avoids writing to ~/.openclaw by setting these env vars to paths inside
#   the repo:
#     OPENCLAW_CONFIG_PATH
#     OPENCLAW_STATE_DIR
#     OPENCLAW_WORKSPACE_DIR
#
# Usage:
#   scripts/openclaw-run.sh [--no-channels]
#     --no-channels  Skips channel startup (OPENCLAW_SKIP_CHANNELS=1, CLAWDBOT_SKIP_CHANNELS=1)
#
# Requirements:
# - pnpm (>=10.23.0) and Node (>=22.12.0)
# - The openclaw submodule must be initialized at ./openclaw
#
# This script will:
# - Create project-local directories if missing
# - Export environment variables pointing to those directories
# - Start the gateway without --dev to avoid home-dir writes in sandboxed envs
# -----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OPENCLAW_DIR="${PROJECT_ROOT}/openclaw"

# Directories inside the project root for isolation
LOCAL_BASE_DIR="${PROJECT_ROOT}/.openclaw"
LOCAL_STATE_DIR="${LOCAL_BASE_DIR}/state"
LOCAL_WORKSPACE_DIR="${LOCAL_BASE_DIR}/workspace"
LOCAL_CONFIG_PATH="${LOCAL_BASE_DIR}/openclaw.json"

log() { printf '%s\n' "$*" >&2; }
die() { printf 'Error: %s\n' "$*" >&2; exit 1; }

# Check submodule presence
if [[ ! -d "${OPENCLAW_DIR}/.git" && ! -d "${OPENCLAW_DIR}" ]]; then
  die "OpenClaw submodule not found at ${OPENCLAW_DIR}. Run: git submodule update --init --recursive"
fi

# Check pnpm availability
if ! command -v pnpm >/dev/null 2>&1; then
  die "pnpm is required. Install pnpm and retry."
fi

# Parse args
SKIP_CHANNELS="0"
if [[ "${1:-}" == "--no-channels" ]]; then
  SKIP_CHANNELS="1"
fi

# Create directories
mkdir -p "${LOCAL_BASE_DIR}" "${LOCAL_STATE_DIR}" "${LOCAL_WORKSPACE_DIR}"
config_compact="$(tr -d ' \n\r\t' < "${LOCAL_CONFIG_PATH}" 2>/dev/null || true)"
if [[ ! -s "${LOCAL_CONFIG_PATH}" || "${config_compact}" == "{}" ]]; then
  # Minimal JSON5 config for frictionless local startup
  cat >"${LOCAL_CONFIG_PATH}" <<'JSON5'
{
  // Local, non-networked gateway
  gateway: {
    mode: "local",
    http: { endpoints: { responses: { enabled: true } } },
  },
  // Point agent workspace to project-local directory
  agents: { defaults: { workspace: "./.openclaw/workspace" } }
}
JSON5
fi

# Export envs to isolate all file writes within the project
export OPENCLAW_CONFIG_PATH="${LOCAL_CONFIG_PATH}"
export OPENCLAW_STATE_DIR="${LOCAL_STATE_DIR}"
export OPENCLAW_WORKSPACE_DIR="${LOCAL_WORKSPACE_DIR}"

if [[ "${SKIP_CHANNELS}" == "1" ]]; then
  export OPENCLAW_SKIP_CHANNELS="1"
  export CLAWDBOT_SKIP_CHANNELS="1"
fi

# Ensure gateway auth token for local run (env overrides config)
if [[ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ]]; then
  # Generate a simple local token; suitable for dev-only usage
  OPENCLAW_GATEWAY_TOKEN="local-dev-$(date +%s)"
  export OPENCLAW_GATEWAY_TOKEN
  log "Using generated OPENCLAW_GATEWAY_TOKEN"
fi

# Install deps (idempotent; fast with pnpm store cache)
log "Ensuring OpenClaw dependencies are installed..."
(
  cd "${OPENCLAW_DIR}"
  pnpm install --frozen-lockfile
)

# Start gateway without --dev to avoid sandboxed home writes
log "Starting OpenClaw gateway (isolated paths)..."
(
  cd "${OPENCLAW_DIR}"
  # Directly invoke the CLI entry with 'gateway' subcommand (non-dev)
  # Equivalent to: pnpm openclaw -- gateway
  node scripts/run-node.mjs gateway --allow-unconfigured
)

log "OpenClaw gateway exited."
