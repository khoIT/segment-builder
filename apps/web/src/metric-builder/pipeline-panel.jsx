import React from 'react';
import { T, Icon, Button, Badge } from '../theme.jsx';
import { useMetricPipeline, useRunMetricNow, usePauseMetric, useMetricRuns } from '../api/hooks.js';

// Compact pipeline-status panel — drops onto MetricsCatalog detail
// for any metric that has a metric_pipelines row. Shows status,
// last run, next run, last row count + Run now / Pause / Resume.

function statusVariant(s) {
  switch (s) {
    case 'active':  return 'brandSoft';
    case 'running': return 'info';
    case 'failed':  return 'danger';
    case 'paused':  return 'secondary';
    default:        return 'secondary';
  }
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return d.toLocaleString();
}

export function PipelinePanel({ metricId }) {
  const pipelineQ = useMetricPipeline(metricId);
  const runsQ = useMetricRuns(metricId);
  const runNow = useRunMetricNow();
  const pause = usePauseMetric();

  // Hide gracefully when no pipeline registered for this metric.
  if (pipelineQ.isLoading) return null;
  if (pipelineQ.error || !pipelineQ.data) return null;

  const p = pipelineQ.data;
  const paused = p.status === 'paused';
  const running = p.status === 'running' || runNow.isPending;
  const lastRun = runsQ.data?.items?.[0];

  return (
    <div style={{
      marginTop: -4, marginBottom: 16,
      padding: '12px 14px', borderRadius: 10,
      background: T.n50, border: `1px solid ${T.n200}`,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="rocket" size={14} color={T.brand} />
        <span style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Pipeline
        </span>
        <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: T.n500, fontFamily: T.fMono }}>{p.schedule}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: T.n600 }}>
        <span>Last run: <span style={{ color: T.n900, fontFamily: T.fMono }}>{fmtTime(p.lastRunAt)}</span></span>
        <span>Next: <span style={{ color: T.n900, fontFamily: T.fMono }}>{fmtTime(p.nextRunAt)}</span></span>
        {p.lastRowCount != null && (
          <span>Rows: <span style={{ color: T.n900, fontFamily: T.fMono }}>{Number(p.lastRowCount).toLocaleString()}</span></span>
        )}
      </div>

      {p.lastError && (
        <div style={{
          padding: '6px 10px', borderRadius: 6,
          background: '#fee2e2', color: '#991b1b',
          fontSize: 11, fontFamily: T.fMono, lineHeight: 1.4,
        }}>{p.lastError}</div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <Button
          variant="primary" size="sm"
          onClick={() => runNow.mutate(metricId)}
          disabled={running || paused}
        >
          <Icon name="play" size={12} /> {running ? 'Running…' : 'Run now'}
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => pause.mutate({ id: metricId, paused })}
          disabled={pause.isPending}
        >
          <Icon name={paused ? 'play-circle' : 'pause-circle'} size={12} />
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>

      {lastRun && (
        <div style={{ fontSize: 10, color: T.n500, fontFamily: T.fMono }}>
          Latest: {lastRun.status} · {lastRun.rowCount ?? '—'} rows · {fmtTime(lastRun.finishedAt)}
        </div>
      )}
    </div>
  );
}
