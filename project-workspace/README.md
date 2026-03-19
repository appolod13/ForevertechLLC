# Project Workspace

This workspace provides a clean foundation for cross-language development with:
- TypeScript library scaffold (Rollup build, ESLint/Prettier, Vitest tests)
- Python tooling (black, flake8, pytest) via `requirements.txt`
- Standard structure: `src/`, `tests/`, `docs/`, `config/`

## Structure
- `src/` — Source code (TypeScript)
- `tests/` — Vitest unit tests
- `docs/` — Documentation stubs (API docs can live here)
- `config/` — Build/test/CI configs

## Scripts
- `npm run build` — Build with Rollup (outputs CJS+ESM)
- `npm run test` — Run unit tests (Vitest)
- `npm run coverage` — Tests with coverage (c8)
- `npm run lint` — Lint with ESLint
- `npm run format` — Format with Prettier
- `npm run typecheck` — TypeScript type checking

## Getting Started
```bash
cd project-workspace
npm install
npm run lint
npm run test
npm run build
```

## Contribution Guidelines
See `CONTRIBUTING.md` for coding standards, commit style, and review process.

