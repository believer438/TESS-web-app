// Copie Zentrix Academy : src/pages/AdminPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import {
  BookOpen, Edit2, GraduationCap, Loader2, Plus, Save, Shield,
  Trash2, Users, Video, X, BarChart3, Eye, EyeOff, RefreshCw,
  UserCheck, Crown, School, LayoutDashboard, Brain, Settings,
  ChevronRight, CheckCircle, Clock, Target, AlertCircle, UserPlus,
  TrendingUp, FileText, Zap, BookMarked, Upload, ExternalLink, Search,
  Maximize2,
} from "lucide-react";
import {
  apiGetCatalogueAllAdmin, apiCreateCourse, apiUpdateCourse, apiDeleteCourse,
  apiGetCourseChapters, apiCreateChapter, apiUpdateChapter, apiDeleteChapter,
  apiGetAdminStats, apiGetAdminUsers, apiUpdateUserRole, apiDeleteUser,
  apiAdminCreateUser, apiAdminGetAllQuizStats, apiAdminGenerateQuiz,
  apiGetLibraryAllAdmin, apiCreateLibraryResource, apiUpdateLibraryResource,
  apiDeleteLibraryResource, apiUploadLibraryFile,
  type CatalogueCourse, type BackendChapter, type AdminStats,
  type AdminUser, type AdminQuizStat, type LibraryBook,
} from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { toast as toastSonner } from "sonner";
import { ConfirmDialog, CONFIRM_CLOSED, type ConfirmDialogState } from "@/components/ui/confirm-dialog";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

// ── Constants ────────────────────────────────────────────────────────────────

