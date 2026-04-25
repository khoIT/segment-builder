import React from 'react';
import { T, Icon } from '../theme.jsx';

// Step 4: pick a cron preset (or custom). on_event is parked for M3
// streaming consumer (P12) — we surface it as "coming soon" so the
// surface looks right but doesn't gate authoring today.

const PRESETS = [
  { id: '@hourly',  label: 'Hourly',  hint: 'Every hour at :00' },
  { id: '@daily',   label: 'Daily',   hint: 'Every day at 00:00 UTC' },
  { id: '@weekly',  label: 'Weekly',  hint: 'Mondays at 00:00 UTC' },
];

export function StepSchedule({ spec, onSet }) {
  const [custom, setCustom] = React.useState(
    PRESETS.some((p) => p.id === spec.schedule.expr) ? '' : spec.schedule.expr,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 880 }}>
      <SectionHead label="4 · How often should this run?" hint="Pick a cadence; metric materializes after each tick." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {PRESETS.map((p) => {
          const picked = spec.schedule.kind === 'cron' && spec.schedule.expr === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { setCustom(''); onSet({ kind: 'cron', expr: p.id }); }}
              style={{
                padding: '14px 14px', borderRadius: 10, cursor: 'pointer',
                background: picked ? T.brandSoft : T.n0,
                border: `1px solid ${picked ? T.brand : T.n200}`,
                fontFamily: T.fSans, textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="clock" size={13} color={picked ? T.brand : T.n500} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>{p.label}</span>
              </div>
              <div style={{ fontSize: 11, color: T.n500, marginTop: 4 }}>{p.hint}</div>
            </button>
          );
        })}
      </div>

      <div>
        <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
          Or a custom cron expression
        </div>
        <input
          value={custom}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v);
            if (v.trim()) onSet({ kind: 'cron', expr: v.trim() });
          }}
          placeholder="0 */4 * * *"
          style={{
            width: 280, padding: '8px 12px', borderRadius: 6,
            border: `1px solid ${T.n200}`, background: T.n0,
            fontFamily: T.fMono, fontSize: 12, color: T.n900, outline: 'none',
          }}
        />
      </div>

      <div style={{
        padding: '10px 14px', borderRadius: 8,
        background: T.n50, border: `1px dashed ${T.n200}`,
        fontSize: 12, color: T.n600, lineHeight: 1.5,
      }}>
        <strong style={{ color: T.n800 }}>on_event triggers</strong> (e.g. fire on every <code style={{ fontFamily: T.fMono }}>raw_etl_recharge</code> insert) ship in the realtime milestone. For now, all metrics run on cron.
      </div>
    </div>
  );
}

function SectionHead({ label, hint }) {
  return (
    <div>
      <div style={{ fontFamily: T.fDisp, fontSize: 16, color: T.n900, letterSpacing: '0.02em' }}>
        {label}
      </div>
      {hint && <div style={{ fontSize: 12, color: T.n500, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
