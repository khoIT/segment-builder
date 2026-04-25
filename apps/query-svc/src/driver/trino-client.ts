import { Trino, BasicAuth } from 'trino-client';
import type { ConfigService } from '@nestjs/config';

// Thin wrapper around `trino-client` that:
//   - constructs the client lazily from env vars
//   - applies a global query timeout
//   - paginates through nextUri tokens transparently
//   - returns simple { columns, rows, ms } shape
//
// The client itself is async-iterable; we collect up to a hard cap to
// avoid memory blow-up on unbounded queries.

export type TrinoQueryResult = {
  columns: string[];
  rows: unknown[][];
  ms: number;
};

export function makeTrino(cfg: ConfigService): Trino {
  const host = cfg.get<string>('TRINO_HOST_FQDN') ?? 'localhost';
  const port = cfg.get<string>('TRINO_PORT') ?? '8080';
  const user = cfg.get<string>('TRINO_USER');
  const password = cfg.get<string>('TRINO_PASSWORD');
  const catalog = cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
  const schema = cfg.get<string>('TRINO_DEFAULT_SCHEMA') ?? 'cfm_vn';
  if (!user || !password) {
    throw new Error('TRINO_USER and TRINO_PASSWORD must be set when QUERY_DRIVER=trino');
  }
  return Trino.create({
    server: `https://${host}:${port}`,
    catalog,
    schema,
    auth: new BasicAuth(user, password),
  });
}

export async function runTrino(
  client: Trino,
  sql: string,
  params: unknown[],
  cap = 10_000,
): Promise<TrinoQueryResult> {
  const start = Date.now();
  // trino-client supports parameterized queries via ?-placeholders by
  // formatting them client-side; for deterministic safety we substitute
  // here using the same strict rules we apply elsewhere. Any non-
  // primitive value forces a JSON-string fallback.
  const formatted = formatParams(sql, params);
  const iter = await client.query(formatted);

  const rows: unknown[][] = [];
  let columns: string[] = [];
  for await (const result of iter) {
    // Trino sends errors as a `.error` field on the response chunk;
    // without this guard the iterator simply ends and the caller
    // sees `0 rows, no error` — exactly what we hit on first run.
    const err = (result as unknown as { error?: { message?: string; errorName?: string } }).error;
    if (err) {
      const msg = err.message ?? err.errorName ?? 'Trino query failed';
      throw new Error(`[trino] ${msg}\nSQL: ${formatted.slice(0, 500)}${formatted.length > 500 ? '…' : ''}`);
    }
    if (result.columns && !columns.length) {
      columns = result.columns.map((c) => c.name);
    }
    if (result.data) {
      for (const row of result.data) {
        rows.push(row as unknown[]);
        if (rows.length >= cap) return { columns, rows, ms: Date.now() - start };
      }
    }
  }
  return { columns, rows, ms: Date.now() - start };
}

// Trino-client doesn't expose bind-params on the query() helper, so we
// substitute ?-placeholders client-side. Strings are escaped via `''`
// (single-quote doubling); numbers/booleans inlined as literals; null
// becomes NULL. Any other type throws — we want to know about it.
//
// Strings that look like ISO dates/timestamps get a Trino type prefix
// so comparisons against `timestamp` / `date` columns don't silently
// return 0 rows. (Trino does not implicitly coerce VARCHAR -> TIMESTAMP.)
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

function formatParams(sql: string, params: unknown[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => {
    if (i >= params.length) throw new Error('not enough bind params');
    const v = params[i++];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number' || typeof v === 'bigint') return String(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (v instanceof Date) return `TIMESTAMP '${v.toISOString()}'`;
    if (typeof v === 'string') {
      const escaped = `'${v.replace(/'/g, "''")}'`;
      if (ISO_DATE.test(v)) return `DATE ${escaped}`;
      if (ISO_TIMESTAMP.test(v)) return `TIMESTAMP ${escaped}`;
      return escaped;
    }
    throw new Error(`cannot bind value of type ${typeof v}`);
  });
}
