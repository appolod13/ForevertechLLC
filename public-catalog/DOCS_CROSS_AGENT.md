## Cross-Agent Prompt Optimization

### Goal
Provide a production-safe, multi-model prompt optimization pipeline inside `/studio` that:
- Cross-references multiple LLM outputs (planner + critics)
- Survives partial provider failures (best-effort aggregation)
- Optionally integrates OpenClaw Gateway via OpenResponses HTTP API

### API
- Endpoint: `POST /api/agents/cross-optimize`
- Request body:
  - `prompt` (string, required)
  - `goals` (string[], optional)
  - `models` (string[], optional) – OpenAI-compatible model names
  - `includeOpenClaw` (boolean, optional)
- Response:
  - `data.optimizedPrompt` (string)
  - `data.reports[]` (per-model outputs + errors)

### Providers
**OpenAI-compatible (default)**
- `OPENAI_BASE_URL` (default `https://api.openai.com`)
- `OPENAI_API_KEY` (required to enable)
- `CROSS_AGENT_MODELS` (comma-separated model list; default `gpt-4o-mini`)

**OpenClaw (optional)**
- `OPENCLAW_OPENRESPONSES_URL` (default `http://127.0.0.1:18789/v1/responses`)
- `OPENCLAW_GATEWAY_TOKEN` (required when `includeOpenClaw=true`)
- `OPENCLAW_AGENT_ID` (default `main`)

### Studio UI
`/studio` includes an **Optimize Prompt (Cross-Agent)** button that:
- Calls `/api/agents/cross-optimize`
- Replaces the prompt textarea value with `optimizedPrompt`
- Displays per-model reports in a compact debug panel

### Running OpenClaw Gateway Locally
From repo root:
```bash
./scripts/openclaw-run.sh
```
This enables the OpenResponses endpoint (dev-only) and prints the local listening address in the gateway logs.

