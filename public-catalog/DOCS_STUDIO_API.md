## Studio API

### Image Generation
`POST /api/generate/image`

**Request**
```json
{
  "prompt": "string",
  "negative_prompt": "string (optional)",
  "width": 1024,
  "height": 1024,
  "quantum_mode": true,
  "ipfs_upload": true
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "image_url": "https://... or /images/...",
    "meta": {
      "provider": "string",
      "width": 1024,
      "height": 1024,
      "ipfs_status": "disabled|failed|uploaded",
      "ipfs_url": "ipfs://...",
      "ipfs_gateway": "https://..."
    },
    "requestId": "uuid",
    "cached": true
  }
}
```

### Cross-Agent Prompt Optimization
`POST /api/agents/cross-optimize`

**Request**
```json
{
  "prompt": "string",
  "goals": ["string"],
  "models": ["string"],
  "includeOpenClaw": true
}
```

### Live Chat (Studio)
**History**
- `GET /api/chat/history`

**Send**
- `POST /api/chat/message`
```json
{ "user": "Guest", "text": "string", "assetUrl": "https://..." }
```

**Stream (SSE)**
- `GET /api/chat/stream`

### Environment Variables
**Quantum service**
- `AI_IMAGE_GEN_URL` (internal, example `http://quantum-image-gen:5328`)
- `NEXT_PUBLIC_QUANTUM_API_URL` (public base for serving `/images/...`)

**IPFS (HTTP API, Kubo-compatible)**
- `IPFS_API_URL` (example `http://ipfs:5001`)
- `IPFS_API_AUTH` (optional, supports `Bearer ...` or `Basic ...`)
- `IPFS_GATEWAY_BASE` (optional, example `https://ipfs.io/ipfs`)

