import { config as dotenvConfig } from 'dotenv';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Trino, BasicAuth } from 'trino-client';

// TRINO_* lives in apps/query-svc/.env (no infra-local .env).
const here = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: join(here, '..', '..', 'apps', 'query-svc', '.env') });

// Discovery probe: enumerate schemas in the configured catalog and, if
// `ballistar` (or anything ballistar-shaped) is present, list its tables.
// Used as a one-off planning step before adding to priority-tables.json.

async function main() {
  const host = process.env.TRINO_HOST_FQDN;
  const port = process.env.TRINO_PORT ?? '8080';
  const user = process.env.TRINO_USER;
  const password = process.env.TRINO_PASSWORD;
  const catalog = process.env.TRINO_CATALOG ?? 'iceberg';
  if (!host || !user || !password) throw new Error('TRINO env missing');

  const client = Trino.create({
    server: `https://${host}:${port}`,
    catalog,
    schema: 'information_schema',
    auth: new BasicAuth(user, password),
  });

  const schemas = await collect(client, `SELECT schema_name FROM ${catalog}.information_schema.schemata ORDER BY 1`);
  const all = schemas.rows.map((r) => String(r[0]));
  console.log(`[probe] ${catalog} has ${all.length} schemas`);
  const candidates = all.filter((s) => /ballistar|blstr/i.test(s));
  console.log(`[probe] ballistar-shaped schemas: ${candidates.join(', ') || '(none)'}`);

  for (const schema of candidates) {
    const tables = await collect(client, `SELECT table_name FROM ${catalog}.information_schema.tables WHERE table_schema = '${schema}' ORDER BY 1`);
    console.log(`\n[probe] ${catalog}.${schema} — ${tables.rows.length} tables:`);
    for (const r of tables.rows) console.log(`  - ${r[0]}`);
  }
}

async function collect(client: Trino, sql: string) {
  const iter = await client.query(sql);
  const rows: unknown[][] = [];
  for await (const r of iter) {
    const err = (r as unknown as { error?: { message?: string } }).error;
    if (err) throw new Error(err.message ?? 'trino error');
    if (r.data) for (const row of r.data) rows.push(row as unknown[]);
  }
  return { rows };
}

main().catch((err) => { console.error('[probe] failed', err); process.exit(1); });
