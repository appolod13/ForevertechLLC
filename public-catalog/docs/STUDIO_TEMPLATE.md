# Studio Template Baseline

The canonical baseline for Studio work is:

- `src/app/studio/page.tsx`
- on the current `main` branch

## Rule

When making future Studio changes, build on the current `main` Studio page template instead of restoring older Studio variants from deleted branches unless explicitly requested.

## Current Template Characteristics

The default Studio template currently includes:

- a simple two-column `Creator Studio` layout
- the `AI Asset Generator` section
- the `Generate Asset & Content` primary button
- the helper text:
  - `Generate with a real quantum computer.`
- the latest build preview panel
- the `Multi-Channel Poster` panel

## Guardrail

Do not assume older Studio certificate layouts, removed controls, or deleted branch versions are the default source of truth.

If a future change needs older Studio functionality, confirm that explicitly before rebuilding or restoring it.
