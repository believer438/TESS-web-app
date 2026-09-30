// Copie Zentrix Academy : src/lib/env.ts
export const env = {
  // Keep browser requests first-party in production. Vercel proxies /api/* to
  // FastAPI, so auth cookies are set and sent on the Zentrix origin.
  // During development, Vite proxies API routes directly to localhost:8000.
  apiBaseUrl: import.meta.env.DEV ? "" : "/api",
};

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return env.apiBaseUrl ? `${env.apiBaseUrl}${normalizedPath}` : normalizedPath;
}
