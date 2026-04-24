import { T } from './theme.jsx';
import { BR_METRICS, BR_METRIC_CATEGORIES } from './bedrockData.jsx';
import { FEATURES, MODELS, SEGMENTS, CAMPAIGNS } from './data.jsx';

// ═══════════════════════════════════════════════════════════════════════
// LINEAGE ADAPTERS — per-entity "how do I get upstream/downstream"
//
// Every adapter returns a normalized Graph:
//   { self: Node, upstream: Tier[], downstream: Tier[] }
//   Tier = { label, edgeLabel?, nodes: Node[] }
//   Node = { kind, id, name, subtitle?, icon, color, realtime?, navigable? }
//
// Clicking a node in the graph with `navigable: true` and a matching
// adapter kind pushes a new entry onto the drawer's navigation stack.
// Leaf kinds (source, table, dashboard) are rendered but not navigable.
// ═══════════════════════════════════════════════════════════════════════

// ─── Kind registry ─────────────────────────────────────────────────────
// Central visual identity for every node kind we render.

const KINDS = {
  source:    { label: 'Source',       icon: 'database',         color: '#3f8dff' },
  table:     { label: 'Master table', icon: 'table-2',          color: '#0ea5e9' },
  metric:    { label: 'Metric',       icon: 'layers',           color: '#64748b' },
  feature:   { label: 'Feature',      icon: 'function-square',  color: '#059669' },
  model:     { label: 'Model',        icon: 'sparkles',         color: '#a855f7' },
  segment:   { label: 'Segment',      icon: 'share-2',          color: '#f05a22' },
  campaign:  { label: 'Campaign',     icon: 'rocket',           color: '#db2777' },
  dashboard: { label: 'Dashboard',    icon: 'bar-chart-3',      color: '#3f8dff' },
};

// ─── Helpers ───────────────────────────────────────────────────────────

const categoryColor = id => BR_METRIC_CATEGORIES.find(c => c.id === id)?.color || T.n500;

function metricNode(m) {
  return {
    kind: 'metric', id: m.id, name: m.name, subtitle: m.formula,
    icon: BR_METRIC_CATEGORIES.find(c => c.id === m.category)?.icon || 'layers',
    color: categoryColor(m.category), realtime: m.realtime, navigable: true,
  };
}

function featureNode(f) {
  return {
    kind: 'feature', id: f.id, name: f.name,
    subtitle: `${f.agg} · ${f.window}`,
    icon: f.agg === 'ML' ? 'sparkles' : 'function-square',
    color: f.agg === 'ML' ? KINDS.model.color : KINDS.feature.color,
    realtime: f.window === 'realtime', navigable: true,
  };
}

function modelNode(mdl) {
  return {
    kind: 'model', id: mdl.id, name: mdl.name,
    subtitle: `${mdl.target} · AUC ${mdl.auc.toFixed(3)}`,
    icon: KINDS.model.icon, color: KINDS.model.color, navigable: true,
  };
}

function segmentNode(s) {
  return {
    kind: 'segment', id: s.id, name: s.name,
    subtitle: `${s.size.toLocaleString()} users · ${s.game}`,
    icon: KINDS.segment.icon, color: KINDS.segment.color, navigable: true,
  };
}

function campaignNode(c) {
  return {
    kind: 'campaign', id: c.id, name: c.name,
    subtitle: `${c.channel} · ${c.status}`,
    icon: KINDS.campaign.icon, color: KINDS.campaign.color, navigable: true,
  };
}

// ─── Adapters ──────────────────────────────────────────────────────────