const LEVELS = [
  { value: "beginner",     label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced",     label: "Avancé" },
];

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin:     { label: "Admin",      color: "text-[#FF6B00] bg-[#FF6B00]/10",                                     icon: <Crown    className="h-3 w-3" /> },
  professor: { label: "Professeur", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",   icon: <School   className="h-3 w-3" /> },
  student:   { label: "Étudiant",   color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20", icon: <UserCheck className="h-3 w-3" /> },
};

const inputCls = "w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors";

// ── Helpers ──────────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 hover:border-[#FF6B00]/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`rounded-xl p-3 ${
          color.includes("FF6B00") ? "bg-[#FF6B00]/10" :
          color.includes("emerald") ? "bg-emerald-50 dark:bg-emerald-900/20" :
          color.includes("blue") ? "bg-blue-50 dark:bg-blue-900/20" :
          color.includes("purple") ? "bg-purple-50 dark:bg-purple-900/20" :
          "bg-slate-100 dark:bg-slate-800"
        }`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Nav ───────────────────────────────────────────────────────────────

type Tab = "overview" | "courses" | "quizzes" | "users" | "settings" | "library";

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: "overview",  label: "Vue d'ensemble", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "courses",   label: "Cours",          icon: <BookOpen className="h-4 w-4" /> },
  { id: "quizzes",   label: "Quiz",           icon: <Brain className="h-4 w-4" /> },
  { id: "users",     label: "Utilisateurs",   icon: <Users className="h-4 w-4" /> },
  { id: "library",   label: "Bibliothèque",   icon: <BookMarked className="h-4 w-4" /> },
  { id: "settings",  label: "Paramètres",     icon: <Settings className="h-4 w-4" /> },
];

// ── Chapter Row ───────────────────────────────────────────────────────────────

interface ChapterFormData {
  title: string; description: string; content: string;
  order_index: number; video_url: string; video_position: string; duration_min: number;
}
const emptyChapterForm = (order: number): ChapterFormData => ({
  title: "", description: "", content: "", order_index: order, video_url: "", video_position: "bottom", duration_min: 0,
});

function ChapterRow({ chapter, courseId, onUpdated, onDeleted }: {
  chapter: BackendChapter; courseId: number;
  onUpdated: (ch: BackendChapter) => void; onDeleted: (id: number) => void;
}) {
  const [editing,    setEditing]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ChapterFormData>({
    title: chapter.title, description: chapter.description, content: chapter.content,
    order_index: chapter.order_index, video_url: chapter.video_url,
    video_position: chapter.video_position || "bottom", duration_min: chapter.duration_min,
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
          <button onClick={() => setEditing((v) => !v)} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-[#FF6B00] dark:hover:bg-slate-800">
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
            <FormField label="Titre *"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></FormField>
            <FormField label="URL Vidéo"><input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=… ou youtu.be/…" className={inputCls} /></FormField>
            <FormField label="Position de la vidéo">
              <select value={form.video_position} onChange={(e) => setForm({ ...form, video_position: e.target.value })} className={inputCls}>
                <option value="top">En haut (avant le texte)</option>
                <option value="bottom">En bas (après le texte)</option>
              </select>
            </FormField>
            <FormField label="Durée (min)"><input type="number" min={0} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} className={inputCls} /></FormField>
            <FormField label="Ordre"><input type="number" min={0} value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} className={inputCls} /></FormField>
            <div className="sm:col-span-2"><FormField label="Description"><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} /></FormField></div>
            <div className="sm:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contenu</span>
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="flex items-center gap-1.5 bg-[#FF6B00] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#e56000] transition-colors"
                >
                  <Maximize2 className="h-3 w-3" /> Ouvrir l'éditeur
                </button>
              </div>
              <textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className={`${inputCls} resize-y font-mono text-xs`}
                placeholder="Contenu texte ou HTML (utilisez l'éditeur pour du rich text)"
              />
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
      {editorOpen && (
        <RichTextEditor
          value={form.content}
          onChange={(html) => setForm((f) => ({ ...f, content: html }))}
          onClose={() => setEditorOpen(false)}
          chapterTitle={form.title}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer le chapitre ?"
        description={`« ${chapter.title} » sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        onConfirm={doDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// ── Course Modal ──────────────────────────────────────────────────────────────

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
  const [addingChapter,        setAddingChapter]        = useState(false);
  const [newChapterForm,       setNewChapterForm]        = useState<ChapterFormData>(emptyChapterForm(0));
  const [savingChapter,        setSavingChapter]         = useState(false);
  const [newChapterEditorOpen, setNewChapterEditorOpen]  = useState(false);

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
      setChapters((prev) => [...prev, ch]);
      setNewChapterForm(emptyChapterForm(chapters.length + 1));
      setAddingChapter(false);
    } catch (err) { toastSonner.error(err instanceof Error ? err.message : "Erreur lors de l'ajout du chapitre"); }
    finally { setSavingChapter(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 rounded-sm">
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
          {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-sm">{error}</div>}

          <div>
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FileText className="h-3.5 w-3.5 text-[#FF6B00]" /> Informations du cours
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><FormField label="Titre *"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Introduction à Python" className={inputCls} /></FormField></div>
              <div className="sm:col-span-2"><FormField label="Description"><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez le contenu et les objectifs du cours" className={`${inputCls} resize-none`} /></FormField></div>
              <FormField label="Catégorie"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex : Développement Web" className={inputCls} /></FormField>
              <FormField label="Instructeur"><input value={form.instructor_name} onChange={(e) => setForm({ ...form, instructor_name: e.target.value })} placeholder="Nom de l'instructeur" className={inputCls} /></FormField>
              <FormField label="Niveau">
                <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputCls}>
                  {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </FormField>
              <FormField label="Durée (heures)"><input type="number" min={0} value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} className={inputCls} /></FormField>
              <div className="sm:col-span-2"><FormField label="Image de couverture (URL)"><input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="https://votre-cdn.example/image.webp" className={inputCls} /></FormField></div>
              <div className="sm:col-span-2"><FormField label="Tags (séparés par des virgules)"><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Python, Data, Machine Learning" className={inputCls} /></FormField></div>
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
                <button onClick={() => setAddingChapter((v) => !v)} className="flex items-center gap-1.5 bg-[#FF6B00] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#e56000] rounded-sm">
                  <Plus className="h-3.5 w-3.5" /> Ajouter un chapitre
                </button>
              </div>

              {loadingChapters && <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#FF6B00]" /></div>}

              {!loadingChapters && chapters.length === 0 && !addingChapter && (
                <div className="border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950 rounded-sm">
                  Aucun chapitre. Ajoutez le premier contenu de ce cours.
                </div>
              )}

              <div className="space-y-2">
                {chapters.map((ch) => (
                  <ChapterRow key={ch.id} chapter={ch} courseId={course!.id}
                    onUpdated={(u) => setChapters((prev) => prev.map((c) => c.id === u.id ? u : c))}
                    onDeleted={(id) => setChapters((prev) => prev.filter((c) => c.id !== id))}
                  />
                ))}
              </div>

              {addingChapter && (
                <div className="mt-3 border border-[#FF6B00]/30 bg-orange-50/30 p-4 dark:bg-[#FF6B00]/5 rounded-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#FF6B00]">Nouveau chapitre</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Titre *"><input value={newChapterForm.title} onChange={(e) => setNewChapterForm({ ...newChapterForm, title: e.target.value })} className={inputCls} /></FormField>
                    <FormField label="URL Vidéo"><input value={newChapterForm.video_url} onChange={(e) => setNewChapterForm({ ...newChapterForm, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=… ou youtu.be/…" className={inputCls} /></FormField>
                    <FormField label="Position de la vidéo">
                      <select value={newChapterForm.video_position} onChange={(e) => setNewChapterForm({ ...newChapterForm, video_position: e.target.value })} className={inputCls}>
                        <option value="top">En haut (avant le texte)</option>
                        <option value="bottom">En bas (après le texte)</option>
                      </select>
                    </FormField>
                    <FormField label="Durée (min)"><input type="number" min={0} value={newChapterForm.duration_min} onChange={(e) => setNewChapterForm({ ...newChapterForm, duration_min: Number(e.target.value) })} className={inputCls} /></FormField>
                    <div className="sm:col-span-2"><FormField label="Description"><textarea rows={2} value={newChapterForm.description} onChange={(e) => setNewChapterForm({ ...newChapterForm, description: e.target.value })} className={`${inputCls} resize-none`} /></FormField></div>
                    <div className="sm:col-span-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contenu</span>
                        <button
                          type="button"
                          onClick={() => setNewChapterEditorOpen(true)}
                          className="flex items-center gap-1.5 bg-[#FF6B00] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#e56000] transition-colors"
                        >
                          <Maximize2 className="h-3 w-3" /> Ouvrir l'éditeur
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={newChapterForm.content}
                        onChange={(e) => setNewChapterForm({ ...newChapterForm, content: e.target.value })}
                        className={`${inputCls} resize-y font-mono text-xs`}
                        placeholder="Contenu texte ou HTML (utilisez l'éditeur pour du rich text)"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setAddingChapter(false)} className="border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Annuler</button>
                    <button onClick={handleAddChapter} disabled={savingChapter || !newChapterForm.title.trim()} className="flex items-center gap-1.5 bg-[#FF6B00] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#e56000] disabled:opacity-50 rounded-sm">
                      {savingChapter ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Ajouter
                    </button>
                  </div>
                </div>
              )}
              {newChapterEditorOpen && (
                <RichTextEditor
                  value={newChapterForm.content}
                  onChange={(html) => setNewChapterForm((f) => ({ ...f, content: html }))}
                  onClose={() => setNewChapterEditorOpen(false)}
                  chapterTitle={newChapterForm.title || "Nouveau chapitre"}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGetAdminStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" /></div>;
  if (error) return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Vue d'ensemble</h1>
        <p className="mt-1 text-sm text-slate-400">Bienvenue dans le panneau d'administration Zentrix Academy.</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={stats.total_users}
          icon={<Users className="h-5 w-5 text-[#FF6B00]" />} color="text-[#FF6B00]"
          sub={`${stats.students} étudiants`} />
        <StatCard label="Cours publiés" value={stats.published_courses}
          icon={<BookOpen className="h-5 w-5 text-emerald-500" />} color="text-emerald-600 dark:text-emerald-400"
          sub={`${stats.draft_courses} brouillons`} />
        <StatCard label="Inscriptions" value={stats.total_enrollments}
          icon={<GraduationCap className="h-5 w-5 text-blue-500" />} color="text-blue-600 dark:text-blue-400"
          sub="au total" />
        <StatCard label="Chapitres" value={stats.total_chapters}
          icon={<FileText className="h-5 w-5 text-purple-500" />} color="text-purple-600 dark:text-purple-400"
          sub="de contenu" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Étudiants" value={stats.students}
          icon={<UserCheck className="h-5 w-5 text-emerald-500" />} color="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Professeurs" value={stats.professors}
          icon={<School className="h-5 w-5 text-blue-500" />} color="text-blue-600 dark:text-blue-400" />
        <StatCard label="Admins" value={stats.admins}
          icon={<Shield className="h-5 w-5 text-[#FF6B00]" />} color="text-[#FF6B00]" />
        <StatCard label="Quiz passés" value={(stats as any).total_quizzes ?? 0}
          icon={<Brain className="h-5 w-5 text-purple-500" />} color="text-purple-600 dark:text-purple-400"
          sub={`moy. ${(stats as any).avg_quiz_score ?? 0}%`} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Actions rapides</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Créer un cours",      icon: <BookOpen className="h-4 w-4" />,  tab: "courses"  as Tab },
            { label: "Gérer les quiz",       icon: <Brain className="h-4 w-4" />,     tab: "quizzes"  as Tab },
            { label: "Gérer les utilisateurs", icon: <Users className="h-4 w-4" />,   tab: "users"    as Tab },
          ].map((a) => (
            <button key={a.tab} onClick={() => onNavigate(a.tab)}
              className="flex items-center justify-between border border-slate-200 bg-white p-4 text-left hover:border-[#FF6B00]/40 hover:bg-orange-50/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-[#FF6B00]/5 transition-all group">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B00]/10 text-[#FF6B00]">{a.icon}</div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{a.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#FF6B00] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Courses Tab ───────────────────────────────────────────────────────────────

function CoursesTab() {
  const [courses, setCourses] = useState<CatalogueCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [modal, setModal]     = useState<CatalogueCourse | null | "new">(null);
  const [search, setSearch]   = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    apiGetCatalogueAllAdmin().then(setCourses).catch((e) => setError(e instanceof Error ? e.message : "Erreur")).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

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
        try { await apiDeleteCourse(course.id); setCourses((prev) => prev.filter((c) => c.id !== course.id)); }
        catch (e) { toastSonner.error(e instanceof Error ? e.message : "Erreur lors de la suppression"); setDeletingId(null); }
      },
    });
  };

  return (
    <>
    <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(CONFIRM_CLOSED)} />
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Gestion des cours</h1>
          <p className="mt-1 text-sm text-slate-400">{courses.length} cours au total</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un cours…"
            className="border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-white w-48"
          />
          <button onClick={load} className="flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setModal("new")} className="flex items-center gap-2 bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white hover:bg-[#e56000] rounded-sm">
            <Plus className="h-4 w-4" /> Nouveau cours
          </button>
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-950">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">{search ? "Aucun cours ne correspond à votre recherche." : "Aucun cours. Créez le premier !"}</p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Cours</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Catégorie</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Niveau</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Inscriptions</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {course.cover_image && (
                        <img src={course.cover_image} alt="" className="h-9 w-14 flex-shrink-0 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{course.title}</p>
                        <p className="text-xs text-slate-400">{course.instructor_name || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{course.category || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      course.level === "beginner" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" :
                      course.level === "intermediate" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                      "bg-orange-50 text-[#FF6B00] dark:bg-[#FF6B00]/10"
                    }`}>
                      {course.level === "beginner" ? "Débutant" : course.level === "intermediate" ? "Intermédiaire" : "Avancé"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {course.is_published ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><Eye className="h-3 w-3" /> Publié</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-400"><EyeOff className="h-3 w-3" /> Brouillon</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{course.enrolled_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal(course)} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-[#FF6B00] dark:hover:bg-slate-700 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(course)} disabled={deletingId === course.id} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors">
                        {deletingId === course.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <CourseModal
          course={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            setCourses((prev) => {
              const idx = prev.findIndex((c) => c.id === saved.id);
              return idx >= 0 ? prev.map((c) => c.id === saved.id ? saved : c) : [...prev, saved];
            });
            setModal(saved);
          }}
        />
      )}
    </div>
    </>
  );
}

// ── Quiz Tab ──────────────────────────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation?: string;
}

function QuizzesTab() {
  const [stats, setStats]     = useState<AdminQuizStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CatalogueCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | "">("");
  const [nQuestions, setNQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<{ title: string; questions: QuizQuestion[] } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setLoading(true);
    Promise.all([apiAdminGetAllQuizStats(), apiGetCatalogueAllAdmin()])
      .then(([s, c]) => { setStats(s); setCourses(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleGenerate = async () => {
    if (!selectedCourse) return;
    setGenerating(true); setGenError(null); setGeneratedQuiz(null);
    try {
      const res = await apiAdminGenerateQuiz(Number(selectedCourse), nQuestions);
      setGeneratedQuiz({ title: res.course_title, questions: res.questions as QuizQuestion[] });
    } catch (e) { setGenError(e instanceof Error ? e.message : "Erreur lors de la génération"); }
    finally { setGenerating(false); }
  };

  const avgScore = stats.length > 0 ? Math.round(stats.reduce((s, r) => s + r.score, 0) / stats.length) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Quiz & Évaluations</h1>
        <p className="mt-1 text-sm text-slate-400">Générez des quiz IA et consultez les résultats de tous les étudiants.</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Quiz passés" value={stats.length} icon={<Target className="h-5 w-5 text-[#FF6B00]" />} color="text-[#FF6B00]" />
        <StatCard label="Score moyen" value={`${avgScore}%`} icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} color="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Cours couverts" value={new Set(stats.map((s) => s.course_id)).size} icon={<BookOpen className="h-5 w-5 text-blue-500" />} color="text-blue-600 dark:text-blue-400" />
      </div>

      {/* Generator */}
      <div className="border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Zap className="h-4 w-4 text-[#FF6B00]" /> Générateur de quiz IA
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Sélectionner un cours</label>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
              <option value="">-- Choisir un cours --</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Nb de questions</label>
            <input type="number" min={3} max={20} value={nQuestions} onChange={(e) => setNQuestions(Number(e.target.value))} className={inputCls} />
          </div>
          <button onClick={handleGenerate} disabled={!selectedCourse || generating} className="flex items-center gap-2 bg-[#FF6B00] px-5 py-2 text-sm font-bold text-white hover:bg-[#e56000] disabled:opacity-50 rounded-sm whitespace-nowrap">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {generating ? "Génération…" : "Générer un quiz"}
          </button>
        </div>
        {genError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{genError}</p>}

        {generatedQuiz && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Quiz : {generatedQuiz.title}</h3>
              <span className="text-xs text-slate-400">{generatedQuiz.questions.length} questions</span>
            </div>
            {generatedQuiz.questions.map((q, i) => (
              <div key={i} className="border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 rounded-sm">
                <p className="mb-3 font-semibold text-slate-900 dark:text-white text-sm">
                  <span className="mr-2 text-[#FF6B00] font-black">{i + 1}.</span>{q.question}
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {q.choices.map((choice, ci) => (
                    <div key={ci} className={`flex items-center gap-2 rounded px-3 py-2 text-xs ${choice === q.answer ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 font-semibold" : "bg-white text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                      {choice === q.answer && <CheckCircle className="h-3 w-3 flex-shrink-0" />}
                      {choice}
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="mt-2 text-xs text-slate-400 italic">{q.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quiz results table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Résultats de tous les étudiants</h2>
          <button onClick={loadStats} className="flex items-center gap-1.5 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Rafraîchir
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#FF6B00]" /></div>
        ) : stats.length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-slate-50 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <Brain className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Aucun résultat de quiz pour le moment.</p>
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Étudiant</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Cours</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Rép. correctes</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Temps</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{r.user_name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{r.course_title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${
                        r.score >= 80 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" :
                        r.score >= 60 ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                        "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      }`}>
                        {r.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.n_correct}/{r.n_questions}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.time_spent_sec}s</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab({ onNavigateSettings }: { onNavigateSettings: () => void }) {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const load = useCallback(() => {
    setLoading(true); setError(null);
    apiGetAdminUsers().then(setUsers).catch((e) => setError(e instanceof Error ? e.message : "Erreur")).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(CONFIRM_CLOSED);

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    setUpdatingId(user.id);
    try {
      const updated = await apiUpdateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, role: updated.role } : u));
    } catch (e) { toastSonner.error(e instanceof Error ? e.message : "Erreur lors du changement de rôle"); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = (user: AdminUser) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer cet utilisateur ?",
      description: `« ${user.email} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      onConfirm: async () => {
        setConfirmDialog(CONFIRM_CLOSED);
        setDeletingId(user.id);
        try { await apiDeleteUser(user.id); setUsers((prev) => prev.filter((u) => u.id !== user.id)); }
        catch (e) { toastSonner.error(e instanceof Error ? e.message : "Erreur lors de la suppression"); setDeletingId(null); }
      },
    });
  };

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Gestion des utilisateurs</h1>
          <p className="mt-1 text-sm text-slate-400">{users.length} utilisateurs inscrits</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={onNavigateSettings} className="flex items-center gap-2 bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white hover:bg-[#e56000] rounded-sm">
            <UserPlus className="h-4 w-4" /> Créer un utilisateur
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-white flex-1"
        />
        <div className="flex gap-1">
          {["all", "student", "professor", "admin"].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 text-xs font-semibold border transition-colors rounded-sm ${
                roleFilter === r
                  ? "bg-[#FF6B00] text-white border-[#FF6B00]"
                  : "border-slate-200 text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700"
              }`}>
              {r === "all" ? "Tous" : r === "student" ? "Étudiants" : r === "professor" ? "Profs" : "Admins"}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-950">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">Aucun utilisateur trouvé.</p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Inscriptions</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((user) => {
                const rc = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.student;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400">#{user.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6B00]/10 text-xs font-bold text-[#FF6B00]">
                          {(user.name || user.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{user.name || "—"}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        disabled={updatingId === user.id}
                        className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold border-0 outline-none cursor-pointer ${rc.color}`}
                      >
                        <option value="student">Étudiant</option>
                        <option value="professor">Professeur</option>
                        <option value="admin">Admin</option>
                      </select>
                      {updatingId === user.id && <Loader2 className="inline-block ml-1 h-3 w-3 animate-spin text-[#FF6B00]" />}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{user.enrollment_count}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(user)} disabled={deletingId === user.id} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 disabled:opacity-50 ml-auto transition-colors">
                        {deletingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(CONFIRM_CLOSED)} />
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "student" });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const handleCreate = async () => {
    if (!form.email || !form.password) { setError("Email et mot de passe requis."); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const created = await apiAdminCreateUser(form);
      setSuccess(`✓ Utilisateur créé : ${created.email} (${created.role})`);
      setForm({ email: "", name: "", password: "", role: "student" });
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur lors de la création"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-400">Gestion avancée de la plateforme.</p>
      </div>

      {/* Create user */}
      <div className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B00]/10">
            <UserPlus className="h-4 w-4 text-[#FF6B00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Créer un utilisateur</h2>
            <p className="text-xs text-slate-400">Créez des comptes admin, professeur ou étudiant directement.</p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {success && (
            <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              <CheckCircle className="h-4 w-4 flex-shrink-0" /> {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Email *">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="prenom@domaine.com" className={inputCls} />
            </FormField>
            <FormField label="Nom complet">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Prénom Nom" className={inputCls} />
            </FormField>
            <FormField label="Mot de passe *">
              <div className="relative">
                <input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 caractères" className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <FormField label="Rôle">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
                <option value="student">Étudiant</option>
                <option value="professor">Professeur</option>
                <option value="admin">Administrateur</option>
              </select>
            </FormField>
          </div>

          <div className="flex justify-end">
            <button onClick={handleCreate} disabled={saving || !form.email || !form.password} className="flex items-center gap-2 bg-[#FF6B00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e56000] disabled:opacity-50 rounded-sm transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Créer l'utilisateur
            </button>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="border border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <Shield className="h-4 w-4 text-[#FF6B00]" /> Compte admin par défaut
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Un compte admin par défaut est créé automatiquement au démarrage si aucun admin n'existe.
        </p>
        <div className="mt-3 space-y-1 font-mono text-xs">
          <p className="text-slate-600 dark:text-slate-300"><span className="text-slate-400">Email :</span> admin@zentrix.academy</p>
          <p className="text-slate-600 dark:text-slate-300"><span className="text-slate-400">Mot de passe :</span> Admin@Zentrix2025</p>
        </div>
        <p className="mt-3 text-xs text-slate-400">Changez ce mot de passe après la première connexion via Paramètres du profil.</p>
      </div>
    </div>
  );
}

// ── Library Tab ───────────────────────────────────────────────────────────────

function LibraryTab() {
  const [resources, setResources] = useState<LibraryBook[]>([]);
  const [courses, setCourses]     = useState<CatalogueCourse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<LibraryBook | null>(null);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]       = useState("");
  const fileRef  = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  type FormData = {
    title: string; author: string; description: string; cover_image: string;
    category: string; page_count: number; language: string; read_url: string;
    download_url: string; file_url: string; resource_type: string; tags: string;
    course_id: number | null; is_published: boolean;
  };
  const emptyForm: FormData = {
    title: "", author: "", description: "", cover_image: "", category: "",
    page_count: 0, language: "Français", read_url: "", download_url: "",
    file_url: "", resource_type: "book", tags: "", course_id: null, is_published: true,
  };
  const [form, setForm] = useState<FormData>(emptyForm);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([apiGetLibraryAllAdmin(), apiGetCatalogueAllAdmin()])
      .then(([res, crs]) => { setResources(res); setCourses(crs); })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "file_url" | "cover_image",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await apiUploadLibraryFile(file);
      if (field === "file_url") {
        setForm(f => ({ ...f, file_url: result.url, download_url: result.url }));
        toast({ title: "Fichier uploadé", description: result.filename });
      } else {
        setForm(f => ({ ...f, cover_image: result.url }));
        toast({ title: "Image uploadée" });
      }
    } catch {
      toast({ title: "Erreur upload", description: "L'upload a échoué.", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await apiUpdateLibraryResource(editing.id, form);
        setResources(prev => prev.map(r => r.id === updated.id ? updated : r));
        toast({ title: "Ressource modifiée" });
      } else {
        const created = await apiCreateLibraryResource(form);
        setResources(prev => [created, ...prev]);
        toast({ title: "Ressource ajoutée" });
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<ConfirmDialogState>(CONFIRM_CLOSED);

  const handleDelete = (id: number) => {
    setDeleteConfirm({
      open: true,
      title: "Supprimer cette ressource ?",
      description: "Cette ressource sera définitivement supprimée de la bibliothèque.",
      confirmLabel: "Supprimer",
      onConfirm: async () => {
        setDeleteConfirm(CONFIRM_CLOSED);
        try {
          await apiDeleteLibraryResource(id);
          setResources(prev => prev.filter(r => r.id !== id));
          toast({ title: "Supprimé" });
        } catch {
          toast({ title: "Erreur suppression", variant: "destructive" });
        }
      },
    });
  };

  const startEdit = (r: LibraryBook) => {
    setEditing(r);
    setForm({
      title: r.title, author: r.author, description: r.description,
      cover_image: r.cover_image, category: r.category, page_count: r.page_count,
      language: r.language, read_url: r.read_url, download_url: r.download_url,
      file_url: r.file_url, resource_type: r.resource_type, tags: r.tags,
      course_id: r.course_id, is_published: r.is_published,
    });
    setShowForm(true);
  };

  const filtered = resources.filter(r =>
    !search.trim() ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.author.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase()),
  );

  const RESOURCE_TYPES = [
    { value: "book",    label: "Livre" },
    { value: "pdf",     label: "PDF" },
    { value: "video",   label: "Vidéo" },
    { value: "article", label: "Article" },
    { value: "link",    label: "Lien" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bibliothèque</h2>
          <p className="mt-0.5 text-sm text-slate-500">{resources.length} ressource{resources.length !== 1 ? "s" : ""} au total</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white hover:bg-[#e56000] rounded-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter une ressource
          </button>
        )}
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">{error}</div>}

      {/* ── Add / Edit Form ─────────────────────────────────────────── */}
      {showForm && (
        <div className="border border-[#FF6B00]/30 bg-orange-50/30 p-5 dark:bg-[#FF6B00]/5 rounded-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-[#FF6B00]">
              {editing ? "Modifier la ressource" : "Nouvelle ressource"}
            </p>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>
              <X className="h-4 w-4 text-slate-400 hover:text-slate-700" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Titre *">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Ex: Clean Code" />
            </FormField>
            <FormField label="Auteur">
              <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className={inputCls} placeholder="Ex: Robert C. Martin" />
            </FormField>
            <FormField label="Catégorie">
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls} placeholder="Ex: Développement, Data Science…" />
            </FormField>
            <FormField label="Type de ressource">
              <select value={form.resource_type} onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))} className={inputCls}>
                {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Langue">
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className={inputCls}>
                <option>Français</option>
                <option>Anglais</option>
                <option>Autre</option>
              </select>
            </FormField>
            <FormField label="Nombre de pages">
              <input type="number" min={0} value={form.page_count} onChange={e => setForm(f => ({ ...f, page_count: Number(e.target.value) }))} className={inputCls} />
            </FormField>

            {/* Course association */}
            <FormField label="Associer à un cours (optionnel)">
              <select
                value={form.course_id ?? ""}
                onChange={e => setForm(f => ({ ...f, course_id: e.target.value ? Number(e.target.value) : null }))}
                className={inputCls}
              >
                <option value="">— Aucun cours —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </FormField>
            {form.course_id ? (
              <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400 rounded-sm">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                Affiché à la fin du cours associé.
              </div>
            ) : (
              <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 rounded-sm">
                <BookMarked className="h-3.5 w-3.5 flex-shrink-0" />
                Visible uniquement dans la bibliothèque.
              </div>
            )}

            <div className="sm:col-span-2">
              <FormField label="Description">
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Décrivez le contenu…" />
              </FormField>
            </div>

            {/* File upload */}
            <div className="sm:col-span-2">
              <FormField label="Fichier PDF / Document (upload Supabase Storage)">
                <div className="flex flex-wrap items-center gap-3">
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.pptx,.epub" className="hidden" onChange={e => handleFileUpload(e, "file_url")} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 rounded-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Choisir un fichier
                  </button>
                  {form.file_url && (
                    <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-[#FF6B00] hover:underline max-w-xs">
                      {form.file_url.split("/").pop()}
                    </a>
                  )}
                </div>
                {form.file_url && <p className="mt-1 text-[11px] text-slate-400">URL de téléchargement définie automatiquement.</p>}
              </FormField>
            </div>

            <FormField label="URL de lecture (lien externe)">
              <input value={form.read_url} onChange={e => setForm(f => ({ ...f, read_url: e.target.value }))} className={inputCls} placeholder="https://…" />
            </FormField>
            <FormField label="URL de téléchargement">
              <input value={form.download_url} onChange={e => setForm(f => ({ ...f, download_url: e.target.value }))} className={inputCls} placeholder="Auto-rempli après upload" />
            </FormField>

            {/* Cover image */}
            <div className="sm:col-span-2">
              <FormField label="Image de couverture">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-1.5">
                    <input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} className={inputCls} placeholder="URL ou uploadez une image…" />
                    <div className="flex items-center gap-2">
                      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "cover_image")} />
                      <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Upload className="h-3 w-3" /> Uploader une image
                      </button>
                    </div>
                  </div>
                  {form.cover_image && (
                    <img src={form.cover_image} alt="" className="h-16 w-12 rounded object-cover border border-slate-200" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
              </FormField>
            </div>

            <FormField label="Tags (séparés par des virgules)">
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className={inputCls} placeholder="python, data, analyse…" />
            </FormField>
            <FormField label="Statut de publication">
              <div className="flex h-9 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_published ? "bg-[#FF6B00]" : "bg-slate-200 dark:bg-slate-700"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_published ? "translate-x-4" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">{form.is_published ? "Visible dans la bibliothèque" : "Masqué"}</span>
              </div>
            </FormField>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }} className="border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving || !form.title.trim()} className="flex items-center gap-1.5 bg-[#FF6B00] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#e56000] disabled:opacity-50 rounded-sm">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {editing ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────────────── */}
      {!showForm && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un titre, auteur, catégorie…" className={`${inputCls} pl-9`} />
        </div>
      )}

      {/* ── Resource list ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF6B00]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400 dark:border-slate-700">
          Aucune ressource trouvée.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Ressource</th>
                <th className="hidden px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:table-cell">Type</th>
                <th className="hidden px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 lg:table-cell">Cours associé</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Statut</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(r => {
                const associatedCourse = courses.find(c => c.id === r.course_id);
                return (
                  <tr key={r.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.cover_image ? (
                          <img src={r.cover_image} alt="" className="h-10 w-7 flex-shrink-0 rounded object-cover border border-slate-100" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="flex h-10 w-7 flex-shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                            <BookMarked className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{r.title}</p>
                          <p className="truncate text-xs text-slate-400">{r.author || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {r.resource_type}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {associatedCourse ? (
                        <span className="inline-flex max-w-[180px] items-center gap-1 truncate text-xs font-medium text-[#FF6B00]">
                          <GraduationCap className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{associatedCourse.title}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${r.is_published ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                        {r.is_published ? "Publié" : "Masqué"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {(r.read_url || r.file_url) && (
                          <a href={r.read_url || r.file_url} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 rounded-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={() => startEdit(r)} className="flex h-7 w-7 items-center justify-center border border-slate-200 text-slate-400 hover:border-[#FF6B00]/30 hover:text-[#FF6B00] dark:border-slate-700 rounded-sm">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="flex h-7 w-7 items-center justify-center border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 dark:border-slate-700 rounded-sm">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog {...deleteConfirm} onCancel={() => setDeleteConfirm(CONFIRM_CLOSED)} />
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex min-h-full bg-slate-50 dark:bg-slate-950">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="hidden w-56 flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:flex lg:flex-col">
        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex h-8 w-8 items-center justify-center bg-[#FF6B00]">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white">ADMIN</p>
            <p className="text-[10px] text-slate-400">Zentrix Academy</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3 pt-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                tab === item.id
                  ? "bg-[#FF6B00]/10 text-[#FF6B00]"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <span className={tab === item.id ? "text-[#FF6B00]" : "text-slate-400"}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <p className="text-[10px] text-slate-400 text-center">Zentrix Academy v4.0</p>
        </div>
      </aside>

      {/* ── Mobile Tab Bar ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${tab === item.id ? "text-[#FF6B00]" : "text-slate-400"}`}>
            {item.icon}
            <span className="hidden sm:block">{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-6 pb-20 lg:pb-6">
        {tab === "overview"  && <OverviewTab  onNavigate={setTab} />}
        {tab === "courses"   && <CoursesTab />}
        {tab === "quizzes"   && <QuizzesTab />}
        {tab === "users"     && <UsersTab onNavigateSettings={() => setTab("settings")} />}
        {tab === "library"   && <LibraryTab />}
        {tab === "settings"  && <SettingsTab />}
      </main>
    </div>
  );
}
