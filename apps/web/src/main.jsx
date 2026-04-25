import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { ensureDevToken } from './api/auth.js';
import { useApi } from './api/flag.js';

// One QueryClient for the whole app. Defaults: stale-while-revalidate
// 30s, retry once. Phase 07 prototype keeps it simple.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// Block initial render until we either have a token (live mode) or
// confirm we're in fallback mode. Prevents 401 storms on first paint.
function AuthBootstrapper({ children }) {
  const live = useApi();
  const [ready, setReady] = useState(!live);
  useEffect(() => {
    if (!live) return;
    ensureDevToken().finally(() => setReady(true));
  }, [live]);
  if (!ready) {
    return (
      <div style={{ padding: 32, fontFamily: 'Inter, sans-serif', color: '#737373' }}>
        Authenticating…
      </div>
    );
  }
  return children;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrapper>
        <App />
      </AuthBootstrapper>
    </QueryClientProvider>
  </React.StrictMode>,
);
