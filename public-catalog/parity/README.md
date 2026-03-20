# Parity Harness

## Purpose
Generate an automated baseline comparison between:
- Local: `http://127.0.0.1:3001`
- Production: `https://foreverteck.com`

Outputs:
- `parity/studio-parity-report.md`
- `parity/studio-parity-report.json`

## Run
Start local dev server:
```bash
pnpm dev
```

Run the collection:
```bash
pnpm parity:collect
```

Override URLs:
```bash
LOCAL_BASE_URL=http://127.0.0.1:3001 PROD_BASE_URL=https://foreverteck.com pnpm parity:collect
```

