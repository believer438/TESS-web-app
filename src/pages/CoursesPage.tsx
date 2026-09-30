// Copie Zentrix Academy : src/pages/CoursesPage.tsx
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast as toastSonner } from "sonner";
import { ConfirmDialog, CONFIRM_CLOSED, type ConfirmDialogState } from "@/components/ui/confirm-dialog";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  ArrowDownUp, Award, BookOpen, Check, ChevronDown, ChevronUp, CircleDollarSign, CircleDot, Clock, Globe2, Heart, Layers, LayoutGrid, Star,
  Edit2, Eye, EyeOff, FileText, GraduationCap,
  Grid2X2, List, Loader2, Maximize2, Plus, RefreshCw, Save, Search, Shield,
  SlidersHorizontal, Sparkles, Trash2, UserCheck, Users, Video, X,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import PageHero from "@/components/ui/PageHero";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import {
  type CatalogueCourse,
  apiEnrollCourse, apiGetCatalogue,
  apiGetCatalogueAllAdmin, apiGetCatalogueCategories, apiUnenrollCourse,
  apiCreateCourse, apiUpdateCourse, apiDeleteCourse,
  apiGetCourseChapters, apiCreateChapter, apiUpdateChapter, apiDeleteChapter,
  isAuthenticated,
} from "@/lib/api-client";
import type { BackendChapter } from "@/lib/api-client";
import type { Course } from "@/lib/backend-types";

interface CoursesPageProps {
  onNavigate: (page: string, data?: unknown) => void;
  isAdmin?: boolean;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner:     "Débutant",
  intermediate: "Intermédiaire",
  advanced:     "Avancé",
};

const LEVEL_COLORS: Record<string, string> = {
  beginner:     "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20",
  intermediate: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",
  advanced:     "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20",
};

const ALL_LEVELS = ["beginner", "intermediate", "advanced"];

function formatCourseDate(value: string, lang: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : lang === "ar" ? "ar" : "en-US", {
    dateStyle: "medium",
  }).format(date);
}

const LEVELS = [
  { value: "beginner",     label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced",     label: "Avancé" },
];

const inputCls = "w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors";

interface FilterBarProps {
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (cat: string) => void;
  selectedLevels: string[];
  onToggleLevel: (level: string) => void;
  enrolledOnly: boolean;
  onToggleEnrolledOnly: () => void;
  filterCount: number;
  onClearAll: () => void;
  isAdmin?: boolean;
  levelCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
}

const COURSE_COVER_FALLBACKS = [
  "/ordinateur-simulation-visuel-data-science.jpg",
  "/etudiant-data-science.webp",
  "/hero1.webp",
  "/cours.jpg",
];

function courseCoverFallback(course: Pick<CatalogueCourse, "category" | "title" | "id">) {
  const source = `${course.category} ${course.title}`.toLowerCase();
  if (source.includes("data") || source.includes("intelligence") || source.includes("python")) return COURSE_COVER_FALLBACKS[0];
  if (source.includes("langue") || source.includes("anglais")) return COURSE_COVER_FALLBACKS[2];
  return COURSE_COVER_FALLBACKS[course.id % COURSE_COVER_FALLBACKS.length];
}

function catalogueToCourse(c: CatalogueCourse): Course {
  return {
    id:                `cat-${c.id}`,
    backendId:         c.id,
    title:             c.title,
    description:       c.description,
    coverImage:        c.cover_image || courseCoverFallback(c),
    categoryId:        `cat-${c.category}`,
    categoryName:      c.category || "Général",
    professor:         c.instructor_name || "Zentrix Academy",
    difficulty:        c.level as Course["difficulty"],
    estimatedDuration: c.duration_hours,
    chaptersCount:     c.chapters?.length ?? 0,
    lessonsCount:      c.chapters?.length ?? 0,
    enrolledCount:     c.enrolled_count,
    progress:          0,
    isEnrolled:        c.is_enrolled,
    isFeatured:        c.is_published,
    tags:              c.tags ? c.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
  };
}

// ── Admin helpers ─────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}

interface ChapterFormData {
  title: string; description: string; content: string;
  order_index: number; video_url: string; duration_min: number;
}
const emptyChapterForm = (order: number): ChapterFormData => ({
  title: "", description: "", content: "", order_index: order, video_url: "", duration_min: 0,
});

function ChapterRow({ chapter, courseId, onUpdated, onDeleted }: {
  chapter: BackendChapter; courseId: number;
  onUpdated: (ch: BackendChapter) => void; onDeleted: (id: number) => void;
}) {
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ChapterFormData>({
    title: chapter.title, description: chapter.description, content: chapter.content,
    order_index: chapter.order_index, video_url: chapter.video_url, duration_min: chapter.duration_min,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { const u = await apiUpdateChapter(courseId, chapter.id, form); onUpdated(u); setEditing(false); }
    catch (err) { toastSonner.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    setConfirmOpen(false);
    try { await apiDeleteChapter(courseId, chapter.id); onDeleted(chapter.id); }
    catch (err) { toastSonner.error(err instanceof Error ? err.message : "Erreur"); }
  };

  return (
    <>
    <ConfirmDialog
      open={confirmOpen}
      title={`Supprimer le chapitre ?`}
      description={`« ${chapter.title} » sera définitivement supprimé.`}
      confirmLabel="Supprimer"
      onConfirm={doDelete}
      onCancel={() => setConfirmOpen(false)}
    />
    {editorOpen && (
      <RichTextEditor
        value={form.content}
        onChange={html => setForm(prev => ({ ...prev, content: html }))}
        onClose={() => setEditorOpen(false)}
        chapterTitle={form.title || chapter.title}
      />
    )}
    <div className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 rounded-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6B00]/15 text-[10px] font-bold text-[#FF6B00]">
          {chapter.order_index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{chapter.title}</p>
          {chapter.video_url && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-400">
              <Video className="h-3 w-3 text-[#FF6B00]" />{chapter.video_url}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(v => !v)} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-[#FF6B00] dark:hover:bg-slate-800">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setConfirmOpen(true)} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {editing && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Titre *"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} /></FormField>
            <FormField label="URL Vidéo"><input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/…" className={inputCls} /></FormField>
            <FormField label="Durée (min)"><input type="number" min={0} value={form.duration_min} onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })} className={inputCls} /></FormField>
            <FormField label="Ordre"><input type="number" min={0} value={form.order_index} onChange={e => setForm({ ...form, order_index: Number(e.target.value) })} className={inputCls} /></FormField>
            <div className="sm:col-span-2"><FormField label="Description"><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} /></FormField></div>
            <div className="sm:col-span-2">
              <FormField label="Contenu pédagogique">
                <div className="relative">
                  <textarea
                    rows={4}
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    className={`${inputCls} resize-y pr-10`}
                    placeholder="Écrivez ici ou cliquez sur ⛶ pour l'éditeur pleine page…"
                  />
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); setEditorOpen(true); }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#FF6B00]/10 hover:text-[#FF6B00] transition-colors"
                    title="Ouvrir l'éditeur pleine page (Word)"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {form.content?.trim().startsWith("<") && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600">
                    <Check className="h-3 w-3" /> Contenu riche (HTML) — sera rendu en pleine mise en forme
                  </p>
                )}
              </FormField>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Annuler</button>
            <button onClick={handleSave} disabled={saving || !form.title} className="flex items-center gap-1.5 bg-[#FF6B00] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#e56000] disabled:opacity-50">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Sauvegarder
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

