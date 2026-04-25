import { quoteIdent } from './identifier';
import type { Criteria } from '../driver.interface';

const LEAF_OPS: Record<string, string> = {
  '=': '=', '<': '<', '>': '>', '<=': '<=', '>=': '>=',
};

export type Translated = { sql: string; params: unknown[] };

// Recursive walk over SegmentCriteria; emits a parametrized WHERE
// fragment. AND/OR groups wrap children in parens; leaves push their
// values into the bind list — values are NEVER inlined.
//
// `columnFor` resolves a metricId → physical column name (typically
// from a per-game metric_source_bindings.columnMap). Throws on missing
// mappings so a typo in criteria fails loud, not silent.
export function translateCriteria(
  c: Criteria,
  columnFor: (metricId: string) => string,
): Translated {
  const params: unknown[] = [];

  const walk = (node: Criteria): string => {
    if ('op' in node) {
      if (!node.children.length) return '1=1';
      const joiner = node.op === 'AND' ? ' AND ' : ' OR ';
      return `(${node.children.map(walk).join(joiner)})`;
    }
    const col = quoteIdent(columnFor(node.metricId));
    if (node.operator === 'in') {
      const arr = Array.isArray(node.value) ? node.value as unknown[] : [node.value];
      const ph = arr.map(() => '?').join(', ');
      params.push(...arr);
      return `${col} IN (${ph})`;
    }
    const op = LEAF_OPS[node.operator];
    if (!op) throw new Error(`unsupported criteria operator: ${node.operator}`);
    params.push(node.value);
    return `${col} ${op} ?`;
  };

  return { sql: walk(c), params };
}
