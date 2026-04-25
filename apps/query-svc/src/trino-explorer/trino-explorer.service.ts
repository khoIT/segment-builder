import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { quoteFqn, quoteIdent } from '../driver/sql-builder/identifier';
import { makeTrino, runTrino } from '../driver/trino-client';
import type { Trino } from 'trino-client';

// Browseable view of the iceberg catalog — mirrors what RawExplorer.jsx
// needs. Two-mode parity:
//   QUERY_DRIVER=mock  → reads committed infra/trino-mock/data/*/*.schema.json
//                        and the gitignored *.sample.jsonl alongside.
//   QUERY_DRIVER=trino → hits Trino directly via the same trino-client
//                        wrapper the driver uses.

export type Column = { name: string; type: string; nullable?: string | null };
export type SchemaList = { items: string[] };
export type TableList = { schema: string; items: string[] };
export type TableDescribe = { catalog: string; schema: string; table: string; columns: Column[]; piiCols?: string[] };
export type TableSample = { columns: string[]; rows: unknown[][]; total: number };

@Injectable()
export class TrinoExplorerService {
  private readonly log = new Logger(TrinoExplorerService.name);
  private trinoClient: Trino | null = null;
  private readonly mockRoot: string;

  constructor(private readonly cfg: ConfigService) {
    // infra/trino-mock/data/ relative to repo root. CommonJS, so use
    // __dirname; walk up four levels (dist/trino-explorer →
    // apps/query-svc → apps → repo root) to land on infra/.
    this.mockRoot = resolve(__dirname, '../../../../infra/trino-mock/data');
  }

  private isTrino(): boolean {
    return (this.cfg.get<string>('QUERY_DRIVER') ?? 'mock') === 'trino';
  }

  private trino(): Trino {
    if (!this.trinoClient) this.trinoClient = makeTrino(this.cfg);
    return this.trinoClient;
  }

  // ── schemas ─────────────────────────────────────────────────────
  async listSchemas(catalog?: string): Promise<SchemaList> {
    const cat = catalog ?? this.cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
    if (this.isTrino()) {
      // information_schema.schemata is portable + tolerates quoting that
      // `SHOW SCHEMAS FROM "iceberg"` chokes on (returns empty silently).
      // Pass catalog as a string literal — quoteIdent isn't applicable
      // since this is a value, not an identifier.
      const safeCat = cat.replace(/'/g, "''");
      const r = await runTrino(
        this.trino(),
        `SELECT schema_name FROM "${safeCat}"."information_schema"."schemata" ORDER BY schema_name`,
        [],
        1000,
      );
      return { items: r.rows.map((row) => String(row[0])) };
    }
    // Mock: list dirs under data/
    try {
      const entries = await readdir(this.mockRoot, { withFileTypes: true });
      return { items: entries.filter((e) => e.isDirectory()).map((e) => e.name) };
    } catch {
      return { items: [] };
    }
  }

  // ── tables in a schema ──────────────────────────────────────────
  async listTables(schema: string, catalog?: string): Promise<TableList> {
    const cat = catalog ?? this.cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
    if (this.isTrino()) {
      const r = await runTrino(
        this.trino(),
        `SHOW TABLES FROM ${quoteFqn([cat, schema])}`,
        [],
        5000,
      );
      return { schema, items: r.rows.map((row) => String(row[0])) };
    }
    const dir = join(this.mockRoot, schema);
    try {
      const files = await readdir(dir);
      const items = files
        .filter((f) => f.endsWith('.schema.json'))
        .map((f) => f.replace(/\.schema\.json$/, ''));
      return { schema, items };
    } catch {
      throw new NotFoundException(`schema not found: ${schema}`);
    }
  }

  // ── describe table ──────────────────────────────────────────────
  async describeTable(schema: string, table: string, catalog?: string): Promise<TableDescribe> {
    const cat = catalog ?? this.cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
    if (this.isTrino()) {
      const r = await runTrino(
        this.trino(),
        `DESCRIBE ${quoteFqn([cat, schema, table])}`,
        [],
        500,
      );
      return {
        catalog: cat, schema, table,
        columns: r.rows.map((row) => ({
          name: String(row[0]),
          type: String(row[1]),
          nullable: row[2] != null ? String(row[2]) : null,
        })),
      };
    }
    const file = join(this.mockRoot, schema, `${table}.schema.json`);
    try {
      const json = JSON.parse(await readFile(file, 'utf8')) as TableDescribe;
      return json;
    } catch {
      throw new NotFoundException(`schema file not found: ${schema}.${table}`);
    }
  }

  // ── sample rows (no full-table dumps) ───────────────────────────
  async sampleTable(schema: string, table: string, limit: number, catalog?: string): Promise<TableSample> {
    const cap = Math.min(Math.max(limit, 1), 200);
    const cat = catalog ?? this.cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
    if (this.isTrino()) {
      const r = await runTrino(
        this.trino(),
        `SELECT * FROM ${quoteFqn([cat, schema, table])} LIMIT ${cap}`,
        [],
        cap,
      );
      return { columns: r.columns, rows: r.rows, total: r.rows.length };
    }
    // Mock: read up to `cap` lines from sample.jsonl, derive columns from
    // the schema file. JSONL rows are objects; project in schema order.
    const desc = await this.describeTable(schema, table, cat);
    const colNames = desc.columns.map((c) => c.name);
    const sampleFile = join(this.mockRoot, schema, `${table}.sample.jsonl`);
    try {
      await stat(sampleFile);
    } catch {
      // No JSONL committed (gitignored). Return empty.
      return { columns: colNames, rows: [], total: 0 };
    }
    const text = await readFile(sampleFile, 'utf8');
    const rows: unknown[][] = [];
    for (const line of text.split('\n')) {
      if (!line.trim() || rows.length >= cap) break;
      try {
        const obj = JSON.parse(line) as Record<string, unknown>;
        rows.push(colNames.map((c) => obj[c] ?? null));
      } catch {
        // skip malformed
      }
    }
    return { columns: colNames, rows, total: rows.length };
  }
}
