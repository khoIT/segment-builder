# Bedrock Infra

Local-dev infrastructure for the Bedrock monorepo.

## TL;DR

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d postgres
cp apps/catalog-api/.env.example apps/catalog-api/.env
cp apps/query-svc/.env.example apps/query-svc/.env
pnpm migrate
pnpm seed
pnpm dev
```

That brings up:

- Vite (web) on http://localhost:5173
- Catalog API on http://localhost:3001/api/v1
- Query Service on http://localhost:3002/api/v1
- Postgres on localhost:5432 (db: `bedrock`, user: `bedrock`, pwd: `dev`)

## Reset DB

```bash
pnpm reset-db
```

Drops + recreates `bedrock` and re-applies migrations + seed in <10s.

## Switch query driver

```bash
# query-svc/.env
QUERY_DRIVER=mock     # default — synthetic data, no Trino needed
QUERY_DRIVER=trino    # real cfm_vn data; needs TRINO_USER/PASSWORD
```

## Refresh mocks from real Trino

```bash
# infra/trino-mock/refresh.ts pulls schema + sample rows for the
# tables listed in priority-tables.json. PII columns get hashed
# before write. JSONL outputs are gitignored; *.schema.json is committed.
TRINO_USER=... TRINO_PASSWORD=... pnpm refresh-mocks
```

## Full-stack-in-containers (CI parity)

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.fullstack.yml up -d
# catalog-api → :3001, query-svc → :3002, postgres → :5432
```

Used by `.github/workflows/ci.yml`. Builds Nest apps via the per-app
Dockerfiles (multi-stage; non-root runner).

## Dokploy deploy

Root `nixpacks.toml` builds `apps/web` only. Backends will get their
own Dokploy pipelines once endpoints are live (track the post-launch
deploy follow-up in the plan).

## Architecture

```
┌──────────┐    REST     ┌──────────────┐    SQL    ┌────────┐
│ apps/web │────────────▶│ catalog-api  │──────────▶│ pg 16  │
│ vite/jsx │             │ NestJS+Drizzle│           └────────┘
└────┬─────┘             └──────┬───────┘
     │                          │ NDJSON build streams
     │  REST                    ▼
     └────────────────────▶┌──────────────┐    HTTP    ┌─────────┐
                           │ query-svc    │───────────▶│ Trino   │
                           │ NestJS+driver│            │(cfm_vn) │
                           └──────────────┘            └─────────┘
                                  │
                                  └─ MockJsonlDriver (default; no Trino needed)
```
