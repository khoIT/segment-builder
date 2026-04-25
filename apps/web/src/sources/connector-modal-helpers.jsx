import React from 'react';
import { T, Icon } from '../theme.jsx';

// ── Field schema per connector type ──────────────────────────────────
// Each entry: { label, key, type, required, placeholder }
export const TYPE_FIELDS = {
  postgres: [
    { label: 'Host', key: 'host', type: 'text', required: true,  placeholder: 'db.example.com' },
    { label: 'Port', key: 'port', type: 'number', required: false, placeholder: '5432' },
    { label: 'Database', key: 'db', type: 'text', required: true,  placeholder: 'analytics' },
    { label: 'User', key: 'user', type: 'text', required: true,  placeholder: 'readonly_user' },
    { label: 'Password', key: 'pass', type: 'password', required: false, placeholder: '••••••••' },
  ],
  bigquery: [
    { label: 'Project ID', key: 'db',   type: 'text', required: true,  placeholder: 'my-gcp-project' },
    { label: 'Service account email', key: 'user', type: 'text', required: true,  placeholder: 'sa@project.iam.gserviceaccount.com' },
    { label: 'Service account key (JSON)', key: 'pass', type: 'password', required: false, placeholder: '{ "type": "service_account", … }' },
  ],
  s3: [
    { label: 'Bucket / endpoint', key: 'host', type: 'text', required: true,  placeholder: 'my-bucket.s3.amazonaws.com' },
    { label: 'Bucket name', key: 'db',  type: 'text', required: true,  placeholder: 'my-data-bucket' },
    { label: 'Access key ID', key: 'user', type: 'text', required: true,  placeholder: 'AKIAIOSFODNN7EXAMPLE' },
    { label: 'Secret access key', key: 'pass', type: 'password', required: false, placeholder: '••••••••' },
  ],
  kafka: [
    { label: 'Bootstrap servers', key: 'host', type: 'text', required: true,  placeholder: 'broker1:9092,broker2:9092' },
    { label: 'Port', key: 'port', type: 'number', required: false, placeholder: '9092' },
    { label: 'Consumer group', key: 'db',  type: 'text', required: false, placeholder: 'bedrock-consumer' },
    { label: 'SASL username', key: 'user', type: 'text', required: false, placeholder: 'bedrock-user' },
    { label: 'SASL password', key: 'pass', type: 'password', required: false, placeholder: '••••••••' },
  ],
};

export const TYPE_OPTIONS = [
  { value: 'postgres',  label: 'PostgreSQL' },
  { value: 'bigquery',  label: 'BigQuery' },
  { value: 's3',        label: 'S3 / Object Storage' },
  { value: 'kafka',     label: 'Kafka' },
];

export const ENV_OPTIONS = [
  { value: 'production', label: 'Production' },
  { value: 'staging',    label: 'Staging' },
  { value: 'dev',        label: 'Development' },
];

// ── Minimal overlay modal (no external lib) ──────────────────────────
// Closes when the user clicks the dimmed backdrop (not the white panel).
export function ModalOverlay({ onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Tiny form helpers ────────────────────────────────────────────────
export function FieldLabel({ children, required }) {
  return (
    <div style={{ fontFamily: T.fSans, fontSize: 12, fontWeight: 600, color: T.n700, marginBottom: 6 }}>
      {children}
      {required && <span style={{ color: T.red500, marginLeft: 2 }}>*</span>}
    </div>
  );
}

export function FieldError({ children }) {
  return (
    <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.red600, marginTop: 4 }}>
      {children}
    </div>
  );
}

// ── Mock-banner component (declarative; reused by modal header) ─────
export function MockBanner() {
  return (
    <div style={{
      background: T.amberSoft, borderBottom: `1px solid ${T.amber500}22`,
      padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Icon name="alert-triangle" size={14} color={T.amber500} />
      <span style={{ fontFamily: T.fSans, fontSize: 12, color: '#78350f' }}>
        Mock connection — real drivers planned for Q5. Test ping always succeeds
        unless host contains "fail".
      </span>
    </div>
  );
}
