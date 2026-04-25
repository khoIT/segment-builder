// Single source of truth for the live-API toggle. Reading
// `import.meta.env` is Vite-only; in unit tests just stub this module.
export function useApi() {
  return import.meta.env.VITE_USE_API === 'true';
}

// Token storage. Phase 07 stores in localStorage; production should
// move to HttpOnly cookies. Helper centralised so swap is one file.
const TOKEN_KEY = 'bedrock.jwt';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
