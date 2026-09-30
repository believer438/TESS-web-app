// Copie Zentrix Academy : src/pages/AICourseGenView.tsx
/**
 * AICourseGenView — Génération IA de cours depuis un PDF
 *
 * Phases :
 *  "upload"     → formulaire PDF + métadonnées
 *  "generating" → SSE live : progress + chapitres qui apparaissent
 *  "review"     → édition chapitres + confirmation
 *  "saving"     → sauvegarde en cours
 *  "done"       → succès
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, ArrowLeft, BookOpen, Brain, Check, CheckCircle2,
  ChevronDown, ChevronUp, Clock, Edit2, Eye, EyeOff, FileText,
  GraduationCap, Layers, Loader2, Sparkles, Tag, Upload, User, X, Zap,
} from "lucide-react";
import {
  apiAICourseGenConfirm, apiAICourseGenUpload,
  type AICourseConfirmPayload, type AICourseGenEvent,
} from "@/lib/api-client";
import { buildApiUrl } from "@/lib/env";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "upload" | "generating" | "review" | "saving" | "done";

interface GeneratedChapter {
  title:        string;
  description:  string;
  content:      string;
  duration_min: number;
  order_index:  number;
  video_url:    string;
}

interface UploadForm {
  title:           string;
  category:        string;
  level:           string;
  instructor_name: string;
  cover_image:     string;
  tags:            string;
}

const LEVELS = [
  { value: "beginner",     label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced",     label: "Avancé" },
];

const CATEGORIES = [
  "Développement Web", "Data Science", "Intelligence Artificielle",
  "Cybersécurité", "DevOps", "Mobile", "Design UX/UI", "Mathématiques",
  "Finance", "Marketing Digital", "Langues", "Autre",
];

const cls = "w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-white placeholder:text-slate-400";

// ── Upload Phase ───────────────────────────────────────────────────────────────

function UploadPhase({
  onSubmit,
}: {
  onSubmit: (form: UploadForm, file: File) => void;
}) {
  const [form, setForm]   = useState<UploadForm>({
    title: "", category: "", level: "beginner",
    instructor_name: "", cover_image: "", tags: "",
  });
  const [file, setFile]   = useState<File | null>(null);
  const [drag, setDrag]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setFile(f);
    setError(null);
    if (!form.title) {
      setForm(prev => ({ ...prev, title: f.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ") }));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { setError("Le titre du cours est requis."); return; }
    if (!file)               { setError("Veuillez sélectionner un fichier PDF."); return; }
    onSubmit(form, file);
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5 dark:border-slate-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
          <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Générer un cours depuis un PDF</h2>
          <p className="text-xs text-slate-500">Chaque page est traitée dans l’ordre, sans texte source supprimé, puis enrichie pédagogiquement.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* PDF Drop Zone */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Fichier PDF <span className="text-[#FF6B00]">*</span>
        </label>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            drag
              ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20"
              : file
              ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/10"
              : "border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-800/50"
          }`}
        >
          <input
            ref={inputRef} type="file" accept=".pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {file ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} Mo — cliquez pour changer</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Glissez votre PDF ici</p>
                <p className="text-xs text-slate-400 mt-1">ou cliquez pour parcourir — tout PDF, même 500+ pages</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Course Metadata */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Titre du cours <span className="text-[#FF6B00]">*</span>
          </label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex : Introduction au Machine Learning avec Python"
              className={`${cls} pl-9`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Catégorie</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={cls}>
            <option value="">Sélectionner…</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Niveau</label>
          <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={cls}>
            {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Instructeur</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={form.instructor_name} onChange={e => setForm(f => ({ ...f, instructor_name: e.target.value }))}
              placeholder="Nom de l'instructeur" className={`${cls} pl-9`} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Image couverture (URL)</label>
          <input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))}
            placeholder="https://votre-cdn.example/image-couverture.webp" className={cls} />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tags (séparés par des virgules)</label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="Python, Machine Learning, IA, Débutant…" className={`${cls} pl-9`} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-700">
        <p className="text-xs text-slate-400">
          <Zap className="mr-1 inline h-3 w-3 text-violet-500" />
          Le document est envoyé à l’IA une seule partie à la fois ; chaque partie est conservée et enrichie.
        </p>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" /> Lancer la génération IA
        </button>
      </div>
    </div>
  );
}

// ── Generating Phase ──────────────────────────────────────────────────────────

function GeneratingPhase({
  taskId,
  courseTitle,
  onDone,
  onError,
}: {
  taskId:      string;
  courseTitle: string;
  onDone:      (chapters: GeneratedChapter[], description: string, durationH: number) => void;
  onError:     (message: string) => void;
}) {
  const [chapters, setChapters] = useState<GeneratedChapter[]>([]);
  const [progress, setProgress] = useState({ chunk: 0, total: 1, message: "Connexion au service IA…" });
  const [status,   setStatus]   = useState<"running" | "done" | "error">("running");
  const [expanded, setExpanded] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = buildApiUrl(`/ai-course-gen/stream/${taskId}`);
    const es  = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const evt: AICourseGenEvent = JSON.parse(e.data);

        if (evt.type === "extracting" || evt.type === "progress") {
          setProgress(p => ({
            chunk:   evt.chunk   ?? p.chunk,
            total:   evt.total   ?? evt.total_chunks ?? p.total,
            message: evt.message ?? p.message,
          }));
        }

        if (evt.type === "start") {
          setProgress({ chunk: 0, total: evt.total_chunks ?? 1, message: evt.message ?? "Démarrage…" });
        }

        if (evt.type === "chapter" && evt.title) {
          setChapters(prev => [...prev, {
            title:        evt.title!,
            description:  evt.description ?? "",
            content:      evt.content ?? "",
            duration_min: evt.duration_min ?? 30,
            order_index:  evt.order_index ?? prev.length,
            video_url:    "",
          }]);
        }

        if (evt.type === "done") {
          setStatus("done");
          es.close();
          setTimeout(() => {
            onDone(
              chaptersRef.current.length > 0 ? chaptersRef.current : [],
              evt.description ?? "",
              evt.duration_hours ?? 0,
            );
          }, 1000);
        }

        if (evt.type === "error") {
          setStatus("error");
          es.close();
          onError(evt.message ?? "Erreur inconnue");
        }
      } catch (_) {}
    };

    es.onerror = () => {
      // EventSource reconnects automatically. The backend resumes from the
      // last SSE event id, which is essential for lengthy PDF processing.
      setProgress(p => ({ ...p, message: "Connexion temporairement interrompue — reprise automatique…" }));
    };

    return () => { es.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Need chapters in the closure for onDone
  const chaptersRef = useRef(chapters);
  useEffect(() => { chaptersRef.current = chapters; }, [chapters]);

  // Re-bind onmessage when chapters changes to capture latest ref
  // (handled via ref above for the done callback)

  const pct = progress.total > 0 ? Math.round((progress.chunk / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5 dark:border-slate-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
          {status === "done"
            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            : <Brain className="h-5 w-5 animate-pulse text-violet-600 dark:text-violet-400" />
          }
        </div>
        <div className="flex-1">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            {status === "done" ? "Génération terminée ✓" : "L'IA construit votre cours…"}
          </h2>
          <p className="text-xs text-slate-500 truncate max-w-sm">{progress.message}</p>
        </div>
        <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{pct}%</span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-[#FF6B00] transition-all duration-500"
            style={{ width: `${Math.max(3, pct)}%` }}
          />
        </div>
        <p className="text-right text-[11px] text-slate-400">
          {progress.chunk} / {progress.total} partie{progress.total > 1 ? "s" : ""} traitée{progress.total > 1 ? "s" : ""}
        </p>
      </div>

      {/* Chapters appearing */}
      <div className="space-y-3">
        {chapters.length === 0 && status === "running" && (
          <div className="flex items-center gap-2 py-8 text-center justify-center text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyse du document en cours…</span>
          </div>
        )}

        {chapters.map((ch, i) => (
          <div
            key={i}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
            style={{ animation: "slideIn 0.3s ease-out" }}
          >
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-black text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{ch.title}</p>
                {ch.description && (
                  <p className="truncate text-xs text-slate-500">{ch.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />{ch.duration_min}m
                {expanded === i ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </div>
            </div>
            {expanded === i && ch.content && (
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-6 leading-relaxed whitespace-pre-wrap">
                  {ch.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {status === "done" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          <strong>{chapters.length} parties de cours générées</strong> — Passage à la révision…
        </div>
      )}
    </div>
  );
}

// ── Review Phase ──────────────────────────────────────────────────────────────

function ReviewPhase({
  taskId,
  initialCourse,
  onConfirmed,
  onBack,
}: {
  taskId:        string;
  initialCourse: AICourseConfirmPayload;
  onConfirmed:   (courseId: number) => void;
  onBack:        () => void;
}) {
  const [course,   setCourse]   = useState<AICourseConfirmPayload>(initialCourse);
  const [editing,  setEditing]  = useState<number | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const updateChapter = (i: number, patch: Partial<GeneratedChapter>) => {
    setCourse(prev => ({
      ...prev,
      chapters: prev.chapters.map((ch, idx) => idx === i ? { ...ch, ...patch } : ch),
    }));
  };

  const handleConfirm = async () => {
    if (!course.title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true); setError(null);
    try {
      const result = await apiAICourseGenConfirm(taskId, course);
      onConfirmed(result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const totalMin   = course.chapters.reduce((s, c) => s + c.duration_min, 0);
  const durationH  = (totalMin / 60).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5 dark:border-slate-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Révision avant publication</h2>
          <p className="text-xs text-slate-500">Relisez les titres, sous-titres, contenu et ressources vidéo avant de créer le cours.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Course summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Titre</label>
            <input value={course.title} onChange={e => setCourse(p => ({ ...p, title: e.target.value }))} className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description (générée par l'IA)</label>
            <textarea rows={4} value={course.description} onChange={e => setCourse(p => ({ ...p, description: e.target.value }))}
              className={`${cls} resize-none`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Catégorie</label>
            <input value={course.category} onChange={e => setCourse(p => ({ ...p, category: e.target.value }))} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Image couverture</label>
            <input value={course.cover_image} onChange={e => setCourse(p => ({ ...p, cover_image: e.target.value }))}
              placeholder="https://votre-cdn.example/image-couverture.webp" className={cls} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Layers className="h-4 w-4 text-violet-500" />
            <strong className="text-slate-900 dark:text-white">{course.chapters.length}</strong> chapitres
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Clock className="h-4 w-4 text-[#FF6B00]" />
            <strong className="text-slate-900 dark:text-white">{durationH}h</strong> de contenu
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <GraduationCap className="h-4 w-4 text-emerald-500" />
            <strong className="text-slate-900 dark:text-white">{course.level}</strong>
          </div>
        </div>
      </div>

      {/* Publish toggle */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-sm">
            {course.is_published ? "Cours publié immédiatement" : "Sauvegarder en brouillon"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {course.is_published ? "Visible dans le catalogue dès la création." : "Publiez manuellement plus tard."}
          </p>
        </div>
        <button
          onClick={() => setCourse(p => ({ ...p, is_published: !p.is_published }))}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition ${course.is_published
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          }`}
        >
          {course.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {course.is_published ? "Publié" : "Brouillon"}
        </button>
      </div>

      {/* Chapters list */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <BookOpen className="h-4 w-4" /> Chapitres générés
        </h3>
        <div className="space-y-3">
          {course.chapters.map((ch, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#FF6B00]/10 text-xs font-black text-[#FF6B00]">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === i ? null : i)}>
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{ch.title}</p>
                  {ch.description && <p className="truncate text-xs text-slate-500">{ch.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-slate-400"><Clock className="mr-0.5 inline h-3 w-3" />{ch.duration_min}m</span>
                  <button
                    onClick={() => setEditing(editing === i ? null : i)}
                    className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                  >
                    <Edit2 className="h-3 w-3" /> Éditer
                  </button>
                </div>
              </div>

              {/* Inline editor */}
              {editing === i && (
                <div className="border-t border-slate-100 p-4 space-y-3 dark:border-slate-700">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Titre du chapitre</label>
                    <input value={ch.title} onChange={e => updateChapter(i, { title: e.target.value })} className={`${cls} text-xs`} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Description courte</label>
                    <input value={ch.description} onChange={e => updateChapter(i, { description: e.target.value })} className={`${cls} text-xs`} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Contenu (markdown)</label>
                    <textarea
                      rows={10} value={ch.content}
                      onChange={e => updateChapter(i, { content: e.target.value })}
                      className={`${cls} resize-y text-xs leading-relaxed font-mono`}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Durée estimée (min)</label>
                      <input type="number" min={5} step={5} value={ch.duration_min}
                        onChange={e => updateChapter(i, { duration_min: Number(e.target.value) })}
                        className={`${cls} text-xs`} />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">URL vidéo (optionnel)</label>
                      <input value={ch.video_url} onChange={e => updateChapter(i, { video_url: e.target.value })}
                        placeholder="https://youtube.com/…" className={`${cls} text-xs`} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setEditing(null)}
                      className="flex items-center gap-1.5 bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
                      <Check className="h-3 w-3" /> Appliquer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-700">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Recommencer
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="flex items-center gap-2 bg-[#FF6B00] px-8 py-2.5 text-sm font-bold text-white transition hover:bg-[#e56000] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Création en cours…" : "Créer ce cours"}
        </button>
      </div>
    </div>
  );
}

// ── Done Phase ─────────────────────────────────────────────────────────────────

function DonePhase({ courseId, onNavigate }: { courseId: number; onNavigate: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Cours créé avec succès !</h2>
        <p className="mt-2 text-sm text-slate-500">
          Le cours #{courseId} a été sauvegardé dans votre base de données Supabase.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onNavigate("courses")}
          className="flex items-center gap-2 border border-slate-300 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
        >
          <Layers className="h-4 w-4" /> Voir tous les cours
        </button>
        <button
          onClick={() => onNavigate("wizard-new")}
          className="flex items-center gap-2 bg-[#FF6B00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e56000]"
        >
          <Sparkles className="h-4 w-4" /> Créer un autre cours
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface AICourseGenViewProps {
  onNavigate: (page: string, data?: unknown) => void;
  onBack:     () => void;
}

export default function AICourseGenView({ onNavigate, onBack }: AICourseGenViewProps) {
  const [phase,          setPhase]         = useState<Phase>("upload");
  const [taskId,         setTaskId]        = useState<string>("");
  const [courseTitle,    setCourseTitle]   = useState<string>("");
  const [uploadError,    setUploadError]   = useState<string | null>(null);
  const [uploading,      setUploading]     = useState(false);
  const [reviewPayload,  setReviewPayload] = useState<AICourseConfirmPayload | null>(null);
  const [generatedChaps, setGeneratedChaps]= useState<GeneratedChapter[]>([]);
  const [courseId,       setCourseId]      = useState<number>(0);

  // Uploaded form ref for confirm phase
  const uploadFormRef = useRef<UploadForm | null>(null);

  const handleUploadSubmit = async (form: UploadForm, file: File) => {
    setUploading(true); setUploadError(null);
    uploadFormRef.current = form;
    try {
      const fd = new FormData();
      fd.append("file",             file);
      fd.append("title",            form.title);
      fd.append("category",         form.category);
      fd.append("level",            form.level);
      fd.append("instructor_name",  form.instructor_name);
      fd.append("cover_image",      form.cover_image);
      fd.append("tags",             form.tags);

      const { task_id } = await apiAICourseGenUpload(fd);
      setTaskId(task_id);
      setCourseTitle(form.title);
      setPhase("generating");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Erreur lors de l'envoi du PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleGeneratingDone = useCallback((
    chapters:    GeneratedChapter[],
    description: string,
    durationH:   number,
  ) => {
    const form = uploadFormRef.current!;
    setGeneratedChaps(chapters);
    setReviewPayload({
      title:           form.title,
      description:     description,
      category:        form.category,
      level:           form.level,
      instructor_name: form.instructor_name,
      cover_image:     form.cover_image,
      tags:            form.tags,
      duration_hours:  durationH,
      is_published:    true,
      chapters:        chapters.map((ch, i) => ({ ...ch, order_index: i })),
    });
    setPhase("review");
  }, []);

  return (
    <div className="min-h-full bg-[#f4f6fb] dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">
              {phase === "upload"     && "Nouveau cours — Génération IA"}
              {phase === "generating" && `Génération : ${courseTitle}`}
              {phase === "review"     && "Révision du cours généré"}
              {phase === "saving"     && "Sauvegarde…"}
              {phase === "done"       && "Cours créé !"}
            </h1>
          </div>
          {/* Phase indicators */}
          <div className="ml-auto flex items-center gap-1.5">
            {(["upload", "generating", "review", "done"] as const).map((p, i) => (
              <div key={p} className={`h-2 w-2 rounded-full transition-all ${
                phase === p
                  ? "bg-violet-500 scale-125"
                  : ["upload", "generating", "review", "done"].indexOf(phase) > i
                  ? "bg-emerald-500"
                  : "bg-slate-200 dark:bg-slate-700"
              }`} />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {uploadError && phase === "upload" && (
          <div className="mb-6 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{uploadError}</span>
            <button onClick={() => setUploadError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {phase === "upload" && (
            <UploadPhase onSubmit={handleUploadSubmit} />
          )}

          {uploading && (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              Envoi du PDF en cours…
            </div>
          )}

          {phase === "generating" && taskId && (
            <GeneratingPhase
              taskId      = {taskId}
              courseTitle = {courseTitle}
              onDone      = {handleGeneratingDone}
              onError     = {(message) => { setUploadError(message); setPhase("upload"); }}
            />
          )}

          {phase === "review" && reviewPayload && (
            <ReviewPhase
              taskId        = {taskId}
              initialCourse = {reviewPayload}
              onConfirmed   = {(id) => { setCourseId(id); setPhase("done"); }}
              onBack        = {() => setPhase("upload")}
            />
          )}

          {phase === "done" && (
            <DonePhase courseId={courseId} onNavigate={onNavigate} />
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
