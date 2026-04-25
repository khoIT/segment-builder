import { api } from './client.js';
import { setToken, getToken, clearToken, useApi } from './flag.js';

// Decode JWT payload without verifying the signature (server still
// verifies). 30s safety margin so we don't ship a request right as the
// token is about to flip expired in flight.
function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

// Mock SSO bootstrap. Re-authenticates if the cached token is missing,
// expired, or malformed — otherwise stale localStorage tokens cause
// silent 401s that surface as "Catalog is empty" everywhere.
export async function ensureDevToken() {
  if (!useApi()) return null;
  const existing = getToken();
  if (isTokenValid(existing)) return existing;
  if (existing) clearToken();
  const res = await api('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  setToken(res.token);
  return res.token;
}

export async function logout() {
  clearToken();
}
