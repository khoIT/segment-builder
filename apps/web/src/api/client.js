import { getToken } from './flag.js';

// Tiny fetch wrapper. Validates response status, throws a structured
// error on non-2xx. Both backends share the same ApiError envelope so
// we surface code/message uniformly.
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static async from(res) {
    let body;
    try { body = await res.json(); } catch { body = {}; }
    return new ApiError({
      status: res.status,
      code: body.code ?? `HTTP_${res.status}`,
      message: body.message ?? res.statusText,
      details: body.details,
    });
  }
}

const CATALOG = import.meta.env.VITE_API_BASE   ?? 'http://localhost:3001/api/v1';
const QUERY   = import.meta.env.VITE_QUERY_BASE ?? 'http://localhost:3002/api/v1';

async function call(base, path, opts = {}) {
  const token = getToken();
  const res = await fetch(base + path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) throw await ApiError.from(res);
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// `api(path, opts)` hits catalog-api; `q(path, opts)` hits query-svc.
export const api = (path, opts) => call(CATALOG, path, opts);
export const q   = (path, opts) => call(QUERY,   path, opts);

// Convert `{a:1,b:2}` → `?a=1&b=2`, dropping null/undefined keys.
export function qs(params = {}) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}
