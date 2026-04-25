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

// ═══════════════════════════════════════════════════════════════════════
// Metric Builder — 4-step authoring UI for no-code metric pipelines.
// State hub: { step, spec, meta }. Right rail shows live MetricSpec
// JSON + rendered SQL (compiler in query-svc P06). Bottom save bar
// posts {name, unit, goodDir, category, spec} to /metrics → registers
// metric + metric_pipelines row → scheduler picks up.
// ═══════════════════════════════════════════════════════════════════════

const STEPS = [
  { id: 'source',      label: 'Source',      icon: 'database' },
  { id: 'aggregation', label: 'Aggregation', icon: 'sigma' },
  { id: 'window',      label: 'Window & key', icon: 'calendar' },
  { id: 'schedule',    label: 'Schedule',    icon: 'clock' },
];

function emptySpec() {
  return {
    cohort:      { sourceTable: '', keyColumn: '' },
    window:      { kind: 'rolling_days', days: 30, eventDateColumn: '' },
    aggregation: { fn: 'count', column: null },
    filters:     [],
    schedule:    { kind: 'cron', expr: '@daily' },
    output:      { unit: 'count', goodDir: 'up' },
  };
}

export function MetricBuilder({ setPage }) {
  const hash = useHashState();
  const [step, setStep] = React.useState(0);
  const [spec, setSpec] = React.useState(() => {
    const s = emptySpec();
    if (hash.table) s.cohort.sourceTable = hash.table;
    return s;
  });
  const [meta, setMeta] = React.useState({
    name: '', category: 'engagement',
  });

  useLucide(step, spec, meta);

  const catalogQ = useDataCatalog();
  const tables = catalogQ.data?.items ?? [];
  const tableQ = useDataCatalogTable(spec.cohort.sourceTable || null);
  const tableDetail = tableQ.data;

  function patchSpec(patch) {
    setSpec((s) => ({ ...s, ...patch }));
  }
  function patchSpecDeep(path, value) {
    setSpec((s) => {
      const next = { ...s };
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  }

  const canAdvance = (() => {
    switch (step) {
      case 0: return !!spec.cohort.sourceTable;
      case 1: return !!spec.aggregation.fn && (spec.aggregation.fn === 'count' || !!spec.aggregation.column);
      case 2: return !!spec.window.eventDateColumn && !!spec.cohort.keyColumn && spec.window.days > 0;
      case 3: return !!spec.schedule.expr;
      default: return false;
    }
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
              tables={tables}
              loading={catalogQ.isLoading}
              spec={spec}
              tableDetail={tableDetail}
              onPick={(id) => {
                patchSpec({
                  cohort: { sourceTable: id, keyColumn: '' },
                  window: { ...spec.window, eventDateColumn: '' },
                  aggregation: { fn: 'count', column: null },
                });
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
              onSetKey={(k) => patchSpecDeep('cohort.keyColumn', k)}
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

      <SpecPreview spec={spec} />

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
