import 'dotenv/config';
import { Trino, BasicAuth } from 'trino-client';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// `pnpm refresh-mocks` — pull schema + sample rows from real Trino into
// infra/trino-mock/data/<schema>/. Schemas are committed; JSONL samples
// are gitignored. PII columns (user_id|email|phone|ip|imei|device_id)
// are SHA-256 hashed before write.

const here = dirname(fileURLToPath(import.meta.url));
const PRIORITY_PATH = join(here, 'priority-tables.json');
const DATA_DIR = join(here, 'data');

const PII_COL = /(^|_)(user_id|email|phone|ip|imei|device_id|vopenid)($|_)/i;
const PII_HASH = (v: unknown) =>
  v == null ? null : createHash('sha256').update(String(v)).digest('hex').slice(0, 16);

async function main() {
  const host = process.env.TRINO_HOST_FQDN;
  const port = process.env.TRINO_PORT ?? '8080';
  const user = process.env.TRINO_USER;
  const password = process.env.TRINO_PASSWORD;
  const catalog = process.env.TRINO_CATALOG ?? 'iceberg';
  if (!host || !user || !password) {
    // eslint-disable-next-line no-console
    console.error('refresh-mocks requires TRINO_HOST_FQDN, TRINO_USER, TRINO_PASSWORD in env');
    process.exit(1);
  }

  const priority = JSON.parse(await readFile(PRIORITY_PATH, 'utf8'));
  delete priority._comment;

  for (const [schema, tables] of Object.entries(priority) as [string, string[]][]) {
    const dir = join(DATA_DIR, schema);
    await mkdir(dir, { recursive: true });

    const client = Trino.create({
      server: `https://${host}:${port}`,
      catalog,
      schema,
      auth: new BasicAuth(user, password),
    });

    for (const table of tables) {
      // eslint-disable-next-line no-console
      console.log(`[refresh] ${catalog}.${schema}.${table}`);

      // 1) DESCRIBE → schema.json
      try {
        const desc = await collect(client, `DESCRIBE ${catalog}.${schema}.${table}`);
        const cols = desc.rows.map((r) => ({ name: r[0], type: r[1], nullable: r[2] }));
        const piiCols = cols.filter((c) => PII_COL.test(String(c.name))).map((c) => c.name);
        await writeFile(
          join(dir, `${table}.schema.json`),
          JSON.stringify({ catalog, schema, table, columns: cols, piiCols }, null, 2),
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[refresh] DESCRIBE failed for ${table}: ${err instanceof Error ? err.message : err}`);
        continue;
      }

      // 2) SELECT * LIMIT 1000 → sample.jsonl (PII hashed)
      try {
        const sample = await collect(
          client,
          `SELECT * FROM ${catalog}.${schema}.${table} LIMIT 1000`,
          1000,
        );
        const piiIdx = sample.columns
          .map((c, i) => (PII_COL.test(c) ? i : -1))
          .filter((i) => i >= 0);
        const lines = sample.rows.map((row) => {
          const out = Object.fromEntries(sample.columns.map((c, i) => [c, row[i]]));
          for (const idx of piiIdx) {
            out[sample.columns[idx]] = PII_HASH(row[idx]);
          }
          return JSON.stringify(out);
        });
        await writeFile(join(dir, `${table}.sample.jsonl`), lines.join('\n'));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[refresh] SELECT failed for ${table}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log('[refresh] done');
}

async function collect(client: Trino, sql: string, cap = 10_000) {
  const iter = await client.query(sql);
  const rows: unknown[][] = [];
  let columns: string[] = [];
  for await (const r of iter) {
    if (r.columns && !columns.length) columns = r.columns.map((c) => c.name);
    if (r.data) {
      for (const row of r.data) {
        rows.push(row as unknown[]);
        if (rows.length >= cap) return { columns, rows };
      }
    }
  }
  return { columns, rows };
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[refresh] crashed', err);
  process.exit(1);
});
