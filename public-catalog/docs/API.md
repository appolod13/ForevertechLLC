# Public Catalog API

Base URL: `/api/generate`

## Authentication
- Header: `Authorization: Bearer <API_KEY>` or `X-API-Key: <API_KEY>`
- If `PUBLIC_CATALOG_API_KEY` is not set, local/dev requests are allowed.

## Rate Limiting
- Default: 60 requests/min per client (IP + UA), 120/min for asset generation.
- Errors return `429` with `{ success:false, error:"rate_limited", details:{ resetAt } }`.

## Endpoints

### POST `/image`
Generate AI image for a platform.
- Request:
```json
{ "prompt": "A futuristic city", "platform": "twitter", "provider": "mock" }
```
- Response:
```json
{ "success": true, "data": { "image_url": "data:image/svg+xml;...", "meta": { "provider":"mock", "width":1280, "height":720, "ratio":"16:9" } } }
```
- Errors: `400 validation_error`, `401 unauthorized`, `429 rate_limited`, `500 internal_error`

### POST `/asset`
Generate an asset.
- Request:
```json
{ "type":"thumbnail", "provider":"mock", "prompt":"Rainbow logo" }
```
- Response:
```json
{ "success": true, "data": { "asset_url": "/assets/generated/thumbnail/<id>.json", "meta": { "provider":"mock", "type":"thumbnail" } } }
```

### POST `/content`
Generate captions and images across platforms.
- Request:
```json
{
  "topic":"Launch day",
  "platforms":["linkedin","instagram","twitter"],
  "imageProvider":"mock",
  "safetyEnabled":true,
  "mode":"full",
  "autoSocialEnabled":true
}
```
- Response:
```json
{ "success": true, "data": { "items": [ { "platform":"twitter","text_content":"...", "image_url":"data:image...", "generation_metadata":{} } ] } }
```

### GET `/logs`
Recent API logs.
- Response:
```json
{ "success": true, "data": { "logs": [ { "level":"info","msg":"..." } ] } }
```

## Health
- GET `/api/health` → `{ ok:true, time, uptimeSec, version, node, ... }`

## Status Codes
- 200: success
- 400: validation_error
- 401: unauthorized
- 429: rate_limited
- 500: internal_error

## Notes
- Inputs are validated and sanitized. PII filters and prompt safety are applied where applicable.
- Caching: producers may be memoized by prompt; clients should cache responses via ETag or application logic.
