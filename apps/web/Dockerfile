# Builds the static Vite bundle and serves with nginx-alpine. Dokploy
# uses the root nixpacks.toml for now; this Dockerfile is for the
# fullstack docker-compose profile + future Kubernetes deploys.
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages packages
RUN pnpm install --frozen-lockfile --filter @bedrock/web... --filter @bedrock/contracts...

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY --from=deps /app /app
COPY apps/web apps/web
RUN pnpm --filter @bedrock/contracts build && pnpm --filter @bedrock/web build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
