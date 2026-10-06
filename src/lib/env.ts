// TESS runtime environment.
export const env = {
  // Keep browser requests first-party in production. Vercel proxies /api/* to
  // FastAPI, so auth cookies are set and sent on the TESS origin.
  // During development, Vite proxies API routes directly to localhost:8000.
  apiBaseUrl: import.meta.env.DEV ? "" : "/api",
};

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return env.apiBaseUrl ? `${env.apiBaseUrl}${normalizedPath}` : normalizedPath;
}

/** URL du Gateway T.E.S.S., sans double préfixe /api en production. */
export function buildTessApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const routePath = normalizedPath.replace(/^\/api\/v1(?=\/|$)/i, "") || "/";
  const base = (
    import.meta.env.VITE_TESS_API_URL?.trim()
    || import.meta.env.VITE_TESS_API_BASE_URL?.trim()
  );
  if (base) {
    const normalizedBase = base.replace(/\/+$/, "");
    const apiBase = /\/api\/v1$/i.test(normalizedBase)
      ? normalizedBase
      : /\/api$/i.test(normalizedBase)
        ? `${normalizedBase}/v1`
        : `${normalizedBase}/api/v1`;
    return `${apiBase}${routePath}`;
  }
  return `/api/v1${routePath}`;
}

/** WebSocket TESS configuré par l'environnement de déploiement. */
export function buildTessWsUrl() {
  return import.meta.env.VITE_TESS_WS_URL?.trim() || "";
}
