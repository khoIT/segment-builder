import { api } from './client.js';
import { setToken, getToken, clearToken, useApi } from './flag.js';

// Mock SSO bootstrap. On first load (no token in localStorage) we hit
// /auth/dev-login to grab one. Real SSO swaps the impl here.
export async function ensureDevToken() {
  if (!useApi()) return null;
  if (getToken()) return getToken();
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
