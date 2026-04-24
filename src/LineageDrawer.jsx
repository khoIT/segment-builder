import React from 'react';
import { T, Icon, Button } from './theme.jsx';
import { ADAPTERS, KINDS, resolveEntity } from './LineageAdapters.jsx';
import { LineageGraph } from './LineageGraph.jsx';
import { LineagePicker } from './LineagePicker.jsx';

// ═══════════════════════════════════════════════════════════════════════
// LINEAGE DRAWER — right-side drawer that shows lineage for any entity.
// Maintains an internal navigation stack so clicking a navigable node
// (metric, feature, model, segment, campaign) pushes that entity onto the
// stack and re-renders the graph. Breadcrumbs expose the full trail with
// jump-to-any-position. "Change" clears the stack and reopens the picker.
//
// Opening contract (from parent):
//   seed === undefined → drawer closed
//   seed === null      → drawer open at the picker (no entity yet)
//   seed === { kind, entity } → drawer open focused on this entity
// ═══════════════════════════════════════════════════════════════════════

// ─── Breadcrumbs ───────────────────────────────────────────────────────
// Compact trail: kindIcon name  ›  kindIcon name  ›  …
// Overflow truncates the middle segments with an ellipsis.

function Breadcrumbs({ stack, onJump }) {
  if (stack.length <= 1) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
      padding: '8px 18px', borderBottom: `1px solid ${T.n200}`,
      background: T.n50,
    }}>
      {stack.map((step, i) => {
        const info = KINDS[step.kind];
        const last = i === stack.length - 1;
        return (
          <React.Fragment key={`${step.kind}-${step.entity.id}-${i}`}>
            <div
              onClick={last ? undefined : () => onJump(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 7px', borderRadius: 6,
                cursor: last ? 'default' : 'pointer',
                background: last ? '#fff' : 'transparent',
                border: `1px solid ${last ? info.color : 'transparent'}`,
                color: last ? info.color : T.n600,
                fontSize: 11, fontWeight: 500,
              }}
            >
              <Icon name={info.icon} size={11} />
              <span style={{
                fontFamily: T.fMono, fontSize: 11, fontWeight: 600,
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{step.entity.name}</span>
            </div>
            {!last && <Icon name="chevron-right" size={11} color={T.n400} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Drawer ────────────────────────────────────────────────────────────

function LineageDrawer({ seed, onClose }) {
  // Navigation stack: each entry is { kind, entity }. Empty = picker view.
  const [stack, setStack] = React.useState(() => (seed ? [seed] : []));

  // Re-sync when parent passes a new seed (e.g., user clicks another metric
  // card while drawer is already open).
  React.useEffect(() => {
    if (seed) setStack([seed]);
    else setStack([]);
  }, [seed?.kind, seed?.entity?.id]);

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = stack[stack.length - 1] || null;
  const adapter = current ? ADAPTERS[current.kind] : null;

  const pushEntity = (kind, id) => {
    const entity = resolveEntity(kind, id);
    if (!entity) return;
    setStack(s => [...s, { kind, entity }]);
  };
  const jumpTo = (index) => setStack(s => s.slice(0, index + 1));
  const changeEntity = () => setStack([]);
  const pickFromEmpty = (kind, entity) => setStack([{ kind, entity }]);

  const headerColor = current
    ? (adapter?.kindInfo.color || T.n700)
    : T.brand;
  const headerTitle = current ? current.entity.name : 'Pick an entity';
  const headerSub   = current ? adapter.kindInfo.label : 'Any kind';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.45)' }} />
      <div style={{
        position: 'relative', width: 720, maxWidth: '95vw', height: '100%',
        background: T.n50, boxShadow: '-20px 0 40px -10px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, background: '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `${headerColor}15`, color: headerColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="git-compare" size={16} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, color: T.n500, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>Lineage · {headerSub}</div>
            <div style={{
              fontFamily: T.fMono, fontSize: 14, fontWeight: 600, color: T.n900,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{headerTitle}</div>
          </div>
          {current && (
            <Button variant="outline" size="sm" leftIcon="chevrons-up-down" onClick={changeEntity}>
              Change
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <Icon name="x" size={14} />
          </Button>
        </div>

        {/* Breadcrumbs (only when stack has > 1 entry) */}
        <Breadcrumbs stack={stack} onJump={jumpTo} />

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px 24px' }}>
          {!current && <LineagePicker initialKind={seed?.kind || 'metric'} onPick={pickFromEmpty} />}
          {current && (
            <LineageGraph
              entity={current.entity}
              kind={current.kind}
              onNavigate={pushEntity}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { LineageDrawer };
