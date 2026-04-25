import React from 'react';
import { T, Icon, Button, Input, Select, Badge } from '../theme.jsx';
import { useCreateConnector } from '../api/hooks.js';
import {
  TYPE_FIELDS, TYPE_OPTIONS, ENV_OPTIONS,
  ModalOverlay, FieldLabel, FieldError, MockBanner,
} from './connector-modal-helpers.jsx';

// AddConnectorModal — props: onClose() called on cancel or successful save.
// Mock-only: form captures real DB-connection shape, but `Test connection`
// runs client-side and `Save` persists to the dev DB only. Real driver swap
// is Q5 hardening.
export function AddConnectorModal({ onClose }) {
  const [type, setType]     = React.useState('postgres');
  const [name, setName]     = React.useState('');
  const [env, setEnv]       = React.useState('production');
  const [fields, setFields] = React.useState({});
  const [testStatus, setTestStatus] = React.useState(null); // null | {ok, error, latencyMs}
  const [errors, setErrors] = React.useState({});

  const createMutation = useCreateConnector();

  // Reset field values when type changes — different types have different schemas
  React.useEffect(() => {
    setFields({});
    setTestStatus(null);
    setErrors({});
  }, [type]);

  function setField(key, val) {
    setFields(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    for (const f of TYPE_FIELDS[type] ?? []) {
      if (f.required && !fields[f.key]?.toString().trim()) errs[f.key] = `${f.label} is required`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Mock test: same logic as backend (host substring check).
  function handleTest() {
    const host = fields.host ?? '';
    if (host.toLowerCase().includes('fail')) {
      setTestStatus({ ok: false, error: 'Mock failure (host contains "fail")' });
    } else {
      setTestStatus({ ok: true, latencyMs: 42 });
    }
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = {
      type, name: name.trim(), env,
      ...Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, k === 'port' ? Number(v) || undefined : v || undefined])
      ),
    };
    try { await createMutation.mutateAsync(payload); onClose(); } catch { /* shown via mutation.isError */ }
  }

  const currentFields = TYPE_FIELDS[type] ?? [];

  return (
    <ModalOverlay onClose={onClose}>
      <MockBanner />

      <div style={{
        padding: '18px 20px 14px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.n100}`,
      }}>
        <div>
          <div style={{ fontFamily: T.fSans, fontWeight: 700, fontSize: 16, color: T.n900 }}>Add connector</div>
          <div style={{ fontFamily: T.fSans, fontSize: 12, color: T.n500, marginTop: 2 }}>
            Configure a new data source connection
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 4, color: T.n500, display: 'flex',
        }}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel>Type</FieldLabel>
            <Select value={type} onChange={e => setType(e.target.value)} options={TYPE_OPTIONS} style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>Environment</FieldLabel>
            <Select value={env} onChange={e => setEnv(e.target.value)} options={ENV_OPTIONS} style={{ width: '100%' }} />
          </div>
        </div>

        <div>
          <FieldLabel required>Connector name</FieldLabel>
          <Input
            value={name}
            onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => { const n = { ...p }; delete n.name; return n; }); }}
            placeholder="e.g. BigQuery · Analytics DW"
            error={!!errors.name}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </div>

        {currentFields.map(f => (
          <div key={f.key}>
            <FieldLabel required={f.required}>{f.label}</FieldLabel>
            <Input
              type={f.type} value={fields[f.key] ?? ''}
              onChange={e => setField(f.key, e.target.value)}
              placeholder={f.placeholder} error={!!errors[f.key]}
            />
            {errors[f.key] && <FieldError>{errors[f.key]}</FieldError>}
          </div>
        ))}

        {testStatus && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: testStatus.ok ? T.greenSoft : T.redSoft,
            border: `1px solid ${testStatus.ok ? '#6ee7b7' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name={testStatus.ok ? 'check-circle' : 'x-circle'} size={14} color={testStatus.ok ? T.green600 : T.red600} />
            <span style={{ fontFamily: T.fSans, fontSize: 12, color: testStatus.ok ? T.green600 : T.red600 }}>
              {testStatus.ok ? `Connection OK · ${testStatus.latencyMs}ms` : testStatus.error ?? 'Connection failed'}
            </span>
            {testStatus.ok && <Badge variant="secondary" style={{ marginLeft: 'auto' }}>Mock</Badge>}
          </div>
        )}

        {createMutation.isError && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: T.redSoft, border: `1px solid #fca5a5` }}>
            <span style={{ fontFamily: T.fSans, fontSize: 12, color: T.red600 }}>
              Save failed — {createMutation.error?.message ?? 'unknown error'}
            </span>
          </div>
        )}
      </div>

      <div style={{
        padding: '14px 20px', borderTop: `1px solid ${T.n100}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
      }}>
        <Button variant="outline" onClick={handleTest} leftIcon="wifi">Test connection</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="neutral" onClick={handleSave}
            disabled={createMutation.isPending}
            leftIcon={createMutation.isPending ? 'loader' : 'plus'}
          >
            {createMutation.isPending ? 'Saving…' : 'Save connector'}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
