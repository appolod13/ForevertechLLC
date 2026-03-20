## ForeverTeck Studio Cross-Agent Architecture

### Architectural Patterns Adopted
Multi-agent repositories tagged under `cross-agent` and broader multi-agent topics commonly converge on:
- **Role separation**: planner → critic(s) → optimizer aggregation
- **Best-effort execution**: partial failures do not block an overall result
- **Durable handoff artifacts**: structured reports and logs, not only final outputs
- **Local-first safety**: ability to run on localhost without exposing secrets
- **Observability**: consistent request IDs, stage logs, and minimal secret exposure

### Implementation in This Repo
**Frontend**
- Studio page `/studio` adds a cross-agent prompt optimization action that rewrites the prompt in-place and renders per-model reports for traceability.

**Backend**
- `POST /api/agents/cross-optimize`
  - Calls an OpenAI-compatible API across multiple models (planner + critics)
  - Optionally calls OpenClaw Gateway (OpenResponses HTTP API) as an additional critic
  - Aggregates outputs into `optimizedPrompt` and returns `reports[]` (including per-provider errors)

**Asset Pipeline**
- `POST /api/generate/image`
  - Supports `quantum_mode` (Wolfram/Qiskit-backed service)
  - Supports `ipfs_upload` via IPFS HTTP API when configured
  - Includes an in-process cache (TTL) keyed by prompt+params to speed up repeated requests

**Live Chat**
- `GET /api/chat/stream` (SSE)
  - Broadcasts `message` events for real-time discussion and asset importing
  - Stores a bounded message history in process memory

**OpenClaw Integration**
- `./scripts/openclaw-run.sh` runs the OpenClaw gateway locally and enables OpenResponses:
  - `POST http://127.0.0.1:18789/v1/responses`
  - Token auth via `OPENCLAW_GATEWAY_TOKEN`

### Port Policy (Local)
Local development runs exclusively on:
- `http://localhost:3001` (Next.js public-catalog)

### Monitoring
- `scripts/monitor-3001.sh` provides a simple health probe for cron/CI.

### Testing
- Unit/integration tests validate:
  - cross-optimize route behavior with mocked providers
  - existing Studio behavior via vitest/react-testing-library
