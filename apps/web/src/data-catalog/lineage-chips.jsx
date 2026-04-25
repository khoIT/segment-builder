import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useDataCatalogLineage } from '../api/hooks.js';

// Lineage chip strip: → N metrics · N features · N segments · N models
// Click → setPage(target) + write URL hash so the target page can
// pre-filter (consumed by MetricsCatalog/SegmentBuilder/etc. when wired).
// Suppressed when count is 0.

const PAGE_BY_TARGET = {
  metrics:  'metrics',
  features: 'features',
  segments: 'builder',
  models:   'models',
};

function setHashAndNav(target, tableId, setPage) {
  const params = new URLSearchParams();
  params.set('table', tableId);
  history.replaceState(null, '', `#${params.toString()}`);
  setPage?.(PAGE_BY_TARGET[target]);
}

export function LineageChips({ tableId, setPage }) {
  const lineageQ = useDataCatalogLineage(tableId);
  const l = lineageQ.data;

  if (lineageQ.isLoading) {
    return <div style={{ fontSize: 11, color: T.n500 }}>Loading lineage…</div>;
  }
  if (!l) return null;

  const items = [
    { key: 'metrics',  label: 'metrics',  count: l.metrics.length,  icon: 'layers' },
    { key: 'features', label: 'features', count: l.features.length, icon: 'function-square' },
    { key: 'segments', label: 'segments', count: l.segments.length, icon: 'share-2' },
    { key: 'models',   label: 'models',   count: l.models.length,   icon: 'sparkles' },
  ].filter((i) => i.count > 0);

  return (
    <div>
      <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Used by
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.length === 0 && (
          <span style={{ fontSize: 12, color: T.n500, fontStyle: 'italic' }}>not yet referenced</span>
        )}
        {items.map((i) => (
          <button
            key={i.key}
            type="button"
            onClick={() => setHashAndNav(i.key, tableId, setPage)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999,
              border: `1px solid ${T.n200}`, background: T.n0,
              fontFamily: T.fSans, fontSize: 12, fontWeight: 600, color: T.n800,
              cursor: 'pointer',
            }}
          >
            <Icon name={i.icon} size={12} color={T.brand} />
            <span>→ {i.count} {i.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
