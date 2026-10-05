import { useCallback, useEffect, useMemo, useState } from "react";
import { Blocks, Box, PlugZap, RefreshCw, Search, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { tessFetch } from "@/lib/tess-client";

type CatalogKind = "tool" | "skill" | "connector";
type CatalogItem = { id: string; type: CatalogKind; name: string; description: string; status: string; domain: string | null };
const kindInfo: Record<CatalogKind, { label: string; icon: typeof Wrench }> = {
  tool: { label: "Outils", icon: Wrench }, skill: { label: "Compétences", icon: Sparkles }, connector: { label: "Connecteurs", icon: PlugZap },
};

export default function TessMarketplacePage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [kind, setKind] = useState<"all" | CatalogKind>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await tessFetch<CatalogItem[]>(`/marketplace${kind === "all" ? "" : `?type=${kind}`}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Le catalogue est indisponible."); }
    finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => items.filter(item => `${item.name} ${item.description} ${item.domain ?? ""} ${item.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [items, query]);
  const counts = useMemo(() => ({ tool: items.filter(item => item.type === "tool").length, skill: items.filter(item => item.type === "skill").length, connector: items.filter(item => item.type === "connector").length }), [items]);

  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · Catalogue</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Marketplace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tess-muted)]">Explore les capacités déclarées par le runtime. Les connecteurs de Phase 0 restent en mode mock ; rien n’est installé depuis cet écran.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] transition hover:bg-[var(--tess-mint)] disabled:opacity-50 dark:bg-white/[0.04]"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Actualiser</button></header>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{(["tool", "skill", "connector"] as const).map(key => { const Icon = kindInfo[key].icon; return <article key={key} className="tess-hub-card flex items-center gap-3 rounded-2xl border p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><Icon className="h-5 w-5" /></span><div><p className="text-xs text-[var(--tess-muted)]">{kindInfo[key].label}</p><strong className="text-xl text-[var(--tess-ink)]">{counts[key]}</strong></div></article>; })}</div>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--tess-line)] bg-white px-3 py-2.5 dark:bg-white/[0.04]"><Search className="h-4 w-4 shrink-0 text-[var(--tess-muted)]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une capacité…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--tess-ink)] outline-none placeholder:text-[var(--tess-muted)]" /></label><div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--tess-line)] bg-white p-1 dark:bg-white/[0.04]">{(["all", "tool", "skill", "connector"] as const).map(value => <button key={value} type="button" onClick={() => setKind(value)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${kind === value ? "bg-[var(--tess-mint)] text-[var(--tess-ink)]" : "text-[var(--tess-muted)] hover:bg-slate-50 dark:hover:bg-white/10"}`}>{value === "all" ? "Tout" : kindInfo[value].label}</button>)}</div></div>
    {error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">{error}<button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">Réessayer</button></div>}
    {loading && !items.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="tess-hub-card h-36 animate-pulse rounded-2xl border" />)}</div> : visible.length ? <section aria-label="Capacités disponibles" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map(item => { const Icon = kindInfo[item.type].icon; const mock = item.status.toUpperCase() === "MOCK"; return <article key={`${item.type}-${item.id}`} className="tess-hub-card rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[var(--tess-ink)]">{item.name}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${mock ? "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200"}`}>{item.status}</span></div><p className="mt-1 text-xs text-[var(--tess-muted)]">{kindInfo[item.type].label}{item.domain ? ` · ${item.domain}` : ""}</p></div></div><p className="mt-4 text-sm leading-6 text-[var(--tess-muted)]">{item.description || "Aucune description fournie par le runtime."}</p><div className="mt-4 flex items-center gap-1.5 border-t border-[var(--tess-line)] pt-3 text-[10px] text-[var(--tess-muted)]"><ShieldCheck className="h-3.5 w-3.5" />Déclaré par le runtime · {item.id}</div></article>; })}</section> : <div className="mt-6 rounded-2xl border border-dashed border-[var(--tess-line)] p-10 text-center"><Blocks className="mx-auto h-8 w-8 text-[var(--tess-muted)]" /><h2 className="mt-3 font-semibold text-[var(--tess-ink)]">Aucun résultat</h2><p className="mt-1 text-sm text-[var(--tess-muted)]">Modifie le filtre ou le terme de recherche.</p></div>}
  </div></main>;
}
