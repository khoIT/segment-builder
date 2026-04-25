import React from 'react';
import { T, Icon } from '../theme.jsx';
import { setHash } from './hash-state.js';

// Compact banner displayed on receiving pages when arriving via a hash
// deeplink (e.g. lineage chip → MetricsCatalog). Tells the user the
// implicit filter exists + offers a one-click clear.

export function FilterBanner({ tableFilter }) {
  if (!tableFilter) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 14px', borderRadius: 8,
      background: T.brandSoft ?? '#fff7ed',
      border: `1px solid ${T.brand}33`,
      fontFamily: T.fSans, fontSize: 12,
    }}>
      <Icon name="filter" size={14} color={T.brand} />
      <span style={{ color: T.brand, fontWeight: 600 }}>
        Filtered by data catalog table: <span style={{ fontFamily: T.fMono }}>{tableFilter}</span>
      </span>
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => setHash({ table: null })}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.brand, fontFamily: T.fSans, fontSize: 12, fontWeight: 600,
        }}
      >
        Clear
      </button>
    </div>
  );
}
