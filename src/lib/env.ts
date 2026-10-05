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
  const base = import.meta.env.VITE_TESS_API_BASE_URL?.trim();
  if (base) return `${base.replace(/\/$/, "")}${normalizedPath}`;
  return `/api/v1${normalizedPath}`;
}
