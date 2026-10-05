import { useCallback, useEffect, useState } from "react";
import { Check, Inbox, RefreshCw, Trash2 } from "lucide-react";
import { tessFetch, tessSubscribeToEvents, type TessNotification } from "@/lib/tess-client";

export default function TessNotificationsPage() {
  const [items, setItems] = useState<TessNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); setError("");
    try { setItems(await tessFetch<TessNotification[]>("/notifications")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de charger les notifications."); }
    finally { if (!silent) setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => tessSubscribeToEvents(event => {
    if (event.type === "event" && event.event?.event_type === "NOTIFICATION_CREATED") void load(true);
  }), [load]);
  const read = async (id: string) => { try { await tessFetch(`/notifications/${id}/read`, { method: "POST" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "La notification n’a pas pu être lue."); } };
  const readAll = async () => { try { await tessFetch("/notifications/read-all", { method: "POST" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Les notifications n’ont pas pu être mises à jour."); } };
  const archive = async (id: string) => { try { await tessFetch(`/notifications/${id}`, { method: "DELETE" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "La notification n’a pas pu être archivée."); } };
  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · Événements</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Notifications</h1><p className="mt-2 text-sm text-[var(--tess-muted)]">Événements produits par les tâches, rappels et suivis réels de TESS.</p></div><div className="flex gap-2"><button type="button" onClick={() => void readAll()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)]"><Check className="h-4 w-4" /> Tout lire</button><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)] disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser</button></div></header>{error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}<section className="mt-6 space-y-3">{items.map(item => <article key={item.notification_id} className={`tess-hub-card flex items-start justify-between gap-3 rounded-2xl border p-4 ${item.status === "UNREAD" ? "border-blue-200 bg-blue-50/50" : ""}`}><div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><Inbox className="h-5 w-5" /></span><div className="min-w-0"><p className="text-sm font-semibold text-[var(--tess-ink)]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[var(--tess-muted)]">{item.body}</p><p className="mt-1 text-xs text-[var(--tess-muted)]">{new Date(item.created_at).toLocaleString("fr-FR")} · {item.kind} · {item.status}</p></div></div><div className="flex shrink-0 gap-2">{item.status === "UNREAD" && <button type="button" onClick={() => void read(item.notification_id)} className="rounded-lg border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50" aria-label="Marquer comme lue"><Check className="h-4 w-4" /></button>}<button type="button" onClick={() => void archive(item.notification_id)} className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50" aria-label="Archiver"><Trash2 className="h-4 w-4" /></button></div></article>)}{!loading && !items.length && <p className="rounded-2xl border border-dashed border-[var(--tess-line)] px-4 py-10 text-center text-sm text-[var(--tess-muted)]">Aucune notification.</p>}</section></div></main>;
}