interface CourseFormData {
  title: string; description: string; category: string; cover_image: string;
  level: string; duration_hours: number; instructor_name: string;
  is_published: boolean; tags: string;
}
const emptyForm = (): CourseFormData => ({
  title: "", description: "", category: "", cover_image: "", level: "beginner",
  duration_hours: 0, instructor_name: "", is_published: true, tags: "",
});

function CourseModal({ course, onClose, onSaved }: {
  course: CatalogueCourse | null; onClose: () => void; onSaved: (c: CatalogueCourse) => void;
}) {
  const isEdit = course !== null;
  const [form, setForm] = useState<CourseFormData>(course ? {
    title: course.title, description: course.description, category: course.category,
    cover_image: course.cover_image, level: course.level, duration_hours: course.duration_hours,
    instructor_name: course.instructor_name, is_published: course.is_published, tags: course.tags,
  } : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<BackendChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [addingChapter, setAddingChapter]         = useState(false);
  const [newChapterForm, setNewChapterForm]       = useState<ChapterFormData>(emptyChapterForm(0));
  const [savingChapter, setSavingChapter]         = useState(false);
  const [newChapterEditorOpen, setNewChapterEditorOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!course?.id) return;
    setLoadingChapters(true);
    apiGetCourseChapters(course.id).then(setChapters).catch(() => {}).finally(() => setLoadingChapters(false));
  }, [course?.id]);

  const handleSaveCourse = async () => {
    if (!form.title.trim()) return;
    setSaving(true); setError(null);
    try {
      const payload = { ...form, duration_hours: Number(form.duration_hours) };
      const saved = isEdit ? await apiUpdateCourse(course!.id, payload) : await apiCreateCourse(payload);
      onSaved(saved);
      if (!isEdit) onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde"); }
    finally { setSaving(false); }
  };

  const handleAddChapter = async () => {
    if (!course?.id || !newChapterForm.title.trim()) return;
    setSavingChapter(true);
    try {
      const ch = await apiCreateChapter(course.id, { ...newChapterForm, order_index: chapters.length, duration_min: Number(newChapterForm.duration_min) });
      setChapters(prev => [...prev, ch]);
      setNewChapterForm(emptyChapterForm(chapters.length + 1));
      setAddingChapter(false);
    } catch (err) { toastSonner.error(err instanceof Error ? err.message : "Erreur lors de l'ajout du chapitre"); }
    finally { setSavingChapter(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="my-6 w-full max-w-3xl rounded-sm border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEdit ? `Modifier : ${course.title}` : "Nouveau cours"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">Champs obligatoires marqués *</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {error && <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

          <div>
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FileText className="h-3.5 w-3.5 text-[#FF6B00]" /> Informations du cours
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><FormField label="Titre *"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex : Introduction à Python" className={inputCls} /></FormField></div>
              <div className="sm:col-span-2"><FormField label="Description"><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez le contenu et les objectifs du cours" className={`${inputCls} resize-none`} /></FormField></div>
              <FormField label="Catégorie"><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex : Développement Web" className={inputCls} /></FormField>
              <FormField label="Instructeur"><input value={form.instructor_name} onChange={e => setForm({ ...form, instructor_name: e.target.value })} placeholder="Nom de l'instructeur" className={inputCls} /></FormField>
              <FormField label="Niveau">
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className={inputCls}>
                  {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </FormField>
              <FormField label="Durée (heures)"><input type="number" min={0} value={form.duration_hours} onChange={e => setForm({ ...form, duration_hours: Number(e.target.value) })} className={inputCls} /></FormField>
              <div className="sm:col-span-2"><FormField label="Image de couverture (URL)"><input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} placeholder="https://votre-cdn.example/image.webp" className={inputCls} /></FormField></div>
              <div className="sm:col-span-2"><FormField label="Tags (séparés par des virgules)"><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="Python, Data, Machine Learning" className={inputCls} /></FormField></div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button onClick={() => setForm({ ...form, is_published: !form.is_published })} className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${form.is_published ? "bg-[#FF6B00]" : "bg-slate-300 dark:bg-slate-700"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_published ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {form.is_published ? "Publié (visible par les étudiants)" : "Brouillon (non visible)"}
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onClose} className="border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Annuler</button>
              <button onClick={handleSaveCourse} disabled={saving || !form.title.trim()} className="flex items-center gap-2 bg-[#FF6B00] px-6 py-2 text-sm font-bold text-white hover:bg-[#e56000] disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEdit ? "Sauvegarder" : "Créer le cours"}
              </button>
            </div>
          </div>

          {isEdit && (
            <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Video className="h-3.5 w-3.5 text-[#FF6B00]" /> Chapitres ({chapters.length})
                </h3>
                <button onClick={() => setAddingChapter(v => !v)} className="flex items-center gap-1.5 rounded-sm bg-[#FF6B00] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#e56000]">
                  <Plus className="h-3.5 w-3.5" /> Ajouter un chapitre
                </button>
              </div>

              {loadingChapters && <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#FF6B00]" /></div>}

              {!loadingChapters && chapters.length === 0 && !addingChapter && (
                <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950">
                  Aucun chapitre. Ajoutez le premier contenu de ce cours.
                </div>
              )}

              <div className="space-y-2">
                {chapters.map(ch => (
                  <ChapterRow key={ch.id} chapter={ch} courseId={course!.id}
                    onUpdated={u => setChapters(prev => prev.map(c => c.id === u.id ? u : c))}
                    onDeleted={id => setChapters(prev => prev.filter(c => c.id !== id))}
                  />
                ))}
              </div>

              {newChapterEditorOpen && (
                <RichTextEditor
                  value={newChapterForm.content}
                  onChange={html => setNewChapterForm(prev => ({ ...prev, content: html }))}
                  onClose={() => setNewChapterEditorOpen(false)}
                  chapterTitle={newChapterForm.title || "Nouveau chapitre"}
                />
              )}

              {addingChapter && (
                <div className="mt-3 rounded-sm border border-[#FF6B00]/30 bg-orange-50/30 p-4 dark:bg-[#FF6B00]/5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#FF6B00]">Nouveau chapitre</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Titre *"><input value={newChapterForm.title} onChange={e => setNewChapterForm({ ...newChapterForm, title: e.target.value })} className={inputCls} /></FormField>
                    <FormField label="URL Vidéo"><input value={newChapterForm.video_url} onChange={e => setNewChapterForm({ ...newChapterForm, video_url: e.target.value })} placeholder="https://youtube.com/…" className={inputCls} /></FormField>
                    <FormField label="Durée (min)"><input type="number" min={0} value={newChapterForm.duration_min} onChange={e => setNewChapterForm({ ...newChapterForm, duration_min: Number(e.target.value) })} className={inputCls} /></FormField>
                    <div className="sm:col-span-2"><FormField label="Description"><textarea rows={2} value={newChapterForm.description} onChange={e => setNewChapterForm({ ...newChapterForm, description: e.target.value })} className={`${inputCls} resize-none`} /></FormField></div>
                    <div className="sm:col-span-2">
                      <FormField label="Contenu pédagogique">
                        <div className="relative">
                          <textarea
                            rows={4}
                            value={newChapterForm.content}
                            onChange={e => setNewChapterForm({ ...newChapterForm, content: e.target.value })}
                            className={`${inputCls} resize-y pr-10`}
                            placeholder="Écrivez ici ou cliquez sur ⛶ pour l'éditeur pleine page…"
                          />
                          <button
                            type="button"
                            onMouseDown={e => { e.preventDefault(); setNewChapterEditorOpen(true); }}
                            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-[#FF6B00]/10 hover:text-[#FF6B00] transition-colors"
                            title="Ouvrir l'éditeur pleine page (Word)"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {newChapterForm.content?.trim().startsWith("<") && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600">
                            <Check className="h-3 w-3" /> Contenu riche (HTML) — sera rendu en pleine mise en forme
                          </p>
                        )}
                      </FormField>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setAddingChapter(false)} className="border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Annuler</button>
                    <button onClick={handleAddChapter} disabled={savingChapter || !newChapterForm.title.trim()} className="flex items-center gap-1.5 rounded-sm bg-[#FF6B00] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#e56000] disabled:opacity-50">
                      {savingChapter ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton: course card ─────────────────────────────────────────────────────
function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <Skeleton className="h-44 w-full" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-3 w-20" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="mt-1 flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="mt-auto flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </div>
  );
}

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({
  course, onView, onEnrollToggle, enrolling,
  isAdmin, onEdit, onDelete, deleting,
}: {
  course: CatalogueCourse;
  onView: () => void;
  onEnrollToggle: () => void;
  enrolling: boolean;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const { t } = useLanguage();
  const [coverFailed, setCoverFailed] = useState(false);
  const tags = course.tags
    ? course.tags.split(",").map(t => t.trim()).filter(Boolean)
    : [];
  const hasUsableCover = Boolean(course.cover_image?.trim()) && !coverFailed;
  const fallbackCover = courseCoverFallback(course);
  const [favorite, setFavorite] = useState(() => {
    try { return localStorage.getItem(`zentrix-course-favorite-${course.id}`) === "1"; } catch { return false; }
  });
  const toggleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    setFavorite(value => {
      const next = !value;
      try { localStorage.setItem(`zentrix-course-favorite-${course.id}`, next ? "1" : "0"); } catch { /* storage unavailable */ }
      return next;
    });
  };
  const viewCourseLabel = t("courses.viewCourse");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(16,35,66,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950 dark:hover:border-blue-400/30">
      <div
        className="relative aspect-[16/6] w-full cursor-pointer overflow-hidden bg-slate-100 dark:bg-slate-900"
        onClick={onView}
      >
        {hasUsableCover || fallbackCover ? (
          <img
            src={coverFailed ? fallbackCover : (course.cover_image || fallbackCover)}
            alt={course.title}
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#EFF6FF] via-[#DBEAFE] to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#2563EB]/20 bg-white/70 text-[#2563EB] shadow-sm dark:bg-slate-900/70">
              <BookOpen className="h-8 w-8" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${LEVEL_COLORS[course.level] ?? LEVEL_COLORS.beginner}`}>
          {LEVEL_LABELS[course.level] ?? course.level}
        </span>
        {!isAdmin && <button type="button" onClick={toggleFavorite} aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"} className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/35 text-white backdrop-blur transition hover:bg-slate-950/60"><Heart className={`h-4 w-4 ${favorite ? "fill-rose-400 text-rose-400" : ""}`} /></button>}

        {/* Published/Draft badge (admin only) */}
        {isAdmin && (
          <span className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            course.is_published
              ? "bg-emerald-500 text-white"
              : "bg-slate-700/90 text-slate-200"
          }`}>
            {course.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {course.is_published ? t("catalogue.published") : t("catalogue.draft")}
          </span>
        )}

        {/* Enrolled badge (non-admin) */}
        {!isAdmin && course.is_enrolled && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
            <UserCheck className="h-3 w-3" />
            {t("catalogue.enrolled")}
          </span>
        )}

        {/* Admin edit/delete overlay */}
        {isAdmin && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={e => { e.stopPropagation(); onEdit?.(); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow shadow-blue-900/20 transition-colors hover:bg-[#1D4ED8]"
              title={t("common.edit")}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete?.(); }}
              disabled={deleting}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow hover:bg-red-500 hover:text-white disabled:opacity-50"
              title={t("common.delete")}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p data-course-category className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#FF6B00]">
          {course.category || t("catalogue.general")}
        </p>
        <h3
          onClick={onView}
          className="mb-1.5 line-clamp-2 cursor-pointer text-[14px] font-bold leading-tight text-[#0F172A] transition-colors hover:text-[#1E3A8A] dark:text-white dark:hover:text-blue-300"
        >
          {course.title}
        </h3>
        <p className="mb-2.5 line-clamp-2 text-[11px] leading-[1.45] text-slate-500 dark:text-slate-400">
          {course.description}
        </p>
        <div className="mb-2.5 flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[8px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{(course.instructor_name || "B").slice(0, 1).toUpperCase()}</span>
            {course.instructor_name || t("catalogue.instructor")}
          </span>
          {course.duration_hours > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-[#FF9F2D]" />
              {course.duration_hours}h
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-[#FF9F2D]" />
            {course.enrolled_count.toLocaleString("fr-FR")}
          </span>
        </div>
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className={`mt-auto grid ${isAdmin ? "grid-cols-3" : "grid-cols-2"} gap-1.5 pt-1`}>
          <button
            onClick={onView}
            className="flex min-w-0 items-center justify-center gap-1 rounded-lg border border-blue-500 px-2 py-2 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-400/60 dark:text-blue-300 dark:hover:bg-blue-950/30"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {viewCourseLabel === "courses.viewCourse" ? "Voir le cours" : viewCourseLabel}
          </button>
          {isAdmin ? (
            <>
              <button
                onClick={onEdit}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-[#1D4ED8]"
              >
                <Edit2 className="h-3.5 w-3.5" />
                {t("common.edit")}
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                aria-label={`Supprimer ${course.title}`}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{t("common.delete")}</span>
              </button>
            </>
          ) : (
            <button
              onClick={onEnrollToggle}
              disabled={enrolling}
                className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                course.is_enrolled
                ? "border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400"
                  : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              }`}
            >
              {enrolling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : course.is_enrolled ? (
                <UserCheck className="h-3.5 w-3.5" />
              ) : (
                <GraduationCap className="h-3.5 w-3.5" />
              )}
                {course.is_enrolled ? t("catalogue.enrolled") : t("catalogue.enroll")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({
  categories, selectedCategories, onToggleCategory,
  selectedLevels, onToggleLevel,
  enrolledOnly, onToggleEnrolledOnly,
  onClearAll, filterCount, isAdmin, onClose, levelCounts, categoryCounts,
}: {
  categories:           string[];
  selectedCategories:   string[];
  onToggleCategory:     (cat: string) => void;
  selectedLevels:       string[];
  onToggleLevel:        (lvl: string) => void;
  enrolledOnly:         boolean;
  onToggleEnrolledOnly: () => void;
  onClearAll:           () => void;
  filterCount:          number;
  isAdmin?:             boolean;
  onClose:              () => void;
  levelCounts:          Record<string, number>;
  categoryCounts:       Record<string, number>;
}) {
  const { t } = useLanguage();
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-300">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{t("catalogue.filters")}</p>
            <p className="text-[11px] text-slate-400">{t("catalogue.liveFilterHint")}</p>
          </div>
        </div>
        {filterCount > 0 && (
          <button onClick={onClearAll} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#2563EB] transition hover:bg-[#EFF6FF] dark:text-blue-300 dark:hover:bg-blue-950/40">
            {t("catalogue.clear")}
          </button>
        )}
      </div>

      <div className="max-h-[min(58vh,28rem)] space-y-5 overflow-y-auto px-4 py-4">
        {!isAdmin && (
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t("catalogue.access")}</p>
            <button
              onClick={onToggleEnrolledOnly}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                enrolledOnly
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#1E3A8A] dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                  : "border-slate-200 text-slate-700 hover:border-[#2563EB]/40 dark:border-slate-700 dark:text-slate-200"
              }`}
            >
              <span>{t("catalogue.enrolledOnly")}</span>
              <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${enrolledOnly ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-slate-300 dark:border-slate-600"}`}>
                {enrolledOnly && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          </section>
        )}

        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t("catalogue.level")}</p>
          <div className="grid grid-cols-3 gap-2">
            {ALL_LEVELS.map(lvl => {
              const active = selectedLevels.includes(lvl);
              return (
                <button
                  key={lvl}
                  onClick={() => onToggleLevel(lvl)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                    active ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-slate-200 text-slate-600 hover:border-[#2563EB]/50 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-left">{LEVEL_LABELS[lvl]}</span>
                  <span className={`text-[10px] ${active ? "text-white/75" : "text-slate-400"}`}>{levelCounts[lvl] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </section>

        {categories.length > 0 && (
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t("catalogue.category")}</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const active = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => onToggleCategory(cat)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-slate-200 text-slate-600 hover:border-[#2563EB]/50 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {active && <Check className="mr-1 inline h-3 w-3" />}{cat}
                    <span className={`ml-1 text-[10px] ${active ? "text-white/75" : "text-slate-400"}`}>{categoryCounts[cat] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
        <button onClick={onClose} className="w-full rounded-xl bg-[#2563EB] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8]">
          {t("catalogue.applyFilters")}{filterCount > 0 ? ` (${filterCount} ${t("catalogue.filtersCount")})` : ""}
        </button>
      </div>
    </div>
  );
}

// ── Sidebar filter (desktop) ──────────────────────────────────────────────────
function SidebarFilter({
  categories, selectedCategories, onToggleCategory,
  selectedLevels, onToggleLevel,
  enrolledOnly, onToggleEnrolledOnly,
  filterCount, onClearAll, isAdmin, levelCounts, categoryCounts,
}: Omit<FilterBarProps, "onClose">) {
  const { t } = useLanguage();
  const [openSections, setOpenSections] = useState({ level: true, status: true, categories: true });
  const toggleSection = (section: keyof typeof openSections) => setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));

  const SectionHeader = ({ id, label, icon }: { id: keyof typeof openSections; label: string; icon: ReactNode }) => {
    const open = openSections[id];
    return (
      <button type="button" onClick={() => toggleSection(id)} className="flex w-full items-center gap-2 py-2 text-left text-[11px] font-bold text-slate-700 dark:text-slate-200">
        <span className="text-slate-500 dark:text-slate-400">{icon}</span>
        <span className="flex-1">{label}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>
    );
  };

  const CheckOption = ({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"}`}>
        {active && <Check className="h-2.5 w-2.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-[10px] text-slate-400">({count})</span>
    </button>
  );

  return (
    <aside className="hidden w-64 flex-shrink-0 lg:block">
      <div className="sticky top-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Filtres avancés</span>
          </div>
          {filterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className="p-3">
          {filterCount > 0 && (
            <div className="border-b border-slate-100 pb-2.5 dark:border-slate-800">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                <span>Filtres actifs</span>
                <ChevronUp className="h-3 w-3" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedLevels.map(level => <button key={level} type="button" onClick={() => onToggleLevel(level)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-blue-950/30 dark:text-slate-300">{LEVEL_LABELS[level]} <X className="h-2.5 w-2.5" /></button>)}
                {selectedCategories.map(category => <button key={category} type="button" onClick={() => onToggleCategory(category)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-blue-950/30 dark:text-slate-300">{category} <X className="h-2.5 w-2.5" /></button>)}
                {enrolledOnly && <button type="button" onClick={onToggleEnrolledOnly} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Mes cours <X className="h-2.5 w-2.5" /></button>}
              </div>
            </div>
          )}

          {/* ── Niveau ── */}
          <div className="border-b border-slate-100 py-1.5 dark:border-slate-800">
            <SectionHeader id="level" label={t("catalogue.level")} icon={<Layers className="h-3 w-3" />} />
            {openSections.level && <div className="space-y-0.5 pb-1">
              {ALL_LEVELS.map(lvl => {
                const active = selectedLevels.includes(lvl);
                return <CheckOption key={lvl} active={active} label={LEVEL_LABELS[lvl]} count={levelCounts[lvl] ?? 0} onClick={() => onToggleLevel(lvl)} />;
              })}
            </div>}
          </div>

          {/* ── Statut (non-admin) ── */}
          {!isAdmin && (
            <div className="border-b border-slate-100 py-1.5 dark:border-slate-800">
              <SectionHeader id="status" label={t("catalogue.status")} icon={<CircleDot className="h-3 w-3" />} />
              {openSections.status && <div className="flex items-center justify-between pb-1 pl-5 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="flex-1">{t("catalogue.enrolledOnly")} <span className="text-[10px] text-slate-400">({enrolledOnly ? 1 : 0})</span></span>
                <button type="button" role="switch" aria-checked={enrolledOnly} onClick={onToggleEnrolledOnly} className={`relative h-5 w-8 rounded-full transition-colors ${enrolledOnly ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enrolledOnly ? "translate-x-3.5" : "translate-x-0.5"}`} /></button>
              </div>}
            </div>
          )}

          {/* ── Catégories ── */}
          {categories.length > 0 && (
            <div className="border-b border-slate-100 py-1.5 dark:border-slate-800">
              <SectionHeader id="categories" label="Catégories" icon={<Layers className="h-3 w-3" />} />
              {openSections.categories && <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pb-1">
                {categories.map(cat => {
                  const active = selectedCategories.includes(cat);
                  return <CheckOption key={cat} active={active} label={cat} count={categoryCounts[cat] ?? 0} onClick={() => onToggleCategory(cat)} />;
                })}
              </div>}
            </div>
          )}

          {[
            { label: "Durée", Icon: Clock }, { label: "Prix", Icon: CircleDollarSign }, { label: "Langue", Icon: Globe2 }, { label: "Format", Icon: LayoutGrid }, { label: "Note minimum", Icon: Star },
          ].map(({ label, Icon }) => <div key={label} className="border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800"><button type="button" className="flex w-full items-center gap-2 text-left text-[11px] font-bold text-slate-700 dark:text-slate-200"><span className="text-slate-500"><Icon className="h-3 w-3" /></span><span className="flex-1">{label}</span><ChevronDown className="h-3.5 w-3.5 text-slate-400" /></button></div>)}

        </div>
        <div className="border-t border-slate-100 p-3 dark:border-slate-800"><button type="button" onClick={() => undefined} className="w-full rounded-md bg-blue-600 py-2 text-[11px] font-bold text-white transition-colors hover:bg-blue-700">Appliquer les filtres {filterCount > 0 && `(${filterCount})`}</button></div>
      </div>
    </aside>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({
  hasFilters, onClear, isMyCourses, onBrowse, isAdmin,
}: {
  hasFilters:  boolean;
  onClear:     () => void;
  isMyCourses?: boolean;
  onBrowse?:   () => void;
  isAdmin?:    boolean;
}) {
  const { t } = useLanguage();
  if (isMyCourses && !isAdmin) {
    return (
      <div className="flex flex-col items-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20">
          <GraduationCap className="h-9 w-9 text-[#FF6B00]/60" />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">{t("catalogue.noEnrolled")}</p>
          <p className="text-sm text-slate-500">{t("catalogue.explore")}</p>
        </div>
        {onBrowse && (
          <button
            onClick={onBrowse}
            className="flex items-center gap-2 bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e56000]"
          >
            <BookOpen className="h-4 w-4" />
            {t("app.allCourses")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <BookOpen className="h-9 w-9 text-slate-300 dark:text-slate-600" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
          {hasFilters ? t("catalogue.noMatches") : isAdmin ? t("catalogue.noCoursesAdmin") : t("catalogue.noCourses")}
        </p>
        <p className="text-sm text-slate-500">
          {hasFilters ? t("catalogue.noMatchesHint") : isAdmin ? t("catalogue.noCoursesAdminHint") : t("catalogue.noCoursesHint")}
        </p>
      </div>
      {hasFilters && (
        <button onClick={onClear} className="flex items-center gap-2 border border-[#FF6B00] px-4 py-2 text-sm font-semibold text-[#FF6B00] hover:bg-[#FF6B00]/5">
          <X className="h-4 w-4" />
          {t("catalogue.clear")}
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CoursesPage({ onNavigate, isAdmin = false }: CoursesPageProps) {
  const { lang, t } = useLanguage();
  const location = useLocation();
  const { toast } = useToast();
  const [allCourses, setAllCourses] = useState<CatalogueCourse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [tab, setTab]               = useState<"all" | "my">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterMenuRef                = useRef<HTMLDivElement>(null);

  const initialSearch = new URLSearchParams(location.search).get("q") ?? "";
  const [search, setSearch]         = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels]         = useState<string[]>([]);
  const [enrolledOnly, setEnrolledOnly]             = useState(false);
  const [sortBy, setSortBy]                         = useState<"popular" | "recent" | "title" | "level">("popular");
  const [viewMode, setViewMode]                     = useState<"grid" | "list">("grid");
  const [enrollingId, setEnrollingId]               = useState<number | null>(null);

  // Admin state
  const [modal, setModal]           = useState<CatalogueCourse | null | "new">(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const authenticated = isAuthenticated();

  useEffect(() => {
    if (!filterOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterOpen]);

  const loadCatalogue = useCallback(() => {
    setLoading(true);
    setError(null);
    const fetcher = isAdmin
      ? apiGetCatalogueAllAdmin()
      : apiGetCatalogue({ search: search.trim() || undefined });
    fetcher
      .then(setAllCourses)
      .catch(e => setError(e instanceof Error ? e.message : "Erreur réseau"))
      .finally(() => setLoading(false));
  }, [isAdmin, search]);

  const loadCategories = useCallback(() => {
    apiGetCatalogueCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => { loadCatalogue(); loadCategories(); }, [loadCatalogue, loadCategories]);

  // Public catalogue search is backed by the API. Debounce the input so the
  // results update naturally while typing without issuing one request per key.
  useEffect(() => {
    if (searchInput === search) return;
    const timer = window.setTimeout(() => setSearch(searchInput), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  const tabFiltered = tab === "my"
    ? allCourses.filter(c => c.is_enrolled)
    : allCourses;

  const catalogueCategories = Array.from(new Set([
    ...categories,
    ...allCourses.map(course => course.category).filter(Boolean),
  ])).sort((a, b) => a.localeCompare(b, lang));
  const levelCounts = Object.fromEntries(
    ALL_LEVELS.map(level => [level, allCourses.filter(course => course.level === level).length]),
  );
  const categoryCounts = Object.fromEntries(
    catalogueCategories.map(category => [category, allCourses.filter(course => course.category === category).length]),
  );

  const filtered = tabFiltered.filter(c => {
    if (search && isAdmin) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false;
    }
    if (selectedLevels.length > 0 && !selectedLevels.includes(c.level)) return false;
    if (selectedCategories.length > 0 && !selectedCategories.includes(c.category)) return false;
    if (enrolledOnly && !c.is_enrolled) return false;
    return true;
  });

  const sortedCourses = [...filtered].sort((a, b) => {
    if (sortBy === "popular") {
      const enrollmentDiff = (b.enrolled_count ?? 0) - (a.enrolled_count ?? 0);
      if (enrollmentDiff !== 0) return enrollmentDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "title") return a.title.localeCompare(b.title, lang);
    if (sortBy === "level") return (ALL_LEVELS.indexOf(a.level) - ALL_LEVELS.indexOf(b.level));
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const enrolledCount = allCourses.filter(c => c.is_enrolled).length;
  const visibleCourses = isAdmin ? allCourses.filter(course => course.is_published) : allCourses;
  const totalEnrollments = visibleCourses.reduce((sum, course) => sum + (course.enrolled_count ?? 0), 0);
  const latestCourse = visibleCourses.reduce<CatalogueCourse | null>((latest, course) => {
    if (!latest) return course;
    return new Date(course.created_at).getTime() > new Date(latest.created_at).getTime() ? course : latest;
  }, null);
  const filterCount   = selectedCategories.length + selectedLevels.length + (enrolledOnly ? 1 : 0);

  useSetPageContext({
    current_page: "courses",
    page_title:   "Catalogue des cours",
    page_data: {
      tab,
      search_query:           search,
      active_filter_category: selectedCategories[0] ?? null,
      active_filter_level:    selectedLevels[0] ?? null,
      visible_results_count:  filtered.length,
      total_catalogue_count:  visibleCourses.length,
      total_enrollments:      totalEnrollments,
      available_categories:   catalogueCategories.length,
    },
  });

  const clearAll = () => { setSelectedCategories([]); setSelectedLevels([]); setEnrolledOnly(false); };
  const toggleCategory = (cat: string) =>
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const toggleLevel = (lvl: string) =>
    setSelectedLevels(prev => prev.includes(lvl) ? prev.filter(l => l !== lvl) : [...prev, lvl]);

  const handleEnrollToggle = async (course: CatalogueCourse) => {
    if (!authenticated) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour vous inscrire à ce cours." });
      return;
    }
    setEnrollingId(course.id);
    try {
      if (course.is_enrolled) await apiUnenrollCourse(course.id);
      else await apiEnrollCourse(course.id);
      setAllCourses(prev =>
        prev.map(c =>
          c.id === course.id
            ? { ...c, is_enrolled: !c.is_enrolled, enrolled_count: c.is_enrolled ? c.enrolled_count - 1 : c.enrolled_count + 1 }
            : c,
        ),
      );
    } catch { } finally {
      setEnrollingId(null);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(CONFIRM_CLOSED);

  const handleDelete = (course: CatalogueCourse) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer ce cours ?",
      description: `« ${course.title} » et tous ses chapitres seront définitivement supprimés.`,
      confirmLabel: "Supprimer",
      onConfirm: async () => {
        setConfirmDialog(CONFIRM_CLOSED);
        setDeletingId(course.id);
        try {
          await apiDeleteCourse(course.id);
          setAllCourses(prev => prev.filter(c => c.id !== course.id));
        } catch (e) {
          toastSonner.error(e instanceof Error ? e.message : "Erreur lors de la suppression");
          setDeletingId(null);
        }
      },
    });
  };

  const handleView = (course: CatalogueCourse) =>
    onNavigate("course-detail", catalogueToCourse(course));

  const heroSubtitle = isAdmin
    ? "Mode administration — tous les cours (publiés et brouillons). Créez, modifiez et gérez le contenu pédagogique."
    : "Découvrez tous les cours créés par notre équipe pédagogique. Inscrivez-vous et commencez à apprendre.";

  return (
    <div className="w-full min-h-full bg-[#f4f6fb] dark:bg-slate-950">
      <PageHero
        eyebrow={isAdmin ? t("catalogue.adminEyebrow") : "Zentrix Academy"}
        title={t("catalogue.title")}
        subtitle={heroSubtitle}
        backgroundImage="/page-hero-catalogue.png"
        icon={isAdmin ? <Shield className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
        compact
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-end">
          <div className="grid max-w-3xl grid-cols-3 divide-x divide-white/20">
          {[
            { label: isAdmin ? "cours publiés" : "cours disponibles", value: visibleCourses.length, icon: BookOpen },
            { label: "apprenants", value: totalEnrollments, icon: Users },
            { label: "à la fin de vos parcours", value: "Certification", icon: Award, date: true },
          ].map(({ label, value, icon: Icon, date }) => (
            <div key={label} className="flex min-w-0 items-center gap-2.5 px-4 first:pl-0 last:pr-0">
              <Icon className={`h-5 w-5 shrink-0 ${date ? "text-amber-400" : "text-blue-400"}`} />
              <span className="min-w-0">
                <span className={`block truncate font-bold text-white ${date ? "text-xs sm:text-sm" : "text-sm sm:text-base"}`}>{loading ? "…" : typeof value === "number" ? value.toLocaleString(lang === "fr" ? "fr-FR" : "en-US") : value}</span>
                <span className="block truncate text-[9px] text-white/65 sm:text-[10px]">{label}</span>
              </span>
            </div>
          ))}
          </div>
          <div className="hidden border-l border-white/20 pl-5 text-xs leading-5 text-white/85 lg:block">
            <p className="text-base font-medium">“ Apprendre aujourd’hui,</p>
            <p className="text-base font-medium">construire demain. ”</p>
            <span className="mt-1.5 block h-0.5 w-7 bg-blue-400" />
          </div>
        </div>
      </PageHero>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="relative border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:flex sm:flex-wrap sm:gap-3 sm:px-6 lg:flex-nowrap xl:px-8">

          {/* Tab switcher */}
          {!isAdmin && (
            <div className="col-span-full flex w-full shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 sm:w-auto lg:col-auto">
              <button
                onClick={() => setTab("all")}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                  tab === "all"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                {t("catalogue.popularCourses")}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === "all" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"}`}>
                  {allCourses.length}
                </span>
              </button>
              <button
                onClick={() => setTab("my")}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                  tab === "my"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                {t("catalogue.myCourses")}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === "my" ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"}`}>
                  {enrolledCount}
                </span>
              </button>
            </div>
          )}

          {/* Admin badge */}
          {isAdmin && (
            <div className="col-span-full flex items-center gap-2 rounded-lg bg-[#FF6B00]/10 px-3 py-2 text-sm font-bold text-[#FF6B00] sm:col-auto">
              <Shield className="h-4 w-4" />
              {t("catalogue.adminMode")} — {allCourses.length} {t("catalogue.totalCourses")}
            </div>
          )}

          {/* Search bar */}
          <div className="relative min-w-0 sm:flex-1 lg:min-w-[16rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") setSearch(searchInput); }}
              placeholder={t("catalogue.searchPlaceholder")}
              className="w-full border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setSearch(searchInput)}
            className="hidden items-center gap-2 bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e56000] sm:flex lg:hidden"
          >
            <Search className="h-4 w-4" />
            {t("catalogue.search")}
          </button>

          <button
            onClick={loadCatalogue}
            className="hidden h-10 w-10 items-center justify-center border border-slate-200 text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00] sm:flex lg:hidden dark:border-slate-700"
            title="Rafraîchir"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Filter toggle */}
          <div ref={filterMenuRef} className="relative lg:hidden">
            <button
              onClick={() => setFilterOpen(v => !v)}
              aria-expanded={filterOpen}
              aria-controls="courses-mobile-filters"
              className={`flex h-10 items-center gap-2 border px-3 text-sm font-semibold transition-colors ${
                filterOpen || filterCount > 0
                  ? "border-[#FF6B00] bg-[#FF6B00]/5 text-[#FF6B00]"
                  : "border-slate-200 text-slate-600 hover:border-[#FF6B00]/50 hover:text-[#FF6B00] dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{t("catalogue.filters")}</span>
              {filterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] text-[10px] font-bold text-white">
                  {filterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div id="courses-mobile-filters" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(22rem,calc(100vw-2rem))] lg:hidden">
                <FilterBar
                  categories={catalogueCategories}
                  selectedCategories={selectedCategories}
                  onToggleCategory={toggleCategory}
                  selectedLevels={selectedLevels}
                  onToggleLevel={toggleLevel}
                  enrolledOnly={enrolledOnly}
                  onToggleEnrolledOnly={() => setEnrolledOnly(v => !v)}
                  onClearAll={clearAll}
                  filterCount={filterCount}
                  isAdmin={isAdmin}
                  onClose={() => setFilterOpen(false)}
                  levelCounts={levelCounts}
                  categoryCounts={categoryCounts}
                />
              </div>
            )}
          </div>

          {/* Desktop controls stay on the same row as the search field. */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <span className="text-xs text-slate-500 dark:text-slate-400">Trier par :</span>
            <select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} aria-label="Trier les cours" className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <option value="popular">Popularité</option>
              <option value="recent">Plus récents</option>
              <option value="title">Ordre alphabétique</option>
              <option value="level">Niveau</option>
            </select>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              <button type="button" onClick={() => setViewMode("grid")} aria-label="Vue grille" className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}><Grid2X2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setViewMode("list")} aria-label="Vue liste" className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}><List className="h-4 w-4" /></button>
            </div>
            <span className="whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">{loading ? "…" : `${filtered.length} cours trouvés`}</span>
          </div>

          {/* Admin: create course button */}
          {isAdmin && (
            <button
              onClick={() => onNavigate("create-course")}
              className="col-span-full flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-[#1D4ED8] sm:col-auto"
            >
              <Plus className="h-4 w-4" />
              {t("catalogue.newCourse")}
            </button>
          )}
        </div>
      </div>

      {/* ── Content: sidebar + grille ─────────────────────────────────────────── */}
      <div className="flex w-full min-w-0 gap-4 px-4 py-6 sm:gap-6 sm:px-6 xl:px-8">

        {/* Sidebar filtre (desktop uniquement) */}
        <SidebarFilter
          categories={catalogueCategories}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          selectedLevels={selectedLevels}
          onToggleLevel={toggleLevel}
          enrolledOnly={enrolledOnly}
          onToggleEnrolledOnly={() => setEnrolledOnly(v => !v)}
          onClearAll={clearAll}
          filterCount={filterCount}
          isAdmin={isAdmin}
          levelCounts={levelCounts}
          categoryCounts={categoryCounts}
        />

        {/* Grille des cours */}
        <div className="min-w-0 flex-1">
          <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${filterCount === 0 ? "lg:hidden" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 lg:hidden">
                {loading ? "Chargement…" : `${filtered.length} cours`}
              </p>
              {selectedLevels.map(level => <button key={level} onClick={() => toggleLevel(level)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{LEVEL_LABELS[level]} <X className="h-3 w-3" /></button>)}
              {selectedCategories.map(category => <button key={category} onClick={() => toggleCategory(category)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{category} <X className="h-3 w-3" /></button>)}
              {enrolledOnly && <button onClick={() => setEnrolledOnly(false)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Mes cours <X className="h-3 w-3" /></button>}
              {filterCount > 0 && <button onClick={clearAll} className="text-[11px] font-semibold text-slate-400 hover:text-[#2563EB]">Tout effacer</button>}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:hidden">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span className="sr-only">Trier les cours</span>
              <select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <option value="popular">Popularité</option>
                <option value="recent">Plus récents</option>
                <option value="title">Ordre alphabétique</option>
                <option value="level">Niveau</option>
              </select>
            </label>
            <div className="hidden items-center gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700 sm:flex">
              <button type="button" onClick={() => setViewMode("grid")} aria-label="Vue grille" className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}><Grid2X2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setViewMode("list")} aria-label="Vue liste" className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}><List className="h-4 w-4" /></button>
            </div>
            </div>
          </div>
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className={viewMode === "grid" ? "grid min-w-0 flex-1 items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]" : "grid min-w-0 flex-1 gap-3"}>
              {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              hasFilters={filterCount > 0}
              onClear={clearAll}
              isMyCourses={tab === "my"}
              onBrowse={() => setTab("all")}
              isAdmin={isAdmin}
            />
          ) : (
            <div className={viewMode === "grid" ? "grid min-w-0 flex-1 items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]" : "grid min-w-0 flex-1 gap-3"}>
              {sortedCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onView={() => handleView(course)}
                  onEnrollToggle={() => handleEnrollToggle(course)}
                  enrolling={enrollingId === course.id}
                  isAdmin={isAdmin}
                  onEdit={() => onNavigate("edit-course", course)}
                  onDelete={() => handleDelete(course)}
                  deleting={deletingId === course.id}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && (
              <p className="mt-8 text-center text-xs text-slate-400">
              {filtered.length} {t("catalogue.courseCount")}
              {filterCount > 0 ? " (filtres actifs)" : ""}
            </p>
          )}
        </div>
      </div>

      {/* ── Course Modal (admin) ─────────────────────────────────────────────── */}
      {modal && (
        <CourseModal
          course={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={saved => {
            setAllCourses(prev => {
              const idx = prev.findIndex(c => c.id === saved.id);
              return idx >= 0 ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev];
            });
            setModal(saved);
          }}
        />
      )}
      <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(CONFIRM_CLOSED)} />
    </div>
  );
}

