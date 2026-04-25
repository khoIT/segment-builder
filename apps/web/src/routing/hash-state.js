import React from 'react';

// Centralized URL-hash protocol used for cross-page deeplinks.
//
// Schema:
//   #table=<id>&category=<slug>&game=<code>&q=<search>
//
// Producers: lineage-chips.jsx (writes #table on chip click), per-page
// filter UIs (write #category, #game, #q on user-driven filter changes,
// debounced 200ms via the page).
// Consumers: data-catalog/index.jsx, MetricsCatalog.jsx, SegmentBuilder
// .jsx, Screens.jsx (FeatureBuilder) — read on mount, sync state.

export function parseHash() {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, '');
  if (!raw) return {};
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [k, v] of params) out[k] = v;
  return out;
}

export function setHash(partial, { push = false } = {}) {
  const current = parseHash();
  const next = { ...current, ...partial };
  for (const k of Object.keys(next)) {
    if (next[k] == null || next[k] === '') delete next[k];
  }
  const search = new URLSearchParams(next).toString();
  const href = `${window.location.pathname}${window.location.search}${search ? '#' + search : ''}`;
  if (push) history.pushState(null, '', href);
  else      history.replaceState(null, '', href);
  // replaceState/pushState don't fire hashchange — emit manually so
  // useHashState subscribers re-render.
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function clearHash() {
  history.replaceState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// React subscriber. Re-renders the caller whenever the hash changes.
export function useHashState() {
  const subscribe = React.useCallback((cb) => {
    window.addEventListener('hashchange', cb);
    return () => window.removeEventListener('hashchange', cb);
  }, []);
  const getSnapshot = React.useCallback(() => window.location.hash, []);
  React.useSyncExternalStore(subscribe, getSnapshot, () => '');
  // Recompute parsed hash on every render — cheap, < 1ms.
  return parseHash();
}