// metric → upstream (source, master table, dep metrics or model) + downstream
// (metrics that reference it, plus consumer buckets for segments/features/etc.)
const metricAdapter = {
  kindInfo: { ...KINDS.metric, label: 'Metric' },
  list: () => BR_METRICS,
  search: q => BR_METRICS.filter(m =>
    !q || m.name.toLowerCase().includes(q) || m.formula.toLowerCase().includes(q)
  ),
  groupBy: m => {
    const cat = BR_METRIC_CATEGORIES.find(c => c.id === m.category);
    return { id: m.category, label: cat?.label || 'Other', icon: cat?.icon || 'layers', color: cat?.color || T.n500 };
  },
  toGraph: m => {
    const cat = BR_METRIC_CATEGORIES.find(c => c.id === m.category);
    const depMetrics = (m.deps || [])
      .map(id => BR_METRICS.find(x => x.id === id || x.name === id))
      .filter(Boolean);
    const downMetrics = BR_METRICS.filter(x =>
      (x.deps || []).includes(m.id) || (x.deps || []).includes(m.name)
    );

    // Real fan-out: features that read this metric, segments that filter on it.
    const downFeatures = FEATURES.filter(f =>
      (f.metrics || []).includes(m.id) || (f.metrics || []).includes(m.name)
    );
    const downSegments = SEGMENTS.filter(s =>
      (s.filters || []).some(fl => fl.kind === 'metric' && (fl.ref === m.id || fl.ref === m.name))
    );
    // Segments whose campaigns ultimately flow from this metric (two hops).
    const segIds = new Set(downSegments.map(s => s.id));
    const downCampaigns = CAMPAIGNS.filter(c => segIds.has(c.segment));

    const upstream = [
      { label: 'Sources', edgeLabel: 'ingested into', nodes: [
        { kind: 'source', id: 'src_' + m.id, name: m.source,      subtitle: 'Kafka stream',    icon: KINDS.source.icon, color: KINDS.source.color },
        { kind: 'table',  id: 'tbl_' + m.id, name: m.masterTable, subtitle: m.games.join(' · '), icon: KINDS.table.icon,  color: KINDS.table.color },
      ]},
    ];

    if (m.model || depMetrics.length) {
      upstream.push({
        label: m.model ? 'Model' : 'Dependencies',
        edgeLabel: m.model ? 'scored by' : 'aggregated as',
        nodes: [
          ...(m.model ? [{ kind: 'model', id: m.model, name: m.model, subtitle: 'ML model', icon: KINDS.model.icon, color: KINDS.model.color, navigable: false }] : []),
          ...depMetrics.map(metricNode),
        ],
      });
    }

    const downstream = [];
    if (downMetrics.length)   downstream.push({ label: 'Downstream metrics', edgeLabel: 'feeds',    nodes: downMetrics.map(metricNode) });
    if (downFeatures.length)  downstream.push({ label: 'Features',           edgeLabel: 'read by',  nodes: downFeatures.map(featureNode) });
    if (downSegments.length)  downstream.push({ label: 'Segments',           edgeLabel: 'filters',  nodes: downSegments.map(segmentNode) });
    if (downCampaigns.length) downstream.push({ label: 'Campaigns',          edgeLabel: 'activates',nodes: downCampaigns.map(campaignNode) });
    if (!downstream.length) {
      downstream.push({ label: 'Usage', nodes: [
        { kind: 'dashboard', id: 'no_use_' + m.id, name: 'No consumers yet', subtitle: `usedBy: ${m.usedBy || 0}`, icon: 'circle-dashed', color: T.n400, navigable: false },
      ]});
    }

    return {
      self: {
        kind: 'metric', id: m.id, name: m.name, subtitle: m.formula,
        icon: cat?.icon || 'layers', color: cat?.color || T.n500,
        realtime: m.realtime,
        statusLabel: m.status, owner: m.owner, usedBy: m.usedBy,
      },
      upstream,
      downstream,
    };
  },
};

