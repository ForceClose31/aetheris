# Aetheris

2D Pixel Medieval Fantasy RPG. See `AGENTS.md` for the source-of-truth spec, `docs/GDD.md` for game design, and `docs/TDD.md` for technical design.

## Stack

- **Engine:** Phaser 3 (TypeScript, strict)
- **Build:** Vite
- **Tests:** Vitest
- **Lint/Format:** ESLint 9 (flat config) + Prettier
- **Schemas:** Zod
- **Package manager:** pnpm (via Corepack)

## Platform priority

1. Web (primary, served as a static site)
2. Windows desktop via Tauri wrapper (later phase)
3. Linux/macOS desktop via Tauri (architecture-ready)
4. Mobile (architecture-ready, not v1)

## Prerequisites

- Node.js >= 20.10
- Corepack enabled: `corepack enable && corepack prepare pnpm@9.15.0 --activate`

## Setup

```sh
pnpm install
```

## Common scripts

| Script                     | Purpose                                                     |
|----------------------------|-------------------------------------------------------------|
| `pnpm dev`                 | Start the Vite dev server at http://127.0.0.1:5173          |
| `pnpm build`               | Type-check and build the production bundle                  |
| `pnpm preview`             | Preview the production bundle                               |
| `pnpm typecheck`           | TypeScript strict type-check                                |
| `pnpm lint`                | ESLint                                                      |
| `pnpm format`              | Prettier write                                              |
| `pnpm test`                | Vitest one-shot                                             |
| `pnpm test:watch`          | Vitest watch mode                                           |
| `pnpm content:validate`    | Validate all JSON content files against Zod schemas         |
| `pnpm verify`              | Full local CI pipeline (typecheck + lint + test + content)  |

## Project layout

See `docs/TDD.md` Section 3.

## Status

Phase 0 (Foundations). No gameplay code yet. The Title scene shows a placeholder splash.
