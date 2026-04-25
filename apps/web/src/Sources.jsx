import React from 'react';
import { T, Icon, Button, Input, Card, SectionHeader } from './theme.jsx';
import { useConnectors } from './api/hooks.js';
import { ConnectorCard } from './sources/connector-card.jsx';
import { AddConnectorModal } from './sources/add-connector-modal.jsx';

function Sources() {
  const [search, setSearch]     = React.useState('');
  const [showModal, setModal]   = React.useState(false);

  const connectorsQ = useConnectors();
  const allItems = connectorsQ.data?.items ?? [];

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allItems;
    return allItems.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      c.env.toLowerCase().includes(q),
    );
  }, [allItems, search]);

  const isLoading = connectorsQ.isLoading;
  const isError   = connectorsQ.isError;

  return (
    <div style={{
      padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
      height: '100%', overflow: 'auto', background: T.n50,
    }}>
      <SectionHeader
        eyebrow="Sources"
        title="Data Connectors"
        right={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon="refresh-cw"
              onClick={() => connectorsQ.refetch()}
              disabled={connectorsQ.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="neutral"
              size="sm"
              leftIcon="plus"
              onClick={() => setModal(true)}
            >
              Add connector
            </Button>
          </>
        }
      />

      {/* Search bar */}
      <div style={{ maxWidth: 380 }}>
        <Input
          leftIcon="search"
          placeholder="Search connectors"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Connector list card */}
      <Card padding={0} style={{ overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{
          padding: '12px 18px',
          borderBottom: `1px solid ${T.n100}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="plug" size={14} color={T.n600} />
          <span style={{ fontFamily: T.fSans, fontWeight: 600, fontSize: 13, color: T.n900 }}>
            Connectors
          </span>
          <span style={{
            fontFamily: T.fSans, fontSize: 11, fontWeight: 600,
            background: T.n100, color: T.n600,
            padding: '1px 7px', borderRadius: 999,
          }}>
            {filtered.length}
          </span>
          <div style={{ flex: 1 }} />
          {connectorsQ.isFetching && (
            <span style={{ fontFamily: T.fSans, fontSize: 11, color: T.n400 }}>
              Refreshing…
            </span>
          )}
        </div>

        {/* States */}
        {isLoading && <EmptyState icon="loader" text="Loading connectors…" />}
        {isError && (
          <EmptyState icon="alert-circle" text="Failed to load connectors. Is the API running?" color={T.red500} />
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            icon="plug"
            text={search ? `No connectors matching "${search}"` : 'No connectors yet — add one to get started.'}
          />
        )}

        {/* Rows */}
        {!isLoading && !isError && filtered.map(c => (
          <ConnectorCard key={c.id} connector={c} />
        ))}
      </Card>

      {/* Add connector modal */}
      {showModal && <AddConnectorModal onClose={() => setModal(false)} />}
    </div>
  );
}

// ── Inline empty / loading state ───────────────────────────────────────
function EmptyState({ icon, text, color }) {
  return (
    <div style={{
      padding: '40px 24px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 10,
    }}>
      <Icon name={icon} size={24} color={color ?? T.n300} />
      <span style={{ fontFamily: T.fSans, fontSize: 13, color: T.n500, textAlign: 'center' }}>
        {text}
      </span>
    </div>
  );
}

Object.assign(window, { Sources });

export { Sources };
