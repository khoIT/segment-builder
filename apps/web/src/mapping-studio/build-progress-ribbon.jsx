import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useBuildJobStatus } from '../api/hooks.js';

// Sticky ribbon under the MappingStudio header. Polls every 1.5s via
// the existing useBuildJobStatus hook. Calls onSettled when status
// reaches a terminal state (completed/failed).

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function BuildProgressRibbon({ masterTableId, jobId, masterTableName, onSettled, onViewCatalog }) {
  const jobQ = useBuildJobStatus(masterTableId, jobId);
  const job = jobQ.data;
  const status = job?.status;

  React.useEffect(() => {
    if (status === 'completed' || status === 'failed') {
      onSettled?.(status, job);
    }
  }, [status, job, onSettled]);

  const isLive = status === 'running' || status === 'pending' || (!status && !!jobId);
  const isDone = status === 'completed';
  const isFail = status === 'failed';

  const bg = isFail ? '#fee2e2' : isDone ? '#dcfce7' : T.brandSoft ?? '#fff7ed';
  const fg = isFail ? '#991b1b' : isDone ? '#166534' : T.brand;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', background: bg, borderRadius: 8,
      border: `1px solid ${fg}33`, fontFamily: T.fSans, fontSize: 12,
    }}>
      <Icon name={isFail ? 'alert-triangle' : isDone ? 'check-circle' : 'loader-2'} size={16} color={fg} />
      <div style={{ flex: 1 }}>
        <div style={{ color: fg, fontWeight: 600 }}>
          {isFail && `Build failed: ${job?.error ?? 'unknown error'}`}
          {isDone && `Built ${fmtNum(job?.processedRows ?? 0)} rows in ${masterTableName}`}
          {isLive && `Building ${masterTableName}…`}
        </div>
        {isLive && (
          <div style={{ color: T.n600, fontSize: 11, marginTop: 2, fontFamily: T.fMono }}>
            {fmtNum(job?.processedRows ?? 0)} rows processed
          </div>
        )}
      </div>
      {isDone && (
        <button
          type="button"
          onClick={onViewCatalog}
          style={{
            padding: '6px 12px', borderRadius: 6,
            background: T.brand, color: T.n0, border: 'none',
            fontFamily: T.fSans, fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          View in Data Catalog →
        </button>
      )}
    </div>
  );
}
