import React from 'react';
import { T, Icon } from '../theme.jsx';

// Per-step requirements checklist for the metric builder. Surfaced in
// the right-rail Live Preview so users can see at a glance what's still
// missing before save is allowed. Clicking a row jumps the wizard to
// the relevant step.
//
// Props
//   spec      MetricSpec (current draft)
//   meta      { name, category }
//   onJump(stepIdx)   jump to a specific wizard step

export function RequirementsChecklist({ spec, meta, onJump }) {
  const items = computeRequirements(spec, meta);
  const metCount = items.filter((i) => i.met).length;
  const total = items.length;
  const ready = metCount === total;

  return (
    <div style={{
      border: `1px solid ${ready ? '#86efac' : T.n200}`,
      background: ready ? '#f0fdf4' : T.n0,
      borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', background: ready ? '#dcfce7' : T.n50,
        borderBottom: `1px solid ${ready ? '#86efac' : T.n200}`,
      }}>
        <Icon
          name={ready ? 'check-circle-2' : 'list-checks'}
          size={13}
          color={ready ? '#16a34a' : T.brand}
        />
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: ready ? '#166534' : T.n800, fontFamily: T.fSans,
        }}>
          Requirements
        </span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: 11, fontFamily: T.fMono,
          color: ready ? '#166534' : T.n600,
        }}>
          {metCount} / {total}
        </span>
      </div>

      <ul style={{ margin: 0, padding: '6px 0', listStyle: 'none' }}>
        {items.map((it) => (
          <li key={it.label}>
            <button
              type="button"
              onClick={() => onJump?.(it.stepIdx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '6px 12px', border: 'none', cursor: 'pointer',
                background: 'transparent', textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.n50; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <CheckDot met={it.met} />
              <span style={{
                fontFamily: T.fSans, fontSize: 11,
                color: it.met ? T.n800 : T.n600,
                flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {it.label}
                {it.met && it.value && (
                  <span style={{ color: T.n500, marginLeft: 6, fontFamily: T.fMono, fontSize: 10 }}>
                    {it.value}
                  </span>
                )}
              </span>
              <Icon name="chevron-right" size={11} color={T.n400} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Returns items in the order the user hits them in the wizard.
// stepIdx 0=Source · 1=Aggregation · 2=Window · 3=Schedule · null=SaveBar
export function computeRequirements(spec, meta) {
  const src = spec.sources?.[0];
  const items = [
    {
      label: 'Source table',
      met: !!src?.table,
      value: src?.table ? `· ${src.table}` : null,
      stepIdx: 0,
    },
    {
      label: 'Key column',
      met: !!src?.keyColumn,
      value: src?.keyColumn ? `· ${src.keyColumn}` : null,
      stepIdx: 0,
    },
  ];

  if ((spec.sources?.length ?? 0) > 1) {
    const allJoinsValid = (spec.joins ?? []).every((j) => !!j.on?.[0]?.leftCol && !!j.on?.[0]?.rightCol);
    items.push({
      label: 'Join keys',
      met: allJoinsValid && (spec.joins?.length ?? 0) === (spec.sources.length - 1),
      value: allJoinsValid && spec.joins?.[0]?.on?.[0]
        ? `· ${spec.joins[0].on[0].leftCol}=${spec.joins[0].on[0].rightCol}`
        : null,
      stepIdx: 0,
    });
  }

  const fn = spec.aggregation?.fn;
  const aggCol = spec.aggregation?.column;
  items.push({
    label: 'Aggregation',
    met: !!fn && (fn === 'count' || !!aggCol),
    value: fn ? (fn === 'count' && !aggCol ? '· count(*)' : `· ${fn}${aggCol ? `(${aggCol})` : ''}`) : null,
    stepIdx: 1,
  });

  items.push({
    label: 'Event date column',
    met: !!spec.window?.eventDateColumn,
    value: spec.window?.eventDateColumn ? `· ${spec.window.eventDateColumn}` : null,
    stepIdx: 2,
  });

  items.push({
    label: 'Window length',
    met: (spec.window?.days ?? 0) > 0,
    value: spec.window?.days > 0 ? `· ${spec.window.days}d` : null,
    stepIdx: 2,
  });

  items.push({
    label: 'Schedule',
    met: !!spec.schedule?.expr,
    value: spec.schedule?.expr ? `· ${spec.schedule.expr}` : null,
    stepIdx: 3,
  });

  items.push({
    label: 'Metric name',
    met: !!meta?.name?.trim(),
    value: meta?.name?.trim() ? `· ${meta.name.trim()}` : null,
    stepIdx: null,
  });

  return items;
}

function CheckDot({ met }) {
  return met ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 16, height: 16, borderRadius: 8,
      background: '#16a34a', color: '#fff',
      flexShrink: 0,
    }}>
      <Icon name="check" size={10} color="#fff" />
    </span>
  ) : (
    <span style={{
      display: 'inline-block',
      width: 16, height: 16, borderRadius: 8,
      border: `2px solid ${T.n300}`, background: T.n0,
      boxSizing: 'border-box',
      flexShrink: 0,
    }} />
  );
}
