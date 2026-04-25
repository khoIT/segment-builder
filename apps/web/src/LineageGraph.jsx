import React from 'react';
import { T, Icon } from './theme.jsx';
import { ADAPTERS, KINDS } from './LineageAdapters.jsx';

// ═══════════════════════════════════════════════════════════════════════
// LINEAGE GRAPH — renders a normalized graph (self + upstream/downstream
// tiers) produced by an adapter. All visual primitives live here too so
// they stay local to lineage concerns.
// ═══════════════════════════════════════════════════════════════════════

// ─── Primitives ────────────────────────────────────────────────────────

function Tier({ title, count, kindIcon, kindColor }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: T.n500,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      margin: '14px 0 8px', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {kindIcon && (
        <span style={{ color: kindColor || T.n500, display: 'inline-flex' }}>
          <Icon name={kindIcon} size={11} />
        </span>
      )}
      {title}
      {count != null && <span style={{ fontFamily: T.fMono, color: T.n400 }}>· {count}</span>}
    </div>
  );
}

function Connector({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 4px 15px' }}>
      <div style={{ width: 2, height: 18, background: T.n200 }} />
      {label && (
        <span style={{ fontSize: 10, color: T.n500, fontFamily: T.fMono, fontStyle: 'italic' }}>
          {label}
        </span>
      )}
    </div>
  );
}

function LineageNode({ node, focus, onClick }) {
  const c = node.color || T.n500;
  const clickable = !!onClick;
  const kindLabel = KINDS[node.kind]?.label || node.kind;
  return (
    <div
      onClick={onClick}
      title={clickable ? `Open lineage for ${node.name}` : undefined}
      style={{
        padding: '10px 12px', borderRadius: 9, background: '#fff',
        border: `${focus ? 2 : 1}px solid ${focus ? c : T.n200}`,
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: clickable ? 'pointer' : 'default',
        boxShadow: focus ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
        transition: 'border-color .12s, box-shadow .12s',
      }}
      onMouseEnter={e => { if (clickable && !focus) e.currentTarget.style.borderColor = c; }}
      onMouseLeave={e => { if (clickable && !focus) e.currentTarget.style.borderColor = T.n200; }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        background: focus ? c : `${c}15`,
        color: focus ? '#fff' : c,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={node.icon} size={14} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10, color: T.n500, fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{kindLabel}</div>
        <div style={{
          fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{node.name}</div>
        {node.subtitle && (
          <div style={{
            fontSize: 10, color: T.n500, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{node.subtitle}</div>
        )}
      </div>
      {node.realtime && (
        <div title="Realtime-capable" style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: T.brandSoft, color: T.brand,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="zap" size={11} /></div>
      )}
      {clickable && <Icon name="chevron-right" size={13} color={T.n400} />}
    </div>
  );
}

// ─── Graph renderer ────────────────────────────────────────────────────
// Takes a normalized graph from any adapter and renders it vertically:
// upstream tiers (top-down) → self (focus) → downstream tiers.

function LineageGraph({ entity, kind, onNavigate }) {
  const adapter = ADAPTERS[kind];
  if (!adapter) return null;
  const graph = adapter.toGraph(entity);
  const { self, upstream, downstream } = graph;

  // A node is navigable if flagged AND we have an adapter for its kind.
  const handleClick = (node) => {
    if (!node.navigable) return undefined;
    if (!ADAPTERS[node.kind]) return undefined;
    return () => onNavigate(node.kind, node.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {upstream.map((tier, i) => (
        <React.Fragment key={`up-${i}`}>
          <Tier title={`Upstream · ${tier.label}`} count={tier.nodes.length}
            kindIcon={tier.nodes[0]?.icon} kindColor={tier.nodes[0]?.color} />
          {tier.nodes.map(n => (
            <LineageNode key={`${n.kind}-${n.id}`} node={n} onClick={handleClick(n)} />
          ))}
          <Connector label={tier.edgeLabel} />
        </React.Fragment>
      ))}

      <Tier title="This entity" kindIcon={KINDS[self.kind]?.icon} kindColor={self.color} />
      <LineageNode node={self} focus />

      {downstream.length > 0 && <Connector label={downstream[0]?.edgeLabel || 'consumed by'} />}

      {downstream.map((tier, i) => (
        <React.Fragment key={`down-${i}`}>
          <Tier title={`Downstream · ${tier.label}`} count={tier.nodes.length}
            kindIcon={tier.nodes[0]?.icon} kindColor={tier.nodes[0]?.color} />
          {tier.nodes.map(n => (
            <LineageNode key={`${n.kind}-${n.id}`} node={n} onClick={handleClick(n)} />
          ))}
          {i < downstream.length - 1 && <Connector label={downstream[i + 1]?.edgeLabel} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export { LineageGraph, LineageNode, Tier, Connector };
