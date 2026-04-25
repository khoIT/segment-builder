# Bedrock

> "The foundation LiveOps builds on."

Internal VNGGames prototype for the full LiveOps data pipeline:
raw sources → mappings → master tables → metrics & SLAs → features/models →
segments → campaigns → analytics.

## Layout (pnpm + turborepo monorepo)

```
bedrock/
├── apps/
│   ├── web/             # Vite + React 18 prototype (was the whole repo pre-monorepo)
│   ├── catalog-api/     # NestJS — Postgres-backed metadata service (port 3001)
│   └── query-svc/       # NestJS — Trino-backed read/exec service  (port 3002)
├── packages/
│   ├── contracts/       # zod schemas + REST DTOs shared between web ⇄ apis
│   ├── tsconfig/        # base / react / node tsconfig presets
│   └── eslint-config/   # shared eslint preset
├── plans/               # implementation plans (excluded from npm publish)
├── docs/                # architecture, design system, deployment notes
├── package.json         # workspace root: turbo + serve (Dokploy start)
├── pnpm-workspace.yaml
├── turbo.json
└── nixpacks.toml        # Dokploy build config (web only for now)
```

See `plans/260425-0929-microservices-bedrock-split/plan.md` for the active
phase plan and `docs/design-system.md` for the canonical design language.

## Prerequisites

- Node ≥ 20 (tested on 22.x)
- pnpm ≥ 9 (`corepack enable && corepack prepare pnpm@latest --activate`)

## Getting started

```bash
pnpm install        # installs the entire workspace
pnpm dev            # turbo: vite (5173) + catalog-api (3001) + query-svc (3002) + contracts watch
pnpm build          # builds every package via turbo
pnpm typecheck      # tsc --noEmit across the workspace
pnpm lint           # eslint (per package)
```

Per-package commands use pnpm filters:

```bash
pnpm --filter @bedrock/web dev
pnpm --filter @bedrock/catalog-api start:dev
pnpm --filter @bedrock/query-svc start:dev
```

## Deploy

Dokploy + Nixpacks. `nixpacks.toml` builds `apps/web` and the root `start`
script serves the static bundle:

```
serve -s apps/web/dist -l tcp://0.0.0.0:${PORT:-3000}
```

Catalog API and Query Service get their own pipelines once their endpoints
land (phases 03–06).

## Repo origin

```
git remote -v   # code.vnggames.ai/khoitn/segment-builder
```
