import React from 'react';
import { T, Icon } from '../theme.jsx';

// Compact horizontal stepper. Click to jump back; jump forward only
// allowed one step ahead of the current position (validated upstream).

export function Stepper({ steps, active, onJump }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '14px 0', borderBottom: `1px solid ${T.n200}`,
    }}>
      {steps.map((s, i) => {
        const done = i < active;
        const cur = i === active;
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => onJump?.(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8,
                background: cur ? T.brandSoft : 'transparent',
                border: 'none', cursor: 'pointer',
                fontFamily: T.fSans,
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 11,
                background: done ? T.brand : (cur ? T.brand : T.n200),
                color: done || cur ? '#fff' : T.n600,
                fontSize: 11, fontWeight: 700,
              }}>
                {done ? <Icon name="check" size={12} color="#fff" /> : i + 1}
              </span>
              <span style={{
                fontSize: 12, fontWeight: cur ? 600 : 500,
                color: cur ? T.brand : T.n700,
              }}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span style={{
                flex: '0 0 24px', height: 1,
                background: i < active ? T.brand : T.n200,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
