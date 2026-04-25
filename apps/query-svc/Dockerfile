FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/query-svc/package.json apps/query-svc/
COPY packages packages
RUN pnpm install --frozen-lockfile --filter @bedrock/query-svc... --filter @bedrock/contracts...

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY --from=deps /app /app
COPY apps/query-svc apps/query-svc
RUN pnpm --filter @bedrock/contracts build && pnpm --filter @bedrock/query-svc build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --from=builder --chown=node:node /app/apps/query-svc/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages packages
COPY --from=builder --chown=node:node /app/apps/query-svc/package.json ./package.json
EXPOSE 3002
CMD ["node", "dist/main.js"]
