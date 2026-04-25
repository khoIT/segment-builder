#!/usr/bin/env node
// Cross-platform DB reset: drop + recreate + migrate + seed.
// Requires `docker compose -f infra/docker-compose.yml up -d postgres`.
//
// We use dropdb/createdb (not raw psql -c "DROP DATABASE ...") because
// shell-quoting an SQL string with spaces is unreliable across cmd.exe,
// PowerShell, and bash. dropdb takes the database name as a single arg
// → no quoting issues.
const { spawnSync } = require('node:child_process');

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const compose = ['compose', '-f', 'infra/docker-compose.yml', 'exec', '-T', 'postgres'];

console.log('[reset-db] dropping + recreating bedrock database');
sh('docker', [...compose, 'dropdb',   '-U', 'bedrock', '--if-exists', 'bedrock']);
sh('docker', [...compose, 'createdb', '-U', 'bedrock', 'bedrock']);

console.log('[reset-db] applying migrations');
sh('pnpm', ['migrate']);

console.log('[reset-db] seeding');
sh('pnpm', ['seed']);

console.log('[reset-db] done');
