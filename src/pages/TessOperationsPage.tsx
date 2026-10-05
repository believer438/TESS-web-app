import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Bot, MapPinned, RefreshCw, ShieldCheck, Timer, UsersRound } from "lucide-react";
import { tessFetch, type TessMission, type TessReminder } from "@/lib/tess-client";

type Dashboard = {
  agents: Array<{ agent_id?: string; status?: string }>;
  system: { overall?: string };
  missions: { total_tracked?: number; active?: number; blocked?: number; timeout_risk?: number; missions?: Array<{ mission_id: string; status: string; title?: string }> };
  security: { critical?: number; suspicious?: number };
  alerts: Array<{ severity?: string; message?: string; source?: string }>;
};
type CitySnapshot = { city?: string; knowledge_mode?: string; node_count?: number; edge_count?: number };
type EcosystemCoverage = { verified_actor_count?: number; open_service_gap_count?: number; resolved_gap_count?: number; verified_capabilities?: string[]; gaps?: Array<{ gap_id: string; capability: string; territory?: string | null; priority?: string; status?: string }> };
type RegistryResource = { organization_id?: string; territory_id?: string; name: string; status?: string; metadata?: Record<string, unknown> };
function Metric({ label, value, icon: Icon, tone = "text-[var(--tess-ink)]" }: { label: string; value: string | number; icon: typeof Activity; tone?: string }) {
  return <article className="tess-hub-card rounded-2xl border p-4"><div className="flex items-center justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tess-mint)] ${tone}`}><Icon className="h-5 w-5" /></span><strong className={`text-2xl font-semibold ${tone}`}>{value}</strong></div><p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tess-muted)]">{label}</p></article>;
}