// feature → upstream (master table, metrics, model for ML) + downstream
// (models that train on it, segments that filter on it)
const featureAdapter = {
  kindInfo: { ...KINDS.feature, label: 'Feature' },
  list: () => FEATURES,
  search: q => FEATURES.filter(f =>
    !q || f.name.toLowerCase().includes(q) || (f.q || '').toLowerCase().includes(q)
  ),
  groupBy: f => ({ id: f.game, label: f.game, icon: 'gamepad-2', color: T.n700 }),
  toGraph: f => {
    const depMetrics = (f.metrics || [])
      .map(id => BR_METRICS.find(m => m.id === id || m.name === id))
      .filter(Boolean);
    const sourceModel = f.model ? MODELS.find(m => m.id === f.model) : null;

    const upstream = [];
    if (f.masterTable) {
      upstream.push({ label: 'Source', edgeLabel: 'reads from', nodes: [
        { kind: 'table', id: 'tbl_' + f.id, name: f.masterTable, subtitle: f.game, icon: KINDS.table.icon, color: KINDS.table.color },
      ]});
    }
    if (depMetrics.length) {
      upstream.push({ label: 'Metrics', edgeLabel: 'aggregated as', nodes: depMetrics.map(metricNode) });
    }
    if (sourceModel) {
      upstream.push({ label: 'Model', edgeLabel: 'scored by', nodes: [modelNode(sourceModel)] });
    }

    // Downstream: models that train on this feature, segments that filter on it.
    const downModels = MODELS.filter(m => (m.features || []).includes(f.id));
    const downSegments = SEGMENTS.filter(s =>
      (s.filters || []).some(fl => fl.kind === 'feature' && fl.ref === f.id)
    );
    const downstream = [];
    if (downModels.length)   downstream.push({ label: 'Models',   edgeLabel: 'trains', nodes: downModels.map(modelNode) });
    if (downSegments.length) downstream.push({ label: 'Segments', edgeLabel: 'filters', nodes: downSegments.map(segmentNode) });
    if (!downModels.length && !downSegments.length) {
      downstream.push({ label: 'Usage', nodes: [
        { kind: 'dashboard', id: 'no_use_' + f.id, name: 'No consumers yet', subtitle: 'feature is unused', icon: 'circle-dashed', color: T.n400, navigable: false },
      ]});
    }

    return {
      self: {
        kind: 'feature', id: f.id, name: f.name, subtitle: `${f.agg} · ${f.window}`,
        icon: f.agg === 'ML' ? 'sparkles' : 'function-square',
        color: f.agg === 'ML' ? KINDS.model.color : KINDS.feature.color,
        realtime: f.window === 'realtime',
        statusLabel: f.agg === 'ML' ? 'ML' : 'Feature', owner: f.owner,
      },
      upstream,
      downstream,
    };
  },
};

// model → upstream (features) + downstream (features emitted, segments/campaigns using it)
const modelAdapter = {
  kindInfo: { ...KINDS.model, label: 'Model' },
  list: () => MODELS,
  search: q => MODELS.filter(m =>
    !q || m.name.toLowerCase().includes(q) || (m.target || '').toLowerCase().includes(q)
  ),
  groupBy: m => ({ id: m.status, label: m.status, icon: 'sparkles', color: KINDS.model.color }),
  toGraph: mdl => {
    const trainFeatures = (mdl.features || [])
      .map(id => FEATURES.find(f => f.id === id)).filter(Boolean);
    const emittedFeatures = FEATURES.filter(f => f.model === mdl.id);

    const upstream = [];
    if (trainFeatures.length) {
      upstream.push({ label: 'Training features', edgeLabel: 'trained on', nodes: trainFeatures.map(featureNode) });
    }
    const downstream = [];
    if (emittedFeatures.length) {
      downstream.push({ label: 'Emits feature', edgeLabel: 'scores', nodes: emittedFeatures.map(featureNode) });
    }
    // Downstream segments = any segment whose filters reference an emitted feature.
    const emittedIds = new Set(emittedFeatures.map(f => f.id));
    const downSegments = SEGMENTS.filter(s =>
      (s.filters || []).some(fl => fl.kind === 'feature' && emittedIds.has(fl.ref))
    );
    if (downSegments.length) {
      downstream.push({ label: 'Used in segments', edgeLabel: 'filters via', nodes: downSegments.map(segmentNode) });
    }

    return {
      self: {
        kind: 'model', id: mdl.id, name: mdl.name, subtitle: mdl.target,
        icon: KINDS.model.icon, color: KINDS.model.color,
        statusLabel: mdl.status, owner: `AUC ${mdl.auc.toFixed(3)}`,
      },
      upstream,
      downstream,
    };
  },
};

