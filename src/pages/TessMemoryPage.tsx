import { FormEvent, useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw, Save, Trash2 } from "lucide-react";
import { tessFetch, type TessMemoryItem } from "@/lib/tess-client";

const labels: Record<string, string> = {
  locale: "Locale",
  timezone: "Fuseau horaire",
  preferred_language: "Langue préférée",
  private_places: "Lieux privés",
  favorite_contacts: "Contacts favoris",
  notification_preferences: "Préférences de notification",
  accessibility: "Accessibilité",
};

export default function TessMemoryPage() {
  const [items, setItems] = useState<TessMemoryItem[]>([]);
  const [allowedKeys, setAllowedKeys] = useState<string[]>([]);
  const [key, setKey] = useState("preferred_language");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [memory, keys] = await Promise.all([
        tessFetch<TessMemoryItem[]>("/memory"),
        tessFetch<string[]>("/memory/allowed-keys"),
      ]);
      setItems(memory); setAllowedKeys(keys);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de charger la mémoire."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      let parsed: unknown = value;
      try { parsed = JSON.parse(value); } catch { /* Une préférence texte reste une valeur valide. */ }
      await tessFetch(`/memory/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify({ key, value: parsed }) });
      setValue(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "La préférence n’a pas pu être enregistrée."); }
    finally { setSaving(false); }
  };
  const remove = async (memoryKey: string) => {
    setError("");
    try { await tessFetch(`/memory/${encodeURIComponent(memoryKey)}`, { method: "DELETE" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "La préférence n’a pas pu être supprimée."); }
  };
  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · Contrôle utilisateur</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Mémoire</h1><p className="mt-2 max-w-2xl text-sm text-[var(--tess-muted)]">Seules les préférences que tu enregistres explicitement sont conservées. Les conversations ne sont pas mémorisées automatiquement.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] px-3 py-2 text-sm font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)] disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Actualiser</button></header>{error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}<form onSubmit={save} className="tess-hub-card mt-6 grid gap-3 rounded-2xl border p-5 md:grid-cols-[220px_1fr_auto] md:items-end"><label className="text-xs font-semibold text-[var(--tess-ink)]">Type<select value={key} onChange={event => setKey(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--tess-line)] bg-transparent px-3 text-sm outline-none focus:border-blue-500">{allowedKeys.map(itemKey => <option key={itemKey} value={itemKey}>{labels[itemKey] || itemKey}</option>)}</select></label><label className="text-xs font-semibold text-[var(--tess-ink)]">Valeur<input required value={value} onChange={event => setValue(event.target.value)} placeholder="Texte ou JSON valide" className="mt-2 h-11 w-full rounded-xl border border-[var(--tess-line)] bg-transparent px-3 text-sm outline-none focus:border-blue-500" /></label><button type="submit" disabled={saving || !allowedKeys.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--tess-ink)] px-4 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer"}</button></form><section className="mt-6 space-y-3">{items.map(item => <article key={item.key} className="tess-hub-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><Brain className="h-5 w-5" /></span><div className="min-w-0"><p className="text-sm font-semibold text-[var(--tess-ink)]">{labels[item.key] || item.key}</p><p className="mt-1 max-w-xl break-words text-sm text-[var(--tess-muted)]">{typeof item.value === "string" ? item.value : JSON.stringify(item.value)}</p><p className="mt-1 text-xs text-[var(--tess-muted)]">Mis à jour le {new Date(item.updated_at).toLocaleString("fr-FR")}</p></div></div><button type="button" onClick={() => void remove(item.key)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button></article>)}{!loading && !items.length && <p className="rounded-2xl border border-dashed border-[var(--tess-line)] px-4 py-10 text-center text-sm text-[var(--tess-muted)]">Aucune préférence mémorisée.</p>}</section></div></main>;
}
