import React from 'react';
import { T, Icon, Input } from './theme.jsx';
import { ADAPTERS, KINDS } from './LineageAdapters.jsx';

// ═══════════════════════════════════════════════════════════════════════
// LINEAGE PICKER — root view of the drawer when no entity is selected.
// Tabbed by kind (Metrics · Features · Models · Segments · Campaigns) with
// a search box and grouped cards. Clicking a row selects that entity,
// seeding the navigation stack.
// ═══════════════════════════════════════════════════════════════════════

const PICKER_KINDS = ['metric', 'feature', 'model', 'segment', 'campaign'];

function KindTab({ kind, active, count, onClick }) {
  const info = KINDS[kind];
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
      background: active ? `${info.color}15` : 'transparent',
      border: `1px solid ${active ? `${info.color}60` : T.n200}`,
      color: active ? info.color : T.n700,
      fontSize: 12, fontWeight: 600,
    }}>
      <Icon name={info.icon} size={12} />
      {info.label}
      <span style={{ fontFamily: T.fMono, fontSize: 10, color: active ? info.color : T.n400 }}>{count}</span>
    </div>
  );
}

function PickerRow({ entity, kind, onPick }) {
  const [hover, setHover] = React.useState(false);
  const adapter = ADAPTERS[kind];
  const group = adapter.groupBy?.(entity);
  const color = group?.color || KINDS[kind].color;

  // Build a one-line subtitle from whatever fields the entity has.
  const subtitleBits = [];
  if (entity.window)   subtitleBits.push(entity.window);
  if (entity.unit)     subtitleBits.push(entity.unit);
  if (entity.agg)      subtitleBits.push(entity.agg);
  if (entity.game)     subtitleBits.push(entity.game);
  if (entity.auc != null) subtitleBits.push(`AUC ${entity.auc.toFixed(3)}`);
  if (entity.status && !entity.unit) subtitleBits.push(entity.status);
  const subtitle = subtitleBits.join(' · ');

  return (
    <div
      onClick={() => onPick(kind, entity)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
        background: hover ? `${color}10` : 'transparent',
        border: `1px solid ${hover ? `${color}40` : 'transparent'}`,
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: `${color}15`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={KINDS[kind].icon} size={12} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{entity.name}</div>
        {subtitle && (
          <div style={{
            fontSize: 10, color: T.n500, marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{subtitle}</div>
        )}
      </div>
      {entity.realtime && (
        <div title="Realtime" style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          background: T.brandSoft, color: T.brand,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="zap" size={10} /></div>
      )}
      <Icon name="chevron-right" size={13} color={hover ? color : T.n400} />
    </div>
  );
}

function KindSection({ kind, entities, onPick }) {
  const info = KINDS[kind];
  const adapter = ADAPTERS[kind];
  // Group within this kind via adapter.groupBy (may return {id, label, icon, color}).
  const groupMap = new Map();
  entities.forEach(e => {
    const g = adapter.groupBy?.(e) || { id: '_', label: info.label, icon: info.icon, color: info.color };
    if (!groupMap.has(g.id)) groupMap.set(g.id, { group: g, items: [] });
    groupMap.get(g.id).items.push(e);
  });
  const groups = Array.from(groupMap.values());

  return (
    <>
      {groups.map(({ group, items }) => (
        <div key={`${kind}-${group.id}`} style={{
          background: '#fff', borderRadius: 10, border: `1px solid ${T.n200}`,
          padding: 8, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px 8px', borderBottom: `1px solid ${T.n100}`, marginBottom: 4,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 5,
              background: `${group.color}15`, color: group.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name={group.icon} size={10} /></div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: T.n700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{group.label}</span>
            <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n400 }}>· {items.length}</span>
          </div>
          {items.map(e => <PickerRow key={`${kind}-${e.id}`} entity={e} kind={kind} onPick={onPick} />)}
        </div>
      ))}
    </>
  );
}

function LineagePicker({ initialKind = 'metric', onPick }) {
  const [activeKind, setActiveKind] = React.useState(initialKind);
  const [search, setSearch] = React.useState('');
  const q = search.trim().toLowerCase();

  const counts = PICKER_KINDS.map(k => ({
    kind: k,
    count: ADAPTERS[k].search(q).length,
  }));

  const filtered = ADAPTERS[activeKind].search(q);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: 14, borderRadius: 10, background: '#fff', border: `1px solid ${T.n200}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: T.brandSoft, color: T.brand,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="git-compare" size={16} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>Explore lineage</div>
          <div style={{ fontSize: 11, color: T.n500, marginTop: 1 }}>
            Pick any entity — metric, feature, model, segment, or campaign — to trace it up and down the pipeline.
          </div>
        </div>
      </div>

      <Input
        size="sm"
        leftIcon="search"
        placeholder="Search across all entities…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {counts.map(({ kind, count }) => (
          <KindTab key={kind} kind={kind} count={count}
            active={kind === activeKind} onClick={() => setActiveKind(kind)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: T.n500, fontSize: 12 }}>
          <Icon name="search-x" size={22} color={T.n300} />
          <div style={{ marginTop: 8 }}>
            No {KINDS[activeKind].label.toLowerCase()}s match {q ? `"${search}"` : 'the current filters'}
          </div>
        </div>
      )}

      {filtered.length > 0 && <KindSection kind={activeKind} entities={filtered} onPick={onPick} />}
    </div>
  );
}

export { LineagePicker };