export default function TessOperationsPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [city, setCity] = useState<CitySnapshot | null>(null);
  const [missions, setMissions] = useState<TessMission[]>([]);
  const [reminders, setReminders] = useState<TessReminder[]>([]);
  const [coverage, setCoverage] = useState<EcosystemCoverage | null>(null);
  const [organizations, setOrganizations] = useState<RegistryResource[]>([]);
  const [territories, setTerritories] = useState<RegistryResource[]>([]);
  const [reviewEvidence, setReviewEvidence] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [patrolling, setPatrolling] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [nextDashboard, nextCity, nextMissions, nextReminders, nextCoverage, nextOrganizations, nextTerritories] = await Promise.all([
        tessFetch<Dashboard>("/monitoring/dashboard"), tessFetch<CitySnapshot>("/city/snapshot"),
        tessFetch<TessMission[]>("/missions"), tessFetch<TessReminder[]>("/reminders"), tessFetch<EcosystemCoverage>("/ecosystem/coverage"),
        tessFetch<RegistryResource[]>("/ecosystem/organizations"), tessFetch<RegistryResource[]>("/ecosystem/territories"),
      ]);
      setDashboard(nextDashboard); setCity(nextCity); setMissions(nextMissions); setReminders(nextReminders); setCoverage(nextCoverage); setOrganizations(nextOrganizations); setTerritories(nextTerritories); setUpdatedAt(new Date());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Les données TESS sont indisponibles."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const runPatrol = async () => {
    setPatrolling(true); setError("");
    try { await tessFetch("/monitoring/patrol", { method: "POST" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "La patrouille TESS a échoué."); }
    finally { setPatrolling(false); }
  };

  const reviewResource = async (kind: "organizations" | "territories", resource: RegistryResource) => {
    const id = resource.organization_id || resource.territory_id;
    if (!id) return;
    const evidence = reviewEvidence[id]?.trim();
    if (!evidence) { setError("Une preuve est obligatoire avant toute vérification."); return; }
    setReviewing(id); setError("");
    try {
      await tessFetch(`/ecosystem/${kind}/${encodeURIComponent(id)}/review`, {
        method: "POST", body: JSON.stringify({ status: "VERIFIED", evidence: { source: evidence } }),
      });
      setReviewEvidence((current) => ({ ...current, [id]: "" }));
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "La vérification a été refusée par le serveur."); }
    finally { setReviewing(null); }
  };

  const monitored = dashboard?.missions;
  const security = dashboard?.security;
  const monitoredMissions = monitored?.missions ?? missions;
  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · L’œil de la ville</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Centre des opérations</h1><p className="mt-2 max-w-2xl text-sm text-[var(--tess-muted)]">Surveille les agents, missions, alertes et la ville virtuelle depuis une vue vérifiable.</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)] disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser</button><button type="button" onClick={() => void runPatrol()} disabled={patrolling} className="inline-flex items-center gap-2 rounded-xl bg-[var(--tess-ink)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"><Activity className="h-4 w-4" />{patrolling ? "Patrouille…" : "Lancer une patrouille"}</button></div></header>
    {error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="État du système" value={dashboard?.system?.overall || (loading ? "…" : "—")} icon={Activity} tone={dashboard?.system?.overall === "OK" ? "text-emerald-600" : "text-amber-600"} /><Metric label="Agents enregistrés" value={dashboard?.agents?.length ?? (loading ? "…" : 0)} icon={Bot} /><Metric label="Missions actives" value={monitored?.active ?? (loading ? "…" : 0)} icon={Timer} tone="text-blue-600" /><Metric label="Acteurs vérifiés" value={coverage?.verified_actor_count ?? (loading ? "…" : 0)} icon={UsersRound} tone="text-violet-600" /><Metric label="Capacités manquantes" value={coverage?.open_service_gap_count ?? (loading ? "…" : 0)} icon={ShieldCheck} tone={coverage?.open_service_gap_count ? "text-rose-600" : "text-emerald-600"} /></div>
    <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]"><article className="tess-hub-card rounded-2xl border p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-[var(--tess-ink)]">Missions surveillées</h2><p className="mt-1 text-xs text-[var(--tess-muted)]">État maintenu par MissionMonitorAgent</p></div><span className="rounded-full bg-[var(--tess-mint)] px-3 py-1 text-xs font-semibold text-[var(--tess-ink)]">{monitored?.total_tracked ?? 0} suivies</span></div><div className="mt-4 space-y-2">{monitoredMissions.slice(0, 6).map((mission) => <div key={mission.mission_id} className="flex items-center justify-between rounded-xl border border-[var(--tess-line)] px-3 py-2.5"><span className="min-w-0 truncate text-sm font-medium text-[var(--tess-ink)]">{mission.title || mission.mission_id}</span><span className="ml-3 shrink-0 text-xs text-[var(--tess-muted)]">{mission.status || "—"}</span></div>)}{!loading && !monitoredMissions.length && <p className="rounded-xl border border-dashed border-[var(--tess-line)] px-4 py-8 text-center text-sm text-[var(--tess-muted)]">Aucune mission active.</p>}</div></article><article className="tess-hub-card rounded-2xl border p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><MapPinned className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-[var(--tess-ink)]">Ville virtuelle</h2><p className="text-xs text-[var(--tess-muted)]">Connaissance locale avec provenance</p></div></div><p className="mt-5 text-2xl font-semibold text-[var(--tess-ink)]">{city?.city || (loading ? "…" : "Indisponible")}</p><p className="mt-1 text-sm text-[var(--tess-muted)]">Mode : {city?.knowledge_mode || (loading ? "chargement" : "indisponible")}</p><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--tess-mint)] p-3"><p className="text-xl font-semibold text-[var(--tess-ink)]">{city ? city.node_count ?? 0 : "—"}</p><p className="text-xs text-[var(--tess-muted)]">Repères</p></div><div className="rounded-xl bg-[var(--tess-mint)] p-3"><p className="text-xl font-semibold text-[var(--tess-ink)]">{city ? city.edge_count ?? 0 : "—"}</p><p className="text-xs text-[var(--tess-muted)]">Relations</p></div></div></article></section>
    <section className="mt-4 grid gap-4 lg:grid-cols-2"><article className="tess-hub-card rounded-2xl border p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[var(--tess-ink)]">Alertes récentes</h2><AlertTriangle className="h-5 w-5 text-amber-600" /></div><div className="mt-3 space-y-2">{(dashboard?.alerts ?? []).slice(0, 4).map((alert, index) => <div key={`${alert.source}-${index}`} className="rounded-xl border border-[var(--tess-line)] px-3 py-2"><p className="text-sm text-[var(--tess-ink)]">{alert.message || "Alerte sans description"}</p><p className="mt-1 text-xs text-[var(--tess-muted)]">{alert.severity || "INFO"} · {alert.source || "TESS"}</p></div>)}{!dashboard?.alerts?.length && <p className="py-5 text-sm text-[var(--tess-muted)]">Aucune alerte récente.</p>}</div></article><article className="tess-hub-card rounded-2xl border p-5"><h2 className="text-lg font-semibold text-[var(--tess-ink)]">Rappels et suivi</h2><div className="mt-3 space-y-2">{reminders.slice(0, 4).map((reminder) => <div key={reminder.reminder_id} className="flex items-center justify-between rounded-xl border border-[var(--tess-line)] px-3 py-2"><span className="truncate text-sm text-[var(--tess-ink)]">{reminder.message}</span><span className="ml-3 shrink-0 text-xs text-[var(--tess-muted)]">{new Date(reminder.due_at).toLocaleDateString("fr-FR")}</span></div>)}{!reminders.length && <p className="py-5 text-sm text-[var(--tess-muted)]">Aucun rappel en attente.</p>}</div></article></section>
    <section className="mt-4 tess-hub-card rounded-2xl border p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-[var(--tess-ink)]">Couverture de l’écosystème</h2><p className="mt-1 text-xs text-[var(--tess-muted)]">Acteurs et capacités issus du registre vérifié — aucun acteur absent n’est inventé.</p></div><span className="rounded-full bg-[var(--tess-mint)] px-3 py-1 text-xs font-semibold text-[var(--tess-ink)]">{coverage?.resolved_gap_count ?? 0} manques résolus</span></div><div className="mt-4 grid gap-2 md:grid-cols-2">{(coverage?.gaps ?? []).slice(0, 8).map((gap) => <div key={gap.gap_id} className="rounded-xl border border-rose-200 bg-rose-50/40 px-3 py-2"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-[var(--tess-ink)]">{gap.capability}</p><span className="text-xs text-rose-700">{gap.priority || "P2"}</span></div><p className="mt-1 text-xs text-[var(--tess-muted)]">Territoire : {gap.territory || "non précisé"} · {gap.status || "OPEN"}</p></div>)}{!loading && !coverage?.gaps?.length && <p className="py-5 text-sm text-[var(--tess-muted)]">Aucun manque de capacité enregistré.</p>}</div></section>
    <section className="mt-4 tess-hub-card rounded-2xl border p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-[var(--tess-ink)]">Revue des ressources déclarées</h2><p className="mt-1 text-xs text-[var(--tess-muted)]">Une ressource reste CLAIMED tant qu’un opérateur autorisé n’a pas fourni une preuve.</p></div><ShieldCheck className="h-5 w-5 text-violet-600" /></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{[...organizations.map((item) => ({ ...item, kind: "organizations" as const, id: item.organization_id })), ...territories.map((item) => ({ ...item, kind: "territories" as const, id: item.territory_id }))].slice(0, 12).map((resource) => <div key={`${resource.kind}-${resource.id}`} className="rounded-xl border border-[var(--tess-line)] p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--tess-ink)]">{resource.name}</p><p className="mt-1 text-xs text-[var(--tess-muted)]">{resource.kind === "organizations" ? "Organisation" : "Territoire"} · {resource.status || "CLAIMED"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${resource.status === "VERIFIED" || resource.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{resource.status || "CLAIMED"}</span></div>{resource.status !== "VERIFIED" && resource.status !== "ACTIVE" && resource.id && <div className="mt-3 flex gap-2"><input value={reviewEvidence[resource.id] || ""} onChange={(event) => setReviewEvidence((current) => ({ ...current, [resource.id as string]: event.target.value }))} placeholder="Référence de preuve" className="min-w-0 flex-1 rounded-lg border border-[var(--tess-line)] bg-transparent px-2.5 py-2 text-xs text-[var(--tess-ink)]" /><button type="button" disabled={reviewing === resource.id} onClick={() => void reviewResource(resource.kind, resource)} className="rounded-lg bg-[var(--tess-ink)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{reviewing === resource.id ? "…" : "Vérifier"}</button></div>}</div>)}{!loading && !organizations.length && !territories.length && <p className="py-5 text-sm text-[var(--tess-muted)]">Aucune ressource déclarée.</p>}</div></section>
    {updatedAt && <p className="mt-4 text-right text-xs text-[var(--tess-muted)]">Dernière vérification : {updatedAt.toLocaleTimeString("fr-FR")}</p>}
  </div></main>;
}
