import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, Link2, PlugZap, RefreshCw, Shield, Unplug } from "lucide-react";
import { tessFetch } from "@/lib/tess-client";

type AvailableService = { service_id: string; label: string; connector_id: string; auth: string };
type ConnectedService = { account_id: string; provider: string; label: string; scopes: string[]; connected_at: string | null; status: string };

export default function TessConnectionsPage() {
  const [available, setAvailable] = useState<AvailableService[]>([]);
  const [connected, setConnected] = useState<ConnectedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [catalog, accounts] = await Promise.all([tessFetch<AvailableService[]>("/connect/available"), tessFetch<ConnectedService[]>("/connect")]); setAvailable(catalog); setConnected(accounts); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de charger les connexions."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const accountByService = useMemo(() => new Map(connected.map(account => [account.provider, account])), [connected]);
  const mutate = async (service: AvailableService, action: "connect" | "disconnect") => {
    setBusy(service.service_id); setError("");
    try {
      if (action === "connect") await tessFetch(`/connect/${encodeURIComponent(service.service_id)}`, { method: "POST", body: JSON.stringify({ scopes: [] }) });
      else await tessFetch(`/connect/${encodeURIComponent(service.service_id)}`, { method: "DELETE" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "La connexion n’a pas pu être mise à jour."); }
    finally { setBusy(null); }
  };

  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · Intégrations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Connexions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tess-muted)]">Consulte et gère les services associés à ton compte. Les connecteurs disponibles en Phase 0 fonctionnent en mode simulé, pas avec des fournisseurs réels.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] transition hover:bg-[var(--tess-mint)] disabled:opacity-50 dark:bg-white/[0.04]"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Actualiser</button></header>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/[0.08] dark:text-amber-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Environnement de test.</strong> Une connexion affichée comme active ne garantit pas l’accès à un service externe réel. Ne saisis aucun mot de passe ni jeton secret ici.</p></div>
    {error && <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}
    <section aria-label="Services disponibles" className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-[var(--tess-ink)]">Services disponibles</h2><span className="text-xs text-[var(--tess-muted)]">{available.length} service{available.length === 1 ? "" : "s"}</span></div>{loading && !available.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="tess-hub-card h-36 animate-pulse rounded-2xl border" />)}</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{available.map(service => { const account = accountByService.get(service.service_id); const active = Boolean(account); return <article key={service.service_id} className="tess-hub-card rounded-2xl border p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><PlugZap className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold text-[var(--tess-ink)]">{service.label}</h3><p className="mt-1 truncate font-mono text-[10px] text-[var(--tess-muted)]">{service.service_id}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${active ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-white/[0.07] dark:text-slate-300"}`}>{active ? account.status : "Déconnecté"}</span></div><div className="mt-4 space-y-2 text-xs text-[var(--tess-muted)]"><p className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" />Authentification : {service.auth || "non précisée"}</p><p className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5" />Connecteur : {service.connector_id} · MOCK</p>{account?.scopes?.length ? <p>Autorisations : {account.scopes.join(", ")}</p> : null}</div><button type="button" onClick={() => void mutate(service, active ? "disconnect" : "connect")} disabled={busy === service.service_id || loading} className={`mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition disabled:opacity-50 ${active ? "border-[var(--tess-line)] text-[var(--tess-ink)] hover:bg-slate-100 dark:hover:bg-white/10" : "border-slate-900 bg-slate-900 text-white hover:bg-slate-700 dark:border-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"}`}>{busy === service.service_id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : active ? <Unplug className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{active ? "Déconnecter" : "Simuler la connexion"}</button></article>; })}</div>}</section>
  </div></main>;
}
