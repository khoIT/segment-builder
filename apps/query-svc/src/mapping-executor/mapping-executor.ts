import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { MappingSpec } from '@bedrock/contracts';

// ─────────────────────────────────────────────────────────────────────
// In-process mapping executor. Catalog-api's BuildOrchestrator POSTs a
// `MappingSpec` here; we synthesise rows shaped to the spec's
// `outputColumns` and stream them back as NDJSON.
//
// For the prototype we don't read JSONL fixtures — the executor invents
// per-cohort rows deterministically from the spec hash. Phase 06 swaps
// in real raw-event reading + Trino translation.
// ─────────────────────────────────────────────────────────────────────

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function piiHash(value: unknown): string {
  if (value == null) return '';
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function valueForType(type: string, r: () => number): unknown {
  switch (type) {
    case 'int': return Math.floor(r() * 100);
    case 'bigint': return Math.floor(r() * 1_000_000);
    case 'double': return Math.round(r() * 1000) / 10;  // 0..100, 1dp
    case 'boolean': return r() > 0.5;
    case 'date': {
      const d = new Date('2026-01-01');
      d.setDate(d.getDate() + Math.floor(r() * 90));
      return d.toISOString().slice(0, 10);
    }
    case 'timestamp': {
      const d = new Date('2026-01-01T00:00:00Z');
      d.setHours(d.getHours() + Math.floor(r() * 2160));
      return d.toISOString();
    }
    default: return null;
  }
}

@Injectable()
export class MappingExecutor {
  // Returns an async iterable of rows shaped to spec.outputColumns. The
  // caller pipes each row to NDJSON in the HTTP response.
  async *execute(spec: MappingSpec, rowCount = 10_000): AsyncGenerator<Record<string, unknown>> {
    const seed = hashSeed(JSON.stringify({ game: spec.game, tpl: spec.templateId, n: rowCount }));
    const r = rng(seed);
    const piiSet = new Set(spec.pii.hashColumns ?? []);
    const dropSet = new Set(spec.pii.dropColumns ?? []);

    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, unknown> = {};
      for (const col of spec.outputColumns) {
        if (dropSet.has(col.name)) continue;
        let v: unknown;
        // Identity columns get readable-ish synthetic values; everything
        // else uses type-driven placeholders.
        if (col.name === 'vopenid') v = `v_${i.toString(36).padStart(6, '0')}`;
        else if (col.name === 'roleid') v = `r_${(i + 1000).toString(36)}`;
        else if (col.name === 'game_id') v = spec.game;
        else if (col.name === 'media_source') v = ['organic', 'fb', 'tiktok', 'unattributed'][i % 4];
        else if (col.name === 'country_code') v = ['VN', 'TH', 'PH', 'ID'][i % 4];
        else if (col.name === 'platform') v = ['android', 'ios'][i % 2];
        else v = valueForType(col.type, r);

        if (piiSet.has(col.name)) v = piiHash(v);
        row[col.name] = v;
      }
      yield row;
    }
  }
}
