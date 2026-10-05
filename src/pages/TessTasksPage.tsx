import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Clock3, ListTodo, RefreshCw, Trash2 } from "lucide-react";
import { tessFetch, tessSubscribeToEvents, type TessMission } from "@/lib/tess-client";

export default function TessTasksPage() {
  const [missions, setMissions] = useState<TessMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (silent = false) => { if (!silent) setLoading(true); setError(""); try { setMissions(await tessFetch<TessMission[]>("/missions")); } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de charger les tâches."); } finally { if (!silent) setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    return tessSubscribeToEvents(event => {
      const type = event.event?.event_type;
      if (type && ["MISSION_CREATED", "MISSION_UPDATED", "MISSION_COMPLETED", "MISSION_FAILED", "MISSION_DELETED", "TASK_CREATED", "TASK_ASSIGNED", "TASK_COMPLETED", "TASK_FAILED"].includes(type)) {
        void load(true);
      }
    });
  }, [load]);
  useEffect(() => {
    const active = missions.some(mission => !["COMPLETED", "FAILED", "CANCELLED"].includes(mission.status || ""));
    if (!active) return;
    const timer = window.setInterval(() => { void load(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [load, missions]);
  const remove = async (missionId: string) => { setError(""); try { await tessFetch(`/missions/${missionId}`, { method: "DELETE" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "La suppression de la tâche a échoué."); } };
  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · Exécution</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Tâches et missions</h1><p className="mt-2 text-sm text-[var(--tess-muted)]">Suivi des missions créées par l’orchestrateur et de leur état réel.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)] disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser</button></header>{error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}<section className="mt-6 space-y-3">{missions.map(mission => <article key={mission.mission_id} className="tess-hub-card rounded-2xl border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><ListTodo className="h-5 w-5" /></span><div className="min-w-0"><h2 className="font-semibold text-[var(--tess-ink)]">{mission.title || mission.mission_id}</h2><p className="mt-1 text-xs text-[var(--tess-muted)]">{mission.mission_id} · priorité {mission.priority || "—"}</p><p className="mt-3 text-sm leading-6 text-[var(--tess-muted)]">{mission.description || "Aucune description fournie."}</p></div></div><span className="rounded-full bg-[var(--tess-mint)] px-3 py-1 text-xs font-semibold text-[var(--tess-ink)]">{mission.status || "UNKNOWN"}</span></div>{Boolean(mission.tasks?.length) && <div className="mt-4 space-y-2 rounded-xl border border-[var(--tess-line)] p-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tess-muted)]">Étapes exécutées</p>{mission.tasks?.map(task => <div key={task.task_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--tess-mint)] px-3 py-2.5"><span className="min-w-0 truncate text-xs text-[var(--tess-ink)]"><span className="font-semibold">{task.agent_id}</span>{task.tool_id ? ` · ${task.tool_id}` : ""}</span><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--tess-muted)]">{["FAILED", "CANCELLED"].includes(task.status) ? <CircleAlert className="h-3 w-3 text-rose-600" /> : task.status === "COMPLETED" || task.status === "SUCCESS" ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Clock3 className="h-3 w-3 text-amber-600" />}{task.status}</span></div>)}</div>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void remove(mission.mission_id)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Supprimer</button></div></article>)}{!loading && !missions.length && <p className="rounded-2xl border border-dashed border-[var(--tess-line)] px-4 py-10 text-center text-sm text-[var(--tess-muted)]">Aucune mission pour cet utilisateur.</p>}</section></div></main>;
}
