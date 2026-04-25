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
  // Mock JSX uses an array of POJOs without IDs; synthesise IDs so
  // the live shape matches.
  return {
    items: BR_MASTER_TABLES.map((m, i) => ({ ...m, id: `mt_${i}` })),
    total: BR_MASTER_TABLES.length,
  };
}
