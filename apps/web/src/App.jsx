import React from 'react';
import { T, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Avatar } from './theme.jsx';
import { SegmentBuilder } from './SegmentBuilder.jsx';
import { LiveMonitor } from './LiveMonitor.jsx';
import { DataConnectors, RawExplorer, FeatureBuilder, PropensityModels, Campaigns, GameAnalytics } from './Screens.jsx';
import { Sources } from './Sources.jsx';
import { MappingStudio } from './MappingStudio.jsx';
import { DataCatalog } from './data-catalog/index.jsx';
import { MetricBuilder } from './metric-builder/index.jsx';
import { MetricsCatalog } from './MetricsCatalog.jsx';
import { FreshnessSLAs } from './FreshnessSLAs.jsx';

// ═══════════════════════════════════════════════════════════════════════
// TWEAKS — tweakable defaults
// ═══════════════════════════════════════════════════════════════════════
const TWEAKS = /*EDITMODE-BEGIN*/{
  "navStyle": "left-rail",
  "chartType": "area",
  "segmentBuilderLayout": "canvas",
  "darkMode": false,
  "accentColor": "#f05a22"
}/*EDITMODE-END*/;

// IA mirrors the data-pipeline layering: Sources → Metrics → Intelligence → Activation.
//   Sources       — raw event plumbing + the catalog browser of all artefacts
//   Metrics       — author / browse / operate calculated metrics
//   Intelligence  — features + propensity models built on metrics
//   Activation    — segment, monitor, campaigns, analytics
const NAV = [
  { group: 'Sources',      items: [
    { id: 'sources',    label: 'Sources',            icon: 'database' },
    { id: 'explorer',   label: 'Raw data explorer',  icon: 'file-search' },
    { id: 'mapping',    label: 'Mapping Studio',     icon: 'git-branch', primary: true },
    { id: 'datacatalog', label: 'Data Catalog',      icon: 'library' },
  ]},
  { group: 'Metrics',      items: [
    { id: 'metric-builder', label: 'Metric Builder', icon: 'sigma' },
    { id: 'metrics',    label: 'Metrics Catalog',    icon: 'layers' },
    { id: 'freshness',  label: 'Freshness & SLAs',   icon: 'timer' },
  ]},
  { group: 'Intelligence', items: [
    { id: 'features',   label: 'Feature builder',    icon: 'function-square' },
    { id: 'models',     label: 'Propensity models',  icon: 'sparkles' },
  ]},
  { group: 'Activation',   items: [
    { id: 'builder',    label: 'Segment builder',    icon: 'share-2' },
    { id: 'monitor',    label: 'Live segment monitor', icon: 'radio', live: true },
    { id: 'campaigns',  label: 'Campaigns',          icon: 'rocket' },
    { id: 'analytics',  label: 'Game analytics',     icon: 'bar-chart-3' },
  ]},
];

const ROLES = [
  { id: 'liveops',  label: 'LiveOps manager', color: '#f05a22', initial: 'LM', defaultPage: 'monitor',
    pages: new Set(['monitor', 'campaigns', 'analytics', 'builder', 'metrics', 'metric-builder', 'datacatalog']) },
  { id: 'data',     label: 'Data / ML engineer', color: '#a855f7', initial: 'DS', defaultPage: 'mapping',
    pages: new Set(['sources', 'mapping', 'datacatalog', 'metric-builder', 'metrics', 'freshness', 'explorer', 'features', 'models', 'builder']) },
  { id: 'producer', label: 'Game producer', color: '#059669', initial: 'GP', defaultPage: 'analytics',
    pages: new Set(['monitor', 'campaigns', 'analytics', 'metrics']) },
  { id: 'all',      label: 'All access', color: '#0a0a0a', initial: 'AD',  defaultPage: 'mapping',
    pages: null },
];

