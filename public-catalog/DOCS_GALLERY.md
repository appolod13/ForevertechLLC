
# Image Gallery & Scraping Integration Documentation

## Overview
The Image Gallery module provides a centralized interface for managing visual assets. It integrates with the Screenshot Manager Service to capture, analyze, and display images from external URLs.

## Architecture

```mermaid
graph TD
    Client[Frontend (Next.js)] -->|Fetch/Capture| Proxy[Screenshot Service (Node.js :4000)]
    Proxy -->|Puppeteer| Web[External Websites]
    Proxy -->|GPT-4 Vision| AI[OpenAI API]
    Proxy -->|Save| FS[Local Filesystem]
    
    Client -->|SSE Updates| MainServer[Mirror Site API (Node.js :3000)]
```

## Key Components

### 1. Frontend (`/gallery`)
- **Responsive Grid**: Displays screenshots in a masonry-like layout.
- **Capture Tool**: Allows users to input a URL and trigger a real-time capture.
- **Live Updates**: Uses React state to refresh the grid after capture.

### 2. Backend Services
- **Screenshot Manager**: 
  - `POST /api/capture`: Takes `{ url }`, launches Headless Chrome, captures full page/viewport, and saves to disk.
  - `GET /api/screenshots`: Lists available images.
- **Mirror Site (Main API)**:
  - `GET /api/events`: Server-Sent Events stream for system status.

## Troubleshooting

### `net::ERR_ABORTED` on `/api/events`
**Cause**: This error typically indicates the SSE connection was closed unexpectedly or blocked by CORS.
**Solution**: 
- We added `Access-Control-Allow-Origin: *` to the SSE endpoint headers.
- We implemented a 15s heartbeat (ping) to keep the connection alive through proxies/load balancers.

### Image Loading Failures
- **Check Service Status**: Ensure `node server.js` is running in `ecommerce-agents/screenshot-manager-service/integrated-service`.
- **Port Conflicts**: The service runs on port 4000. Check `lsof -i :4000`.
- **CORS**: The service must allow requests from `localhost:3002`.

## API Reference

### Capture Screenshot
```http
POST http://localhost:4000/api/capture
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### List Screenshots
```http
GET http://localhost:4000/api/screenshots
```

## Performance Optimization
- **Lazy Loading**: Images use native lazy loading (`loading="lazy"` on `img` tags is default in modern browsers, or use `next/image`).
- **Caching**: The gallery list is fetched on mount.
- **Concurrency**: Captures are handled asynchronously.

## Security
- **Input Validation**: URLs are validated before processing.
- **Sandboxing**: Puppeteer runs with `--no-sandbox` (required for containerized envs) but should be isolated in production.
