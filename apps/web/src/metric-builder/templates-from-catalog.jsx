import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useMetrics } from '../api/hooks.js';

// "Reference: existing metrics" — surfaces metrics already in the catalog
// that have a full MetricSpec attached. Each card visualizes how the
// metric is wired (sources/joins/window/aggregation/schedule) so users
// can browse for ideas or click "Use as template" to seed the builder
// with a working spec they can rename and tweak.
//
// Props
//   onUseTemplate(spec, meta?) — fires when user picks a template

const ALIAS_COLORS = {
  p: { bg: T.brandSoft, border: T.brand,    text: T.brand },
  s: { bg: '#f0fdf4',  border: '#16a34a',  text: '#15803d' },
  t: { bg: '#fef3c7',  border: '#d97706',  text: '#b45309' },
};

export function TemplatesFromCatalog({ onUseTemplate }) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const q = useMetrics({ pageSize: 200 });

  // Keep only metrics with usable specs (≥1 source).
  const all = (q.data?.items ?? [])
    .map((m) => ({ ...m, spec: normalizeSpec(m.spec) }))
    .filter((m) => m.spec && Array.isArray(m.spec.sources) && m.spec.sources.length > 0);

  const f = filter.trim().toLowerCase();
  const filtered = f
    ? all.filter((m) =>
        m.name.toLowerCase().includes(f)
        || (m.category ?? '').toLowerCase().includes(f)
        || m.spec.sources.some((s) => s.table?.toLowerCase().includes(f)))
    : all;

  return (
    <div style={{
      border: `1px solid ${T.n200}`, borderRadius: 10,
      background: T.n0, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 14px', border: 'none', background: T.n50,
          borderBottom: open ? `1px solid ${T.n200}` : 'none',
          cursor: 'pointer', fontFamily: T.fSans, textAlign: 'left',
        }}
      >
        <Icon name="library" size={14} color={T.brand} />
        <span style={{
          fontFamily: T.fDisp, fontSize: 14, color: T.n900, letterSpacing: '0.02em',
        }}>
          TEMPLATES FROM CATALOG
        </span>
        <span style={{ fontSize: 11, color: T.n500 }}>
          {q.isLoading ? 'loading…' : `${all.length} with full spec`}
        </span>
        <span style={{ flex: 1 }} />
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={T.n500} />
      </button>

      {open && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, category, or source table…"
            style={{
              padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${T.n200}`, background: T.n50,
              fontFamily: T.fSans, fontSize: 12, color: T.n900, outline: 'none',
            }}
          />

          {q.isError && (
            <div style={{ padding: 10, fontSize: 11, color: '#991b1b' }}>
              Couldn't load metrics: {String(q.error?.message ?? q.error)}
            </div>
          )}

          {!q.isLoading && all.length === 0 && (
            <div style={{ padding: 10, fontSize: 11, color: T.n500 }}>
              No catalog metrics with full specs yet. Save one and it'll
              appear here for reuse.
            </div>
          )}

          {filtered.length > 0 && (
            <div style={{
              display: 'grid', gap: 10,
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}>
              {filtered.slice(0, 24).map((m) => (
                <TemplateCard
                  key={m.id}
                  metric={m}
                  onUse={() => onUseTemplate(m.spec, { name: m.name, category: m.category })}
                />
              ))}
            </div>
          )}

          {filtered.length > 24 && (
            <div style={{ fontSize: 11, color: T.n500, textAlign: 'center' }}>
              Showing first 24 of {filtered.length}. Refine the filter to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ metric, onUse }) {
  const sources = metric.spec.sources ?? [];
  const joins = metric.spec.joins ?? [];
  const w = metric.spec.window ?? {};
  const a = metric.spec.aggregation ?? {};
  const sch = metric.spec.schedule?.expr ?? metric.schedule ?? '@daily';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: 12, borderRadius: 8,
      background: T.n0, border: `1px solid ${T.n200}`,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontFamily: T.fSans, fontSize: 12, fontWeight: 600, color: T.n900,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {metric.name || metric.id}
        </span>
        <span style={{ fontSize: 10, color: T.n500, fontFamily: T.fSans }}>
          {metric.category ?? 'metric'}
          {metric.unit ? ` · ${metric.unit}` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {sources.map((s, i) => (
          <React.Fragment key={s.alias ?? i}>
            <SourceChip alias={s.alias ?? 'p'} table={s.table} />
            {i < sources.length - 1 && (
              <Icon name="link" size={10} color={T.n400} />
            )}
          </React.Fragment>
        ))}
      </div>

      {joins.length > 0 && joins[0]?.on?.[0] && (
        <div style={{
          fontSize: 10, color: T.n600, fontFamily: T.fMono,
          padding: '4px 6px', borderRadius: 4, background: T.n50,
        }}>
          on {joins[0].on[0].leftCol} = {joins[0].on[0].rightCol}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <Pill icon="sigma">{a.fn ?? 'count'}{a.column ? `(${a.column})` : ''}</Pill>
        {w.days != null && <Pill icon="calendar">{w.days}d {w.kind === 'rolling_days' ? 'rolling' : 'cohort'}</Pill>}
        <Pill icon="clock">{sch}</Pill>
      </div>

      <button
        type="button"
        onClick={onUse}
        style={{
          marginTop: 4,
          padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
          background: T.brand, border: `1px solid ${T.brand}`, color: '#fff',
          fontFamily: T.fSans, fontSize: 11, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <Icon name="copy" size={11} color="#fff" />
        Use as template
      </button>
    </div>
  );
}

function SourceChip({ alias, table }) {
  const c = ALIAS_COLORS[alias] ?? ALIAS_COLORS.p;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 6px 2px 4px', borderRadius: 10,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: 7,
        background: c.border, color: '#fff',
        fontFamily: T.fMono, fontSize: 8, fontWeight: 700,
      }}>{alias}</span>
      <span style={{
        fontFamily: T.fMono, fontSize: 10, color: c.text,
        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{table}</span>
    </span>
  );
}

function Pill({ icon, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 10,
      background: T.n100, color: T.n800,
      fontFamily: T.fMono, fontSize: 10,
    }}>
      <Icon name={icon} size={9} color={T.n600} />
      {children}
    </span>
  );
}

function normalizeSpec(spec) {
  if (!spec) return null;
  if (typeof spec === 'string') {
    try { return JSON.parse(spec); } catch { return null; }
  }
  if (typeof spec === 'object') return spec;
  return null;
}
