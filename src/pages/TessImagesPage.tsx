import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ImagePlus, Images, RefreshCw, Upload, X } from "lucide-react";

export default function TessImagesPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!image) { setPreview(""); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const chooseImage = (file?: File) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choisis un fichier image (PNG, JPEG, WebP…)."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("L’image dépasse la limite de 10 Mo."); return; }
    setImage(file);
  };

  return <main className="h-full overflow-y-auto bg-[var(--tess-bg)] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl">
    <header><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--tess-accent)]">T.E.S.S. · Médias</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tess-ink)]">Images</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tess-muted)]">Choisis une image et transmets-la à TESS pour l’analyser dans le chat. Les images restent locales jusqu’à leur envoi.</p></header>
    {error && <div role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200"><span className="flex-1">{error}</span><button type="button" onClick={() => setError("")} aria-label="Fermer" className="rounded p-1"><X className="h-4 w-4" /></button></div>}
    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={event => { chooseImage(event.target.files?.[0]); event.target.value = ""; }} />
    <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]"><div className="tess-hub-card overflow-hidden rounded-3xl border">{preview ? <div className="relative flex min-h-[320px] items-center justify-center bg-slate-950/[0.03] p-4 dark:bg-black/20"><img src={preview} alt={image?.name || "Aperçu de l’image sélectionnée"} className="max-h-[520px] max-w-full rounded-2xl object-contain" /><button type="button" onClick={() => setImage(null)} aria-label="Retirer l’image" title="Retirer l’image" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/90 text-slate-700 shadow-lg hover:bg-white"><X className="h-4 w-4" /></button></div> : <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[320px] w-full flex-col items-center justify-center border-2 border-dashed border-[var(--tess-line)] p-8 text-center transition hover:bg-[var(--tess-mint)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><ImagePlus className="h-7 w-7" /></span><span className="mt-4 font-semibold text-[var(--tess-ink)]">Choisir une image</span><span className="mt-1 text-sm text-[var(--tess-muted)]">PNG, JPEG ou WebP · 10 Mo maximum</span></button>}
      {image && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tess-line)] px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--tess-ink)]">{image.name}</p><p className="text-xs text-[var(--tess-muted)]">{(image.size / 1024 / 1024).toFixed(2)} Mo · {image.type}</p></div><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--tess-line)] px-3 text-xs font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)]"><RefreshCw className="h-3.5 w-3.5" />Remplacer</button></div>}</div>
      <aside className="tess-hub-card h-fit rounded-3xl border p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><Images className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-semibold text-[var(--tess-ink)]">Analyser avec TESS</h2><p className="mt-2 text-sm leading-6 text-[var(--tess-muted)]">L’image sélectionnée sera jointe au prochain message dans le chat. Tu pourras ajouter une question avant de l’envoyer.</p><button type="button" onClick={() => { if (image) navigate("/", { state: { tessPendingImage: image } }); else inputRef.current?.click(); }} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">{image ? "Continuer dans le chat" : "Sélectionner une image"}<ArrowUpRight className="h-4 w-4" /></button><p className="mt-3 text-[11px] leading-5 text-[var(--tess-muted)]">Aucune galerie distante n’est exposée par l’API actuellement : cet écran sert à choisir et joindre une image à la conversation.</p></aside>
    </section>
  </div></main>;
}
