// Fallback data shapes that match the live API responses. Used when
// VITE_USE_API !== 'true'. Imports from the same JSX modules the
// pages used to read directly — single migration step is "swap the
// import path and call useX()".
import { BR_SOURCES, BR_METRICS, BR_FRESHNESS, BR_MASTER_TABLES } from '../bedrockData.jsx';

export function listSourcesFallback() {
  return { items: BR_SOURCES };
}

export function listMetricsFallback(filters = {}) {
  let items = BR_METRICS;
  if (filters.topGroup) items = items.filter((m) => m.topGroup === filters.topGroup);
  if (filters.category) items = items.filter((m) => m.category === filters.category);
  if (typeof filters.realtime === 'boolean') items = items.filter((m) => m.realtime === filters.realtime);
  if (filters.status) items = items.filter((m) => m.status === filters.status);
  if (filters.search) {
    const s = filters.search.toLowerCase();
    items = items.filter((m) => m.name.toLowerCase().includes(s));
  }
  return { items, total: items.length };
}

export function listFreshnessFallback() {
  return { items: BR_FRESHNESS };
}

export function listMasterTablesFallback() {
  // Project mock shape (rows='4.12B', cols, slaMet, streams, …) into the
  // live API shape (id, name, gameId, templateId, status, rowCount,
  // lastBuildAt). Mock counts are display strings — strip the suffix and
  // multiply so a `rowCount: number` is sensible for KPI math.
  const parseRows = (s) => {
    if (typeof s !== 'string') return Number(s) || 0;
    const m = s.match(/([\d.]+)\s*([BMK]?)/i);
    if (!m) return 0;
    const [, num, mult] = m;
    const scale = mult.toUpperCase() === 'B' ? 1e9 : mult.toUpperCase() === 'M' ? 1e6 : mult.toUpperCase() === 'K' ? 1e3 : 1;
    return Math.round(parseFloat(num) * scale);
  };
  return {
    items: BR_MASTER_TABLES.map((m, i) => ({
      id: `mt_${i}`,
      name: m.name,
      gameId: (m.game ?? '').toLowerCase(),
      templateId: 'tpl_user_profile_dx',
      status: 'completed',
      rowCount: parseRows(m.rows),
      lastBuildAt: new Date(Date.now() - (i + 1) * 600_000).toISOString(),
      lastBuildMs: 120_000,
      columns: null,
    })),
    total: BR_MASTER_TABLES.length,
  };
}
