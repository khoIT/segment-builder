import React from 'react';
import { T, Icon, Button } from '../theme.jsx';
import { useCreateMetricFromSpec } from '../api/hooks.js';

// Bottom-fixed save bar. Holds metric name + category + back/next/save.
// Also surfaces a hint banner when the form isn't yet valid for the
// current step. Save & Schedule POSTs to /metrics with full spec.

const CATEGORIES = ['engagement', 'monetization', 'progression', 'retention', 'social', 'technical'];

export function SaveBar({ spec, meta, setMeta, canAdvance, step, totalSteps, onBack, onNext, onSaved }) {
  const create = useCreateMetricFromSpec();
  const isLast = step === totalSteps - 1;
  const ready = isLast && canAdvance && !!meta.name.trim();

  function nameToId(s) {
    // Turn "Whale spend 30d" into "m_whale_spend_30d". Lowercase,
    // collapse non-alnum to underscore, strip leading m_ if user
    // already typed one.
    const slug = s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return slug.startsWith('m_') ? slug : `m_${slug}`;
  }

  async function handleSave() {
    const id = nameToId(meta.name);
    const body = {
      id,
      name: meta.name.trim(),
      category: meta.category,
      topGroup: 'engagement',  // default; metric-builder doesn't expose this yet
      type: 'custom',
      unit: spec.output.unit,
      goodDir: spec.output.goodDir,
      freq: spec.schedule.expr === '@hourly' ? 'hourly' : (spec.schedule.expr === '@weekly' ? 'weekly' : 'daily'),
      window: `${spec.window.days}d ${spec.window.kind === 'rolling_days' ? 'rolling' : 'cohort'}`,
      games: ['ALL'],
      spec,                                                     // P06 compiler reads this
      schedule: spec.schedule.expr,                             // lifted out for indexing
    };
    try {
      const res = await create.mutateAsync(body);
      onSaved?.(res?.id ?? id);
    } catch (e) {
      // Surfaced inline below; don't blow up.
    }
  }

  return (
    <div style={{
      gridColumn: '1 / -1',
      borderTop: `1px solid ${T.n200}`,
      padding: '10px 18px',
      background: T.n0,
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: T.fSans,
    }}>
      <input
        value={meta.name}
        onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
        placeholder="Metric name (e.g. whale_spend_30d)"
        style={{
          flex: '0 0 280px', padding: '8px 12px', borderRadius: 6,
          border: `1px solid ${T.n200}`, background: T.n0,
          fontFamily: T.fMono, fontSize: 12, color: T.n900, outline: 'none',
        }}
      />
      <select
        value={meta.category}
        onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}
        style={{
          padding: '8px 10px', borderRadius: 6,
          border: `1px solid ${T.n200}`, background: T.n0,
          fontFamily: T.fSans, fontSize: 12, color: T.n900, outline: 'none',
        }}
      >
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <span style={{ flex: 1 }} />

      {create.isError && (
        <span style={{ fontSize: 11, color: '#991b1b', fontFamily: T.fMono }}>
          {String(create.error?.message ?? create.error).slice(0, 120)}
        </span>
      )}

      <Button variant="ghost" onClick={onBack} disabled={step === 0}>
        <Icon name="chevron-left" size={14} /> Back
      </Button>
      {!isLast ? (
        <Button variant="primary" onClick={onNext} disabled={!canAdvance}>
          Next <Icon name="chevron-right" size={14} />
        </Button>
      ) : (
        <Button variant="primary" onClick={handleSave} disabled={!ready || create.isPending}>
          <Icon name="rocket" size={14} />
          {create.isPending ? 'Saving…' : 'Save & Schedule'}
        </Button>
      )}
    </div>
  );
}