// segment → upstream (filters: features + metrics) + downstream (campaigns)
const segmentAdapter = {
  kindInfo: { ...KINDS.segment, label: 'Segment' },
  list: () => SEGMENTS,
  search: q => SEGMENTS.filter(s =>
    !q || s.name.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q)
  ),
  groupBy: s => ({ id: s.game, label: s.game, icon: 'gamepad-2', color: T.n700 }),
  toGraph: s => {
    const filterFeatures = (s.filters || [])
      .filter(fl => fl.kind === 'feature')
      .map(fl => FEATURES.find(f => f.id === fl.ref))
      .filter(Boolean);
    const filterMetrics = (s.filters || [])
      .filter(fl => fl.kind === 'metric')
      .map(fl => BR_METRICS.find(m => m.id === fl.ref))
      .filter(Boolean);
    const downCampaigns = CAMPAIGNS.filter(c => c.segment === s.id);

    const upstream = [];
    if (filterFeatures.length) upstream.push({ label: 'Features',  edgeLabel: 'filters on', nodes: filterFeatures.map(featureNode) });
    if (filterMetrics.length)  upstream.push({ label: 'Metrics',   edgeLabel: 'filters on', nodes: filterMetrics.map(metricNode) });

    const downstream = [];
    if (downCampaigns.length) {
      downstream.push({ label: 'Campaigns', edgeLabel: 'activates', nodes: downCampaigns.map(campaignNode) });
    } else {
      downstream.push({ label: 'Usage', nodes: [
        { kind: 'dashboard', id: 'no_cmp_' + s.id, name: 'No live campaigns', subtitle: 'segment is available for targeting', icon: 'circle-dashed', color: T.n400, navigable: false },
      ]});
    }

    return {
      self: {
        kind: 'segment', id: s.id, name: s.name, subtitle: s.desc,
        icon: KINDS.segment.icon, color: KINDS.segment.color,
        statusLabel: s.status, owner: s.owner, usedBy: s.size,
      },
      upstream,
      downstream,
    };
  },
};

// campaign → upstream (segment, optionally model)
const campaignAdapter = {
  kindInfo: { ...KINDS.campaign, label: 'Campaign' },
  list: () => CAMPAIGNS,
  search: q => CAMPAIGNS.filter(c =>
    !q || c.name.toLowerCase().includes(q) || (c.channel || '').toLowerCase().includes(q)
  ),
  groupBy: c => ({ id: c.status, label: c.status, icon: 'rocket', color: KINDS.campaign.color }),
  toGraph: c => {
    const seg = SEGMENTS.find(s => s.id === c.segment);
    const upstream = seg
      ? [{ label: 'Targets', edgeLabel: 'activates', nodes: [segmentNode(seg)] }]
      : [];
    return {
      self: {
        kind: 'campaign', id: c.id, name: c.name, subtitle: `${c.channel} · ${c.status}`,
        icon: KINDS.campaign.icon, color: KINDS.campaign.color,
        statusLabel: c.status, owner: `${c.converted} converted`,
      },
      upstream,
      downstream: [{ label: 'Delivery', nodes: [
        { kind: 'dashboard', id: 'cmp_funnel_' + c.id, name: 'Campaign funnel', subtitle: `${c.ctr} CTR · ${c.revenue}`, icon: 'bar-chart-3', color: '#3f8dff', navigable: false },
      ]}],
    };
  },
};

// ─── Registry ──────────────────────────────────────────────────────────

const ADAPTERS = {
  metric:   metricAdapter,
  feature:  featureAdapter,
  model:    modelAdapter,
  segment:  segmentAdapter,
  campaign: campaignAdapter,
};

// Given a kind + id, return the underlying entity. Used by the drawer's
// navigation stack when a user clicks a node to navigate to its lineage.
function resolveEntity(kind, id) {
  const a = ADAPTERS[kind];
  if (!a) return null;
  return a.list().find(e => e.id === id || e.name === id) || null;
}

export { ADAPTERS, KINDS, resolveEntity };
