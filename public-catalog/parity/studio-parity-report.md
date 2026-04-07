# Studio Parity Report

Generated: 2026-03-20T14:40:00.683Z

## Baselines

```json
{
  "production": {
    "name": "production",
    "baseUrl": "https://foreverteck.com",
    "collectedAt": "2026-03-20T14:37:37.641Z",
    "http": {
      "studio": {
        "status": 200,
        "headers": {
          "cache-control": "s-maxage=31536000",
          "content-type": "text/html; charset=utf-8",
          "x-nextjs-cache": "HIT",
          "x-nextjs-prerender": "1, 1",
          "cf-cache-status": "DYNAMIC",
          "server": "cloudflare"
        },
        "containsStudioMarker": false
      },
      "health": {
        "status": 200,
        "headers": {
          "content-type": "application/json"
        }
      },
      "generateImage": {
        "status": 200,
        "headers": {
          "content-type": "application/json"
        },
        "success": true
      }
    },
    "latency": {
      "health": {
        "count": 40,
        "okCount": 40,
        "p50Ms": 65.3837110000004,
        "p95Ms": 105.51619200000005,
        "p99Ms": 150.3615380000001
      },
      "generateImage": {
        "count": 20,
        "okCount": 20,
        "p50Ms": 5189.350573999996,
        "p95Ms": 5509.107888999992,
        "p99Ms": 5521.221565
      }
    }
  },
  "local": {
    "name": "local",
    "baseUrl": "http://127.0.0.1:3001",
    "collectedAt": "2026-03-20T14:39:31.345Z",
    "http": {
      "studio": {
        "status": 200,
        "headers": {
          "cache-control": "no-store, must-revalidate",
          "content-type": "text/html; charset=utf-8"
        },
        "containsStudioMarker": true
      },
      "health": {
        "status": 200,
        "headers": {
          "content-type": "application/json"
        }
      },
      "generateImage": {
        "status": 200,
        "headers": {
          "content-type": "application/json"
        },
        "success": true
      }
    },
    "latency": {
      "health": {
        "count": 40,
        "okCount": 40,
        "p50Ms": 54.62675600001239,
        "p95Ms": 199.5999699999811,
        "p99Ms": 384.9352699999872
      },
      "generateImage": {
        "count": 20,
        "okCount": 20,
        "p50Ms": 42.994874999974854,
        "p95Ms": 474.18130100000417,
        "p99Ms": 1113.6200550000067
      }
    }
  }
}
```

## Traceability Matrix

| Area | Production | Local | Severity | Domain | Notes |
|---|---|---|---|---|---|
| Caching: /studio Cache-Control | s-maxage=31536000 | no-store, must-revalidate | critical | infrastructure/configuration | Prod is cacheable (s-maxage) while local is no-store. This can cause stale Studio UI and runtime behavior mismatches. |
| Caching: Next.js cache signal | HIT | (missing) | major | infrastructure | Prod indicates cached response; local dev does not. Validate headers() config is deployed and purge CDN. |
| UI: Studio marker in HTML | false | true | major | code/rendering | Curl HTML content differs; check client-side rendering and route fallback behavior. |
