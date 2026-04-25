import { z } from 'zod';

// Supported connector types — the 4 production-likely set (YAGNI: no CSV upload in backend).
export const ConnectorType = z.enum(['postgres', 'bigquery', 's3', 'kafka']);
export type ConnectorType = z.infer<typeof ConnectorType>;

// Status after test-connection round-trip
export const ConnectorStatus = z.enum(['ok', 'fail', 'unknown']);
export type ConnectorStatus = z.infer<typeof ConnectorStatus>;

// Full connector row (GET response shape)
export const Connector = z.object({
  id: z.string(),
  type: ConnectorType,
  name: z.string().min(1),
  env: z.string().default('production'),          // env label ('production'|'staging'|'dev')
  host: z.string().optional(),
  port: z.number().int().optional(),
  db: z.string().optional(),
  user: z.string().optional(),
  // pass_encrypted is NEVER returned by the API (omitted in service layer)
  status: ConnectorStatus,
  lastSyncAt: z.string().nullable(),              // ISO 8601 or null
  datasetCount: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Connector = z.infer<typeof Connector>;

// POST /connectors body
export const CreateConnectorRequest = z.object({
  type: ConnectorType,
  name: z.string().min(1).max(128),
  env: z.string().max(64).default('production'),
  host: z.string().max(256).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  db: z.string().max(128).optional(),
  user: z.string().max(128).optional(),
  pass: z.string().max(512).optional(),           // plaintext from form; backend base64-encodes (MOCK ONLY)
});
export type CreateConnectorRequest = z.infer<typeof CreateConnectorRequest>;

// POST /connectors/:id/test response
export const TestConnectionResult = z.object({
  ok: z.boolean(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});
export type TestConnectionResult = z.infer<typeof TestConnectionResult>;
