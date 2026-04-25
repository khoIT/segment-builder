#!/usr/bin/env node
// Cross-platform DB reset: drop + recreate + migrate + seed.
// Requires `docker compose -f infra/docker-compose.yml up -d postgres`.
const { spawnSync } = require('node:child_process');

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('[reset-db] dropping + recreating bedrock database');
sh('docker', ['compose', '-f', 'infra/docker-compose.yml', 'exec', '-T', 'postgres',
  'psql', '-U', 'bedrock', '-d', 'postgres', '-c', 'DROP DATABASE IF EXISTS bedrock']);
sh('docker', ['compose', '-f', 'infra/docker-compose.yml', 'exec', '-T', 'postgres',
  'psql', '-U', 'bedrock', '-d', 'postgres', '-c', 'CREATE DATABASE bedrock']);

console.log('[reset-db] applying migrations');
sh('pnpm', ['migrate']);

console.log('[reset-db] seeding');
sh('pnpm', ['seed']);

console.log('[reset-db] done');
