import { useCallback, useEffect, useState } from "react";
import { GitBranch, RefreshCw, X } from "lucide-react";
import { tessFetch, type TessFollowUp } from "@/lib/tess-client";

export default function TessFollowUpsPage() {
  const [items, setItems] = useState<TessFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await tessFetch<TessFollowUp[]>("/follow-ups")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de charger les suivis."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const cancel = async (id: string) => {
    setError("");
    try { await tessFetch(`/follow-ups/${id}/cancel`, { method: "POST" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Le suivi n’a pas pu être annulé."); }
  };
  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · Événements</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Suivis</h1><p className="mt-2 text-sm text-[var(--tess-muted)]">Les suivis restent en attente jusqu’à la réception d’un événement réel de mission ou de tâche.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)] disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser</button></header>{error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}<section className="mt-6 space-y-3">{items.map(item => <article key={item.follow_up_id} className="tess-hub-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><GitBranch className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--tess-ink)]">{item.description}</p><p className="mt-1 text-xs text-[var(--tess-muted)]">{item.task_id || item.mission_id || "Cible non indiquée"} · {item.status}{item.last_event_type ? ` · ${item.last_event_type}` : ""}</p></div></div>{item.status === "WAITING" && <button type="button" onClick={() => void cancel(item.follow_up_id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" /> Annuler</button>}</article>)}{!loading && !items.length && <p className="rounded-2xl border border-dashed border-[var(--tess-line)] px-4 py-10 text-center text-sm text-[var(--tess-muted)]">Aucun suivi enregistré.</p>}</section></div></main>;
}