// ─── Brand mark (Bedrock appmark PNG) ───────────────────────────
// Single source of truth for the app logo. Swap the PNG path once, it
// updates everywhere (left rail, top tabs, stepper).
function BrandMark({ size = 32, style }) {
  return (
    <img
      src="/assets/logo/appmark-dark.png"
      alt="Bedrock"
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, borderRadius: 8, flexShrink: 0, ...style }}
    />
  );
}

// ─── Tweaks panel ───────────────────────────────────────────────
function TweaksPanel({ tweaks, setTweak, visible, onClose }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: 300, zIndex: 1000,
      background: '#fff', borderRadius: 12, border: `1px solid ${T.n200}`,
      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25), 0 8px 16px -4px rgba(0,0,0,0.1)',
      fontFamily: T.fSans,
    }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="sliders-horizontal" size={14} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Tweaks</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}><Icon name="x" size={14} /></Button>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.n500, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Navigation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[{ v: 'left-rail', l: 'Left rail' }, { v: 'top-tabs', l: 'Top tabs' }, { v: 'stepper', l: 'Stepper' }].map(o => (
              <div key={o.v} onClick={() => setTweak('navStyle', o.v)} style={{
                padding: '7px 6px', borderRadius: 6, textAlign: 'center', cursor: 'pointer',
                fontSize: 11, fontWeight: 500,
                border: `1px solid ${tweaks.navStyle === o.v ? T.brand : T.n200}`,
                background: tweaks.navStyle === o.v ? T.brandSoft : '#fff',
                color: tweaks.navStyle === o.v ? T.brand : T.n700,
              }}>{o.l}</div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.n500, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Segment builder layout</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[{ v: 'canvas', l: 'Canvas' }, { v: 'sidebar', l: 'Sidebar' }, { v: 'wizard', l: 'Wizard' }].map(o => (
              <div key={o.v} onClick={() => setTweak('segmentBuilderLayout', o.v)} style={{
                padding: '7px 6px', borderRadius: 6, textAlign: 'center', cursor: 'pointer',
                fontSize: 11, fontWeight: 500,
                border: `1px solid ${tweaks.segmentBuilderLayout === o.v ? T.brand : T.n200}`,
                background: tweaks.segmentBuilderLayout === o.v ? T.brandSoft : '#fff',
                color: tweaks.segmentBuilderLayout === o.v ? T.brand : T.n700,
              }}>{o.l}</div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.n500, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Live monitor chart</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[{ v: 'area', l: 'Area' }, { v: 'line', l: 'Line' }].map(o => (
              <div key={o.v} onClick={() => setTweak('chartType', o.v)} style={{
                padding: '7px 6px', borderRadius: 6, textAlign: 'center', cursor: 'pointer',
                fontSize: 11, fontWeight: 500,
                border: `1px solid ${tweaks.chartType === o.v ? T.brand : T.n200}`,
                background: tweaks.chartType === o.v ? T.brandSoft : '#fff',
                color: tweaks.chartType === o.v ? T.brand : T.n700,
              }}>{o.l}</div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: T.n900, fontWeight: 500 }}>Dark mode</div>
            <div style={{ fontSize: 11, color: T.n500 }}>Invert the neutral palette</div>
          </div>
          <Switch checked={tweaks.darkMode} onChange={v => setTweak('darkMode', v)} />
        </div>

        <a href="variations.html" style={{
          display: 'block', padding: '10px 12px', borderRadius: 8, background: T.n950, color: '#fff',
          fontSize: 12, fontWeight: 500, textDecoration: 'none', textAlign: 'center',
        }}>
          Open variations canvas →
        </a>
      </div>
    </div>
  );
}

// ─── Role Switcher ─────────────────────────────────────────────
function RoleSwitcher({ role, onChange }) {
  const [open, setOpen] = React.useState(false);
  const r = ROLES.find(x => x.id === role);
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 6px 6px',
        borderRadius: 8, cursor: 'pointer', background: T.n100, border: `1px solid ${T.n200}`,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: r.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', fontFamily: T.fSans,
        }}>{r.initial}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: T.n500, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1 }}>Viewing as</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.n900, lineHeight: 1.2 }}>{r.label}</div>
        </div>
        <Icon name="chevrons-up-down" size={13} color={T.n500} />
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 51,
            background: '#fff', borderRadius: 10, border: `1px solid ${T.n200}`,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)', padding: 4, minWidth: 240,
          }}>
            {ROLES.map(rr => (
              <div key={rr.id} onClick={() => { onChange(rr.id); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                background: rr.id === role ? T.brandSoft : 'transparent',
              }} onMouseEnter={e => { if (rr.id !== role) e.currentTarget.style.background = T.n50; }}
                 onMouseLeave={e => { if (rr.id !== role) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: rr.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>{rr.initial}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>{rr.label}</div>
                  <div style={{ fontSize: 10, color: T.n500 }}>
                    {rr.pages ? `${rr.pages.size} pages` : 'All pages'}
                  </div>
                </div>
                {rr.id === role && <Icon name="check" size={13} color={T.brand} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Left Rail ─────────────────────────────────────────────────
function LeftRail({ page, setPage, role, setRole }) {
  const r = ROLES.find(x => x.id === role);
  useLucide(page);
  return (
    <div style={{
      width: 248, background: '#fff', borderRight: `1px solid ${T.n200}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${T.n200}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={32} />
          <div>
            <div style={{ fontFamily: T.fDisp, fontSize: 20, fontWeight: 400, color: T.n950, lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Bedrock</div>
            <div style={{ fontFamily: T.fSans, fontSize: 10, color: T.n500, marginTop: 2 }}>The foundation LiveOps builds on</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, borderBottom: `1px solid ${T.n200}` }}>
        <RoleSwitcher role={role} onChange={setRole} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 8px' }}>
        {NAV.map(sec => {
          const visible = sec.items.filter(i => !r.pages || r.pages.has(i.id));
          if (!visible.length) return null;
          return (
            <div key={sec.group} style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily: T.fSans, fontSize: 10, fontWeight: 600, color: T.n400,
                padding: '4px 12px 6px', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{sec.group}</div>
              {visible.map(item => {
                const active = page === item.id;
                return (
                  <div key={item.id} onClick={() => setPage(item.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 7, cursor: 'pointer',
                    fontFamily: T.fSans, fontSize: 13, fontWeight: 500,
                    color: active ? T.n950 : T.n700,
                    background: active ? T.n100 : 'transparent',
                    marginBottom: 1,
                    position: 'relative',
                  }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.n50; }}
                     onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    {active && <span style={{ position: 'absolute', left: -8, top: 8, bottom: 8, width: 3, borderRadius: 2, background: T.brand }} />}
                    <Icon name={item.icon} size={15} color={active ? T.brand : T.n500} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.live && <span style={{
                      width: 6, height: 6, borderRadius: 9999, background: '#22c55e',
                      boxShadow: '0 0 0 0 rgba(34,197,94,0.5)', animation: 'pulse-dot 1.6s infinite',
                    }} />}
                    {item.primary && !active && <Badge variant="brandSoft" style={{ padding: '1px 6px', fontSize: 9 }}>hot</Badge>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ padding: 12, borderTop: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={r.label} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.n900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Khoi Tran</div>
          <div style={{ fontSize: 10, color: T.n500 }}>khoitn@vng.com.vn</div>
        </div>
        <Button variant="ghost" size="icon-sm"><Icon name="settings" size={13} /></Button>
      </div>
    </div>
  );
}

// ─── Top Tabs nav ──────────────────────────────────────────────
function TopTabs({ page, setPage, role, setRole }) {
  const r = ROLES.find(x => x.id === role);
  const allItems = NAV.flatMap(s => s.items);
  const visible = allItems.filter(i => !r.pages || r.pages.has(i.id));
  useLucide(page);
  return (
    <div style={{ background: '#fff', borderBottom: `1px solid ${T.n200}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 14 }}>
        <BrandMark size={32} />
        <div style={{ fontFamily: T.fDisp, fontSize: 18, fontWeight: 400, color: T.n950, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Bedrock</div>
        <div style={{ flex: 1 }} />
        <Input size="sm" leftIcon="search" placeholder="Search segments, features…" style={{ width: 280 }} />
        <Button variant="ghost" size="icon-sm"><Icon name="bell" size={14} /></Button>
        <RoleSwitcher role={role} onChange={setRole} />
      </div>
      <div style={{ padding: '0 20px', display: 'flex', gap: 4, overflow: 'auto' }}>
        {visible.map(item => {
          const active = page === item.id;
          return (
            <div key={item.id} onClick={() => setPage(item.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 12px', fontSize: 12, fontFamily: T.fSans, fontWeight: 500,
              color: active ? T.n950 : T.n600, cursor: 'pointer',
              borderBottom: `2px solid ${active ? T.brand : 'transparent'}`,
              marginBottom: -1,
            }}>
              <Icon name={item.icon} size={13} color={active ? T.brand : T.n500} />
              {item.label}
              {item.live && <span style={{ width: 5, height: 5, borderRadius: 9999, background: '#22c55e', animation: 'pulse-dot 1.6s infinite' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stepper nav ───────────────────────────────────────────────
function Stepper({ page, setPage, role, setRole }) {
  const r = ROLES.find(x => x.id === role);
  const allItems = NAV.flatMap(s => s.items);
  const visible = allItems.filter(i => !r.pages || r.pages.has(i.id));
  const curIdx = visible.findIndex(i => i.id === page);
  useLucide(page);
  return (
    <div style={{ background: '#fff', borderBottom: `1px solid ${T.n200}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 14 }}>
        <BrandMark size={32} />
        <div style={{ fontFamily: T.fDisp, fontSize: 18, fontWeight: 400, color: T.n950, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Bedrock · Workflow</div>
        <div style={{ flex: 1 }} />
        <RoleSwitcher role={role} onChange={setRole} />
      </div>
      <div style={{ display: 'flex', padding: '12px 20px', gap: 0, overflow: 'auto', alignItems: 'center' }}>
        {visible.map((item, i) => {
          const active = i === curIdx;
          const done = i < curIdx;
          return (
            <React.Fragment key={item.id}>
              <div onClick={() => setPage(item.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 9999,
                fontSize: 12, fontFamily: T.fSans, fontWeight: 500,
                color: active ? '#fff' : done ? T.n900 : T.n600, cursor: 'pointer',
                background: active ? T.brand : done ? T.brandSoft : T.n100,
                border: done ? `1px solid ${T.brandBorder}` : '1px solid transparent',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9999,
                  background: active ? '#fff' : done ? T.brand : T.n300,
                  color: active ? T.brand : '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>{done ? '✓' : i + 1}</div>
                {item.label}
              </div>
              {i < visible.length - 1 && <div style={{ width: 20, height: 1, background: T.n300 }} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Segment Builder: Sidebar variant ──────────────────────────
function SegmentBuilderSidebar() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', background: T.n50 }}>
      <div>
        <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Segment builder · Sidebar variant</div>
        <h1 style={{ fontFamily: T.fDisp, fontSize: 40, fontWeight: 400, lineHeight: 0.98, letterSpacing: '0.005em', textTransform: 'uppercase', color: T.n950, margin: 0 }}>PTG High-Value at Risk</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <Card padding={0}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Filters</div>
            <Badge variant="secondary">3 active</Badge>
            <div style={{ flex: 1 }} />
            <Button variant="outline" size="sm" leftIcon="plus">Add filter</Button>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { f: 'purchase_amount_30d', op: '≥', v: '50 USD', matches: '68.2K', icon: 'filter' },
              { f: 'sessions_last_7d',    op: '≥', v: '3 sessions', matches: '942K', icon: 'filter' },
              { f: 'churn_risk_score',    op: '≥', v: '0.6 (propensity v4)', matches: '184K', icon: 'sparkles', ml: true },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                borderRadius: 8, border: `1px solid ${T.n200}`, background: '#fff',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: f.ml ? '#faf5ff' : T.brandSoft, color: f.ml ? T.purple500 : T.brand,
                }}><Icon name={f.icon} size={14} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900 }}>{f.f}</div>
                  <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginTop: 2 }}>{f.op} {f.v} · matches {f.matches}</div>
                </div>
                <Select size="sm" value="and" onChange={() => {}} options={[{ value: 'and', label: 'AND' }, { value: 'or', label: 'OR' }]} />
                <Button variant="ghost" size="icon-sm"><Icon name="trash-2" size={13} /></Button>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card padding={18}>
            <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>Live segment size</div>
            <div style={{ fontFamily: T.fDisp, fontSize: 42, color: T.n950, lineHeight: 1, textTransform: 'uppercase' }}>18,420</div>
            <div style={{ fontFamily: T.fSans, fontSize: 12, color: T.green600, fontWeight: 600, marginTop: 4 }}>+312 / 24h · trending up</div>
          </Card>
          <Card padding={18}>
            <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 10 }}>Generated SQL</div>
            <pre style={{ margin: 0, fontFamily: T.fMono, fontSize: 10.5, lineHeight: 1.5, color: T.n600, whiteSpace: 'pre-wrap' }}>
{`SELECT user_id
FROM features.player_daily
WHERE game = 'PTG'
  AND purchase_amount_30d >= 50
  AND sessions_last_7d >= 3
  AND churn_risk_score >= 0.6`}
            </pre>
          </Card>
          <Button variant="primary" size="default" leftIcon="rocket">Activate segment</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Segment Builder: Wizard variant ──────────────────────────
function SegmentBuilderWizard() {
  const [step, setStep] = React.useState(2);
  const steps = [
    { id: 0, label: 'Pick population',   icon: 'users' },
    { id: 1, label: 'Add filters',       icon: 'filter' },
    { id: 2, label: 'Layer ML',          icon: 'sparkles' },
    { id: 3, label: 'Preview & activate',icon: 'rocket' },
  ];
  useLucide(step);
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflow: 'auto', background: T.n50 }}>
      <div>
        <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Segment builder · Wizard variant</div>
        <h1 style={{ fontFamily: T.fDisp, fontSize: 40, fontWeight: 400, lineHeight: 0.98, letterSpacing: '0.005em', textTransform: 'uppercase', color: T.n950, margin: 0 }}>Build a segment in 4 steps</h1>
      </div>

      <div style={{ display: 'flex', gap: 0, background: '#fff', borderRadius: 12, border: `1px solid ${T.n200}`, padding: 4 }}>
        {steps.map((s, i) => {
          const active = step === s.id, done = step > s.id;
          return (
            <div key={s.id} onClick={() => setStep(s.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
              background: active ? T.brandSoft : 'transparent',
              border: `1px solid ${active ? T.brandBorder : 'transparent'}`,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9999,
                background: active ? T.brand : done ? '#d1fae5' : T.n100,
                color: active ? '#fff' : done ? T.green600 : T.n500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>{done ? '✓' : i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: T.n500, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Step {i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>{s.label}</div>
              </div>
              <Icon name={s.icon} size={16} color={active ? T.brand : T.n400} />
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <Card padding={22}>
          <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.brand, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>Step 3 of 4</div>
          <div style={{ fontFamily: T.fDisp, fontSize: 32, color: T.n950, textTransform: 'uppercase', marginBottom: 6 }}>Layer in a propensity model</div>
          <div style={{ fontFamily: T.fSans, fontSize: 13, color: T.n500, marginBottom: 20 }}>Narrow the segment to players predicted to churn, based on our production ML models. Optional — skip if you just want rule-based targeting.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'PTG Churn v4', target: 'Will churn in 14 days', auc: 0.872, selected: true },
              { name: 'PTG Propensity to Pay v7', target: 'Will spend $5+ in 7d', auc: 0.814, selected: false },
              { name: 'Skip — rule-based only', target: 'Use only the filters above',  auc: null, selected: false },
            ].map((m, i) => (
              <div key={i} style={{
                padding: 14, borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${m.selected ? T.brand : T.n200}`,
                background: m.selected ? T.brandSoft : '#fff',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 9999,
                  border: `2px solid ${m.selected ? T.brand : T.n300}`,
                  background: m.selected ? T.brand : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{m.selected && <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#fff' }} />}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Icon name={m.auc ? 'sparkles' : 'x-circle'} size={14} color={m.auc ? T.purple500 : T.n400} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>{m.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.n500 }}>{m.target}</div>
                </div>
                {m.auc && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: T.fMono, fontSize: 13, fontWeight: 600, color: T.n900 }}>AUC {m.auc}</div>
                    <div style={{ fontSize: 10, color: T.n500 }}>production</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 16, borderRadius: 10, border: `1px solid ${T.n200}`, background: T.n50 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.n500, marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Threshold</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 6, background: T.n200, borderRadius: 3, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%', background: `linear-gradient(90deg, ${T.green600}, ${T.amber500}, ${T.red600})`, borderRadius: 3 }} />
                  <div style={{ position: 'absolute', left: '60%', top: -5, width: 16, height: 16, borderRadius: 9999, background: '#fff', border: `2px solid ${T.brand}`, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.fMono, fontSize: 10, color: T.n500, marginTop: 4 }}>
                  <span>0.0 low risk</span><span>0.6 ← selected</span><span>1.0 high risk</span>
                </div>
              </div>
              <Input size="sm" value="0.6" onChange={() => {}} style={{ width: 72 }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button variant="outline" size="default" leftIcon="arrow-left" onClick={() => setStep(step - 1)}>Back</Button>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="default">Skip</Button>
            <Button variant="primary" size="default" rightIcon="arrow-right" onClick={() => setStep(step + 1)}>Preview segment</Button>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card padding={18}>
            <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>Segment size (est.)</div>
            <div style={{ fontFamily: T.fDisp, fontSize: 42, color: T.n950, lineHeight: 1, textTransform: 'uppercase' }}>18,420</div>
            <div style={{ fontFamily: T.fSans, fontSize: 12, color: T.n600, marginTop: 6 }}>Narrowed from 2.4M PTG players through 3 filters + 1 model.</div>
          </Card>
          <Card padding={18}>
            <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Decisions so far</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}><Icon name="check-circle-2" size={13} color={T.green600} /><span><strong style={{ color: T.n900 }}>Population:</strong> <span style={{ color: T.n600 }}>PTG Players (2.4M)</span></span></div>
              <div style={{ display: 'flex', gap: 8 }}><Icon name="check-circle-2" size={13} color={T.green600} /><span><strong style={{ color: T.n900 }}>Filters:</strong> <span style={{ color: T.n600 }}>3 added</span></span></div>
              <div style={{ display: 'flex', gap: 8 }}><Icon name="circle-dot" size={13} color={T.brand} /><span><strong style={{ color: T.n900 }}>ML model:</strong> <span style={{ color: T.n600 }}>PTG Churn v4</span></span></div>
              <div style={{ display: 'flex', gap: 8 }}><Icon name="circle" size={13} color={T.n300} /><span style={{ color: T.n400 }}><strong>Activation:</strong> pending</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const loadLocalTweaks = () => {
    try { return JSON.parse(localStorage.getItem('lo_tweaks') || '{}'); } catch { return {}; }
  };
  const [tweaks, setTweaks] = React.useState(() => ({ ...TWEAKS, ...loadLocalTweaks() }));
  const [page, setPage] = React.useState(() => localStorage.getItem('lo_page') || 'mapping');
  const [role, setRoleRaw] = React.useState(() => localStorage.getItem('lo_role') || 'liveops');
  const setRole = React.useCallback((newRole) => {
    setRoleRaw(newRole);
    localStorage.setItem('lo_role', newRole);
    const r = ROLES.find(x => x.id === newRole);
    setPage(prev => (!r.pages || r.pages.has(prev)) ? prev : r.defaultPage);
  }, []);
  const [showTweaks, setShowTweaks] = React.useState(false);

  React.useEffect(() => { localStorage.setItem('lo_tweaks', JSON.stringify(tweaks)); }, [tweaks]);
  React.useEffect(() => { localStorage.setItem('lo_page', page); }, [page]);

  const setTweak = (k, v) => setTweaks(t => ({ ...t, [k]: v }));

  const isDark = tweaks.darkMode;

  const renderPage = () => {
    switch (page) {
      case 'sources':    return <Sources />;
      case 'mapping':    return <MappingStudio setPage={setPage} />;
      case 'datacatalog': return <DataCatalog setPage={setPage} />;
      case 'metric-builder': return <MetricBuilder setPage={setPage} />;
      case 'metrics':    return <MetricsCatalog setPage={setPage} />;
      case 'freshness':  return <FreshnessSLAs />;
      case 'explorer':   return <RawExplorer />;
      case 'features':   return <FeatureBuilder />;
      case 'models':     return <PropensityModels />;
      case 'builder':
        if (tweaks.segmentBuilderLayout === 'sidebar') return <SegmentBuilderSidebar />;
        if (tweaks.segmentBuilderLayout === 'wizard')  return <SegmentBuilderWizard />;
        return <SegmentBuilder />;
      case 'monitor':    return <LiveMonitor chartType={tweaks.chartType} />;
      case 'campaigns':  return <Campaigns />;
      case 'analytics':  return <GameAnalytics />;
      // Legacy page ID kept for old localStorage values — DataConnectors still available.
      case 'connectors': return <DataConnectors />;
      default:           return <MappingStudio />;
    }
  };

  const wrapperBg = isDark ? '#0a0a0a' : T.n50;
  const wrapperFilter = isDark ? 'invert(1) hue-rotate(180deg)' : 'none';

  return (
    <div data-screen-label={page} style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: wrapperBg, filter: wrapperFilter }}>
      {tweaks.navStyle === 'top-tabs' && <TopTabs page={page} setPage={setPage} role={role} setRole={setRole} />}
      {tweaks.navStyle === 'stepper' && <Stepper page={page} setPage={setPage} role={role} setRole={setRole} />}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {tweaks.navStyle === 'left-rail' && <LeftRail page={page} setPage={setPage} role={role} setRole={setRole} />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {tweaks.navStyle === 'left-rail' && (
            <div style={{ padding: '10px 24px', background: '#fff', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.fSans, fontSize: 12, color: T.n500 }}>
                <span>Bedrock</span>
                <Icon name="chevron-right" size={11} />
                <span style={{ color: T.n900, fontWeight: 500, textTransform: 'capitalize' }}>{NAV.flatMap(s=>s.items).find(i=>i.id===page)?.label}</span>
              </div>
              <div style={{ flex: 1 }} />
              <Input size="sm" leftIcon="search" placeholder="Search segments, features, tables…" style={{ width: 300 }} />
              <Button variant="ghost" size="icon-sm"><Icon name="git-pull-request" size={14} /></Button>
              <Button variant="ghost" size="icon-sm"><Icon name="bell" size={14} /></Button>
              <div style={{ width: 1, height: 20, background: T.n200, margin: '0 4px' }} />
              <Button variant="outline" size="sm" leftIcon="sliders-horizontal" onClick={() => setShowTweaks(s => !s)}>Tweaks</Button>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {renderPage()}
          </div>
        </div>
      </div>
      <TweaksPanel tweaks={tweaks} setTweak={setTweak} visible={showTweaks} onClose={() => setShowTweaks(false)} />
    </div>
  );
}
