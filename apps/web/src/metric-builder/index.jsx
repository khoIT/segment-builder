import React from 'react';
import { T, useLucide } from '../theme.jsx';
import { useDataCatalog, useDataCatalogTable } from '../api/hooks.js';
import { useHashState, setHash } from '../routing/hash-state.js';
import { StepSource } from './step-source.jsx';
import { StepAggregation } from './step-aggregation.jsx';
import { StepWindow } from './step-window.jsx';
import { StepSchedule } from './step-schedule.jsx';
import { SpecPreview } from './spec-preview.jsx';
import { SaveBar } from './save-bar.jsx';
import { Stepper } from './stepper.jsx';
import { pickDefaultKey, aliasForIndex } from './source-helpers.js';

// Metric Builder — 4-step wizard. Spec: {sources,joins,window,aggregation,filters,schedule,output}.
// URL pre-fill: #source=<table_id> seeds step 1; unknown id → silent fallback.

const STEPS = [
  { id: 'source',      label: 'Source',      icon: 'database' },
  { id: 'aggregation', label: 'Aggregation', icon: 'sigma' },
  { id: 'window',      label: 'Window & key', icon: 'calendar' },
  { id: 'schedule',    label: 'Schedule',    icon: 'clock' },
];

function emptySpec() {
  return {
    sources:     [],
    joins:       [],
    window:      { kind: 'rolling_days', days: 30, eventDateColumn: '' },
    aggregation: { fn: 'count', column: null },
    filters:     [],
    schedule:    { kind: 'cron', expr: '@daily' },
    output:      { unit: 'count', goodDir: 'up' },
  };
}

// Merge a catalog metric spec on top of a fresh empty spec so any field
// the template is missing (older specs may omit output/filters) is filled
// with builder defaults — keeps the preview from crashing on partial specs.
function mergeTemplateSpec(tpl) {
  const base = emptySpec();
  if (!tpl || typeof tpl !== 'object') return base;
  return {
    ...base,
    ...tpl,
    sources: Array.isArray(tpl.sources) ? tpl.sources : base.sources,
    joins: Array.isArray(tpl.joins) ? tpl.joins : base.joins,
    window: { ...base.window, ...(tpl.window ?? {}) },
    aggregation: { ...base.aggregation, ...(tpl.aggregation ?? {}) },
    filters: Array.isArray(tpl.filters) ? tpl.filters : base.filters,
    schedule: { ...base.schedule, ...(tpl.schedule ?? {}) },
    output: { ...base.output, ...(tpl.output ?? {}) },
  };
}

export function MetricBuilder({ setPage }) {
  const hash = useHashState();
  const catalogQ = useDataCatalog({ layer: 'raw_event' });
  const allTables = catalogQ.data?.items ?? [];

  // URL pre-fill: read hash.source on mount.
  // We need the catalog to be loaded to validate the table id.
  // Use a ref to only seed once when catalog first loads.
  const seededRef = React.useRef(false);

  const [step, setStep] = React.useState(0);
  const [spec, setSpec] = React.useState(emptySpec);
  const [meta, setMeta] = React.useState({ name: '', category: 'engagement' });

  // Pre-fill from #source=<id> once catalog loads. Unknown id → silent no-op.
  React.useEffect(() => {
    if (seededRef.current || catalogQ.isLoading || !catalogQ.data) return;
    seededRef.current = true;
    const found = allTables.find((t) => t.layer === 'raw_event' && t.id === hash.source);
    if (!found) return;
    const keyColumn = pickDefaultKey(found.columns ?? '') ?? '';
    setSpec((s) => ({ ...s, sources: [{ table: found.id, alias: aliasForIndex(0), keyColumn }], joins: [] }));
  }, [catalogQ.isLoading, catalogQ.data, allTables, hash.source]);

  useLucide(step, spec, meta);

  // Primary source detail for StepAggregation / StepWindow.
  const primaryTableId = spec.sources[0]?.table ?? null;
  const tableDetailQ = useDataCatalogTable(primaryTableId);
  const tableDetail = tableDetailQ.data;

  function patchSpec(patch) {
    setSpec((s) => ({ ...s, ...patch }));
  }

  const canAdvance = (() => {
    if (step === 0) return spec.sources.length > 0 && !spec.joins.some((j) => !j.on?.[0]?.leftCol || !j.on?.[0]?.rightCol);
    if (step === 1) return !!spec.aggregation.fn && (spec.aggregation.fn === 'count' || !!spec.aggregation.column);
    if (step === 2) return !!spec.window.eventDateColumn && !!(spec.sources[0]?.keyColumn) && spec.window.days > 0;
    if (step === 3) return !!spec.schedule.expr;
    return false;
  })();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 380px',
      gridTemplateRows: '1fr auto',
      height: '100%', background: T.n50,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ padding: '20px 24px 0', flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: T.fDisp, fontSize: 28, color: T.n900, lineHeight: 1 }}>
              METRIC BUILDER
            </span>
            <span style={{ fontSize: 12, color: T.n500 }}>
              Author a metric pipeline over raw events. Save & schedule → auto-materializes.
            </span>
          </div>
          <Stepper steps={STEPS} active={step} onJump={(i) => i <= step + 1 && setStep(i)} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px', minHeight: 0 }}>
          {step === 0 && (
            <StepSource
              sources={spec.sources}
              joins={spec.joins}
              allTables={allTables}
              loading={catalogQ.isLoading}
              onChange={({ sources, joins }) => {
                const primaryChanged = spec.sources[0]?.table !== sources[0]?.table;
                patchSpec({ sources, joins, ...(primaryChanged ? { window: { ...spec.window, eventDateColumn: '' }, aggregation: { fn: 'count', column: null } } : {}) });
              }}
              onUseTemplate={(tplSpec, tplMeta) => {
                // Replace builder state with the template's spec so the
                // user can edit + rename + save. Keep current name unless
                // it's blank (avoid surprising overwrite of typed name).
                const safe = mergeTemplateSpec(tplSpec);
                setSpec(safe);
                setMeta((m) => ({
                  name: m.name || `${tplMeta?.name ?? 'metric'} (copy)`,
                  category: tplMeta?.category || m.category,
                }));
                setStep(0);
              }}
            />
          )}
          {step === 1 && (
            <StepAggregation
              spec={spec}
              tableDetail={tableDetail}
              onSet={(agg) => patchSpec({ aggregation: agg })}
            />
          )}
          {step === 2 && (
            <StepWindow
              spec={spec}
              tableDetail={tableDetail}
              onSetWindow={(w) => patchSpec({ window: w })}
              onSetKey={(k) => patchSpec({ sources: spec.sources.map((s, i) => i === 0 ? { ...s, keyColumn: k } : s) })}
            />
          )}
          {step === 3 && (
            <StepSchedule
              spec={spec}
              onSet={(sch) => patchSpec({ schedule: sch })}
            />
          )}
        </div>
      </div>

      <SpecPreview spec={spec} meta={meta} onJumpStep={(i) => i != null && setStep(i)} />

      <SaveBar
        spec={spec}
        meta={meta}
        setMeta={setMeta}
        canAdvance={canAdvance}
        step={step}
        totalSteps={STEPS.length}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onSaved={(metricId) => { setHash({ metric: metricId }); setPage('metrics'); }}
      />
    </div>
  );
}

Object.assign(window, { MetricBuilder });
export default MetricBuilder;
