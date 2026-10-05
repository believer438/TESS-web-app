import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, RefreshCw, ShieldCheck } from "lucide-react";
import { tessFetch, type TessAgent, type TessAgentHealth } from "@/lib/tess-client";

type HealthResponse = { agents?: TessAgentHealth[]; checked_at?: string };

export default function TessAgentsPage() {
  const [agents, setAgents] = useState<TessAgent[]>([]);
  const [health, setHealth] = useState<TessAgentHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [definitions, summary] = await Promise.all([
        tessFetch<TessAgent[]>("/agents"),
        tessFetch<HealthResponse>("/monitoring/agents"),
      ]);
      setAgents(definitions); setHealth(summary.agents ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les agents TESS.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const healthById = useMemo(() => new Map(health.map(item => [item.agent_id, item])), [health]);
  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · Runtime</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Agents</h1><p className="mt-2 max-w-2xl text-sm text-[var(--tess-muted)]">Catalogue et santé des agents réellement enregistrés dans le runtime.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)] disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser</button></header>
    {error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="tess-hub-card rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.14em] text-[var(--tess-muted)]">Agents enregistrés</p><strong className="mt-2 block text-3xl text-[var(--tess-ink)]">{loading ? "…" : agents.length}</strong></div><div className="tess-hub-card rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.14em] text-[var(--tess-muted)]">Santés observées</p><strong className="mt-2 block text-3xl text-emerald-600">{loading ? "…" : health.length}</strong></div><div className="tess-hub-card rounded-2xl border p-4"><p className="text-xs uppercase tracking-[0.14em] text-[var(--tess-muted)]">Dégradés / hors ligne</p><strong className="mt-2 block text-3xl text-amber-600">{health.filter(item => !["healthy", "ONLINE"].includes(item.status)).length}</strong></div></div>
    <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{agents.map(agent => { const item = healthById.get(agent.id); const online = item ? ["healthy", "ONLINE"].includes(item.status) : false; return <article key={agent.id} className="tess-hub-card rounded-2xl border p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><Bot className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate font-semibold text-[var(--tess-ink)]">{agent.name}</h2><p className="truncate text-xs text-[var(--tess-muted)]">{agent.id} · {agent.domain}</p></div></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><ShieldCheck className="h-3 w-3" />{item?.status ?? agent.status ?? "UNKNOWN"}</span></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--tess-muted)]">{agent.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{(agent.tools ?? []).slice(0, 5).map(tool => <span key={tool} className="rounded-md bg-[var(--tess-mint)] px-2 py-1 text-[10px] text-[var(--tess-ink)]">{tool}</span>)}</div></article>; })}</section>
    {!loading && !agents.length && <p className="mt-6 rounded-2xl border border-dashed border-[var(--tess-line)] px-4 py-10 text-center text-sm text-[var(--tess-muted)]">Aucun agent n’est exposé par le registre.</p>}
  </div></main>;
}
