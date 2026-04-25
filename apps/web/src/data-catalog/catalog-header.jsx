import React from 'react';
import { T, Icon, Button, SectionHeader } from '../theme.jsx';

// Header strip: title + KPI line (tables / columns / rows) + Connectors
// deeplink to Sources page. No Build button — catalog is read-only.

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function CatalogHeader({ totals, setPage, loading }) {
  const kpi = loading
    ? 'Loading…'
    : `${totals.tables} tables · ${totals.columns} columns · ${fmtNum(totals.rows)} rows`;

  return (
    <SectionHeader
      eyebrow="Catalog · Data Catalog"
      title="Data Catalog"
      description={kpi}
      right={
        <Button variant="outline" size="sm" leftIcon="settings" onClick={() => setPage?.('sources')}>
          Connectors
        </Button>
      }
    />
  );
}
