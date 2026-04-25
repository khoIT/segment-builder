# Multi-stage build for staging/CI. Local dev uses `pnpm dev` instead.
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/catalog-api/package.json apps/catalog-api/
COPY packages packages
RUN pnpm install --frozen-lockfile --filter @bedrock/catalog-api... --filter @bedrock/contracts...

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY --from=deps /app /app
COPY apps/catalog-api apps/catalog-api
RUN pnpm --filter @bedrock/contracts build && pnpm --filter @bedrock/catalog-api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --from=builder --chown=node:node /app/apps/catalog-api/dist ./dist
COPY --from=builder --chown=node:node /app/apps/catalog-api/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages packages
COPY --from=builder --chown=node:node /app/apps/catalog-api/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/main.js"]
