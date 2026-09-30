// Copie Zentrix Academy : src/pages/NotesPage.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog, CONFIRM_CLOSED, type ConfirmDialogState } from "@/components/ui/confirm-dialog";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  AlignLeft, Archive, BookOpen, Calendar, Check, ChevronLeft, Clock, FileUp, Folder,
  FolderPlus, Lightbulb, Loader2, MoreHorizontal, Pencil, Plus, Search, Sparkles,
  Star, StickyNote, Trash2, Upload, X, FileText, GraduationCap,
} from "lucide-react";
import {
  type BackendNote, type BackendNoteFolder,
  apiGetNotes, apiGetTrashNotes, apiGetNoteFolders, apiCreateNoteFolder,
  apiCreateNote, apiUpdateNote, apiDeleteNote,
  apiRestoreNote, apiPermanentlyDeleteNote, isAuthenticated,
} from "@/lib/api-client";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateLong(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
      year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

function formatDateShort(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    const d   = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000)     return "À l'instant";
    if (diff < 3_600_000)  return `Il y a ${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)}h`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch { return ""; }
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

// ── Note list item ────────────────────────────────────────────────────────────
function NoteListItem({
  note, active, favorite, onClick, onToggleFavorite,
}: { note: BackendNote; active: boolean; favorite: boolean; onClick: () => void; onToggleFavorite: () => void }) {
  const title = note.titre.toLowerCase();
  const tag = title.includes("révision") || title.includes("revision") ? "Révisions" : title.includes("cours") ? "Cours" : "Notes";
  return (
    <button
      onClick={onClick}
      className={`group mx-3 mb-1.5 w-[calc(100%-1.5rem)] rounded-lg border px-3 py-2.5 text-left transition-colors ${
        active
          ? "border-blue-500 bg-blue-50/70 shadow-sm dark:border-blue-400/60 dark:bg-blue-400/10"
          : "border-slate-200 hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded ${
          active ? "bg-[#FF6B00] text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
        }`}>
          <FileText className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold leading-tight ${
            active ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-white"
          }`}>
            {note.titre || "Sans titre"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            {note.contenu || "Aucun contenu"}
          </p>
          <p className="mt-1.5 text-[10px] text-slate-300 dark:text-slate-600">
            {formatDateShort(note.updated_at)}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">{tag}</span>
        </div>
        <span className="mt-1 flex shrink-0 items-center gap-1 text-slate-300 dark:text-slate-600">
          <span role="button" tabIndex={0} aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={event => { event.stopPropagation(); onToggleFavorite(); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onToggleFavorite(); } }} className={`rounded p-0.5 transition ${favorite ? "text-amber-400" : "opacity-0 group-hover:opacity-100 hover:text-amber-400"}`}><Star className="h-3.5 w-3.5" fill={favorite ? "currentColor" : "none"} /></span>
          <MoreHorizontal className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
        </span>
      </div>
    </button>
  );
}

// ── Empty panel ───────────────────────────────────────────────────────────────
function EmptyPanel({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-6 text-center sm:p-10">
      <div className="relative flex h-36 w-64 items-center justify-center">
        <div className="absolute left-5 top-7 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-500 shadow-sm dark:border-slate-700 dark:bg-slate-900"><Lightbulb className="h-4 w-4" /></div>
        <div className="absolute right-5 top-1 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-violet-600 shadow-sm dark:border-slate-700 dark:bg-slate-900"><Sparkles className="h-4 w-4" /></div>
        <div className="absolute bottom-5 left-9 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-white text-emerald-500 shadow-sm dark:border-slate-700 dark:bg-slate-900"><GraduationCap className="h-4 w-4" /></div>
        <div className="absolute bottom-5 right-7 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-500 shadow-sm dark:border-slate-700 dark:bg-slate-900"><BookOpen className="h-4 w-4" /></div>
        <div className="relative flex h-28 w-24 items-center justify-center rounded-xl border border-blue-100 bg-white shadow-[0_12px_40px_rgba(37,99,235,0.14)] dark:border-slate-700 dark:bg-slate-900"><FileText className="h-14 w-14 text-blue-500" /><Pencil className="absolute bottom-1 right-0 h-10 w-10 rotate-[18deg] fill-blue-500 text-blue-700" /></div>
      </div>
      <div className="space-y-1.5"><p className="text-lg font-bold text-slate-900 dark:text-white">Commencez à capturer vos idées</p><p className="mx-auto max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">Sélectionnez une note dans la liste ou créez-en une nouvelle pour commencer. Vos notes vous accompagnent dans tout votre parcours d’apprentissage.</p></div>
      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[{ icon: Plus, title: "Nouvelle note", text: "Écrivez et organisez vos idées", action: onNew }, { icon: Upload, title: "Importer un document", text: "PDF, Word ou autre fichier", action: () => toast.info("L’import de document sera connecté à la bibliothèque.") }, { icon: Sparkles, title: "Créer un résumé IA", text: "Générez un résumé de vos contenus", action: () => toast.info("Sélectionnez une note pour lancer son résumé IA.") }, { icon: Folder, title: "Organiser par dossier", text: "Classez vos notes simplement", action: () => toast.info("Créez un dossier depuis le bouton Nouveau dossier.") }].map(({ icon: Icon, title, text, action }) => <button key={title} type="button" onClick={action} className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"><Icon className="h-3.5 w-3.5" /></span><p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-100">{title}</p><p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{text}</p></button>)}
      </div>
      <div className="w-full max-w-3xl border-t border-slate-200 pt-4 text-left dark:border-slate-800"><p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400"><Lightbulb className="h-4 w-4 text-slate-500" />Quelques conseils pour bien démarrer</p><div className="mt-4 grid gap-4 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-3"><span className="flex items-center justify-center gap-2"><Check className="h-4 w-4 rounded-full bg-blue-50 p-0.5 text-blue-500" />Prenez des notes pendant vos cours</span><span className="flex items-center justify-center gap-2"><Check className="h-4 w-4 rounded-full bg-blue-50 p-0.5 text-blue-500" />Organisez-les par dossier</span><span className="flex items-center justify-center gap-2"><Check className="h-4 w-4 rounded-full bg-blue-50 p-0.5 text-blue-500" />Utilisez l’IA pour résumer vos contenus</span></div></div>
    </div>
  );
}

// ── Note viewer (read mode) ───────────────────────────────────────────────────
function NoteViewer({
  note, onEdit, onDelete, onRestore, onPermanentDelete, deleting, trash,
}: {
  note: BackendNote;
  onEdit: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  deleting: boolean;
  trash?: boolean;
}) {
  const lines = note.contenu?.split("\n") ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="min-w-0 flex-1 pr-4">
          <h1 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
            {note.titre}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Modifié {formatDateShort(note.updated_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Créé {formatDateShort(note.created_at)}
            </span>
            {note.contenu && (
              <span className="flex items-center gap-1">
                <AlignLeft className="h-3 w-3" />
                {wordCount(note.contenu)} mots
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {trash ? <button onClick={() => onRestore?.()} disabled={deleting} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"><Archive className="h-3.5 w-3.5" />Restaurer</button> : <button onClick={onEdit} className="flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Pencil className="h-3.5 w-3.5" />Modifier</button>}
          <button
            onClick={() => trash ? onPermanentDelete?.() : onDelete()}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-red-900/20"
          >
            {deleting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {note.contenu ? (
          <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300">
            {lines.map((line, i) =>
              line.trim() === "" ? (
                <div key={i} className="h-3" />
              ) : (
                <p key={i} className="mb-0 leading-relaxed">{line}</p>
              )
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm italic text-slate-300 dark:text-slate-600">Cette note est vide.</p>
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center border-t border-slate-100 px-6 py-2.5 dark:border-slate-800">
        <p className="text-[11px] text-slate-300 dark:text-slate-600">
          {formatDateLong(note.updated_at)}
        </p>
      </div>
    </div>
  );
}

// ── Note editor (controlled) ──────────────────────────────────────────────────
function NoteEditor({
  title,
  content,
  folder,
  folders,
  onChangeTitle,
  onChangeContent,
  onChangeFolder,
  onSave,
  onCancel,
  saving,
  autoSaveStatus,
  isNew,
}: {
  title: string;
  content: string;
  folder: string;
  folders: BackendNoteFolder[];
  onChangeTitle: (v: string) => void;
  onChangeContent: (v: string) => void;
  onChangeFolder: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  autoSaveStatus: AutoSaveStatus;
  isNew: boolean;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(); }}
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-6 py-3.5 dark:border-slate-800">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
          <Pencil className="h-4 w-4 text-[#FF6B00]" />
          {isNew ? "Nouvelle note" : "Modifier la note"}
        </span>
        <div className="flex items-center gap-2">
          <select value={folder} onChange={event => onChangeFolder(event.target.value)} className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option value="all">Sans dossier</option><option value="courses">Mes cours</option><option value="projects">Projets personnels</option><option value="revision">Révisions</option>{folders.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 bg-[#FF6B00] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#e56000] disabled:opacity-50"
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Check className="h-3.5 w-3.5" />}
            {isNew ? "Créer" : "Sauvegarder"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex h-7 w-7 items-center justify-center border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 disabled:opacity-50 dark:border-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="flex-shrink-0 border-b border-slate-100 px-6 py-3 dark:border-slate-800">
        <input
          ref={titleRef}
          value={title}
          onChange={e => onChangeTitle(e.target.value)}
          placeholder="Titre de la note…"
          required
          disabled={saving}
          className="w-full bg-transparent text-lg font-bold text-slate-900 placeholder-slate-300 outline-none disabled:opacity-50 dark:text-white dark:placeholder-slate-600"
        />
      </div>

      {/* Content */}
      <textarea
        value={content}
        onChange={e => onChangeContent(e.target.value)}
        placeholder="Commencez à écrire votre note ici…"
        disabled={saving}
        className="min-h-0 flex-1 resize-none bg-transparent px-6 py-5 text-sm leading-relaxed text-slate-700 placeholder-slate-300 outline-none disabled:opacity-50 dark:text-slate-300 dark:placeholder-slate-600"
      />

      {/* Footer: word count + autosave indicator */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 px-6 py-2 dark:border-slate-800">
        <p className="text-[11px] text-slate-300 dark:text-slate-600">
          {wordCount(content)} mots · {content.length} caractères
          {!isNew && (
            <span className="ml-2 text-[10px] text-slate-200 dark:text-slate-700">· Ctrl+S pour sauvegarder</span>
          )}
        </p>

        {/* Autosave status — only for existing notes */}
        {!isNew && (
          <div className="flex items-center gap-1 text-[11px]">
            {autoSaveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                <span className="text-slate-400">Sauvegarde…</span>
              </>
            )}
            {autoSaveStatus === "saved" && (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">Sauvegardé</span>
              </>
            )}
            {autoSaveStatus === "error" && (
              <span className="text-red-400">Erreur de sauvegarde</span>
            )}
            {autoSaveStatus === "pending" && (
              <span className="text-slate-300 dark:text-slate-700">Non sauvegardé</span>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NotesPage({ onOpenAI }: { onOpenAI?: () => void }) {
  const navigate = useNavigate();
  const [notes,       setNotes]       = useState<BackendNote[]>([]);
  const [trashNotes,  setTrashNotes]  = useState<BackendNote[]>([]);
  const [folders,     setFolders]     = useState<BackendNoteFolder[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);
  const [mode,        setMode]        = useState<"view" | "edit" | "new">("view");
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [search,      setSearch]      = useState("");
  const [mobilePanel, setMobilePanel] = useState<"list" | "detail">("list");
  const [activeFilter, setActiveFilter] = useState<"all" | "recent" | "favorites">("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"recent" | "title">("recent");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Controlled editor state (lifted up from NoteEditor)
  const [editTitle,   setEditTitle]   = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolder,  setEditFolder]  = useState("all");
  const [isDirty,     setIsDirty]     = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");

  // Refs so doAutoSave always reads the latest values without stale closures
  const editTitleRef   = useRef(editTitle);
  const editContentRef = useRef(editContent);
  const editFolderRef  = useRef(editFolder);
  const selectedIdRef  = useRef(selectedId);
  const modeRef        = useRef(mode);
  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { editTitleRef.current   = editTitle;   }, [editTitle]);
  useEffect(() => { editContentRef.current = editContent; }, [editContent]);
  useEffect(() => { editFolderRef.current  = editFolder;  }, [editFolder]);
  useEffect(() => { selectedIdRef.current  = selectedId;  }, [selectedId]);
  useEffect(() => { modeRef.current        = mode;        }, [mode]);

  const authenticated = isAuthenticated();

  const classifyNote = (note: BackendNote) => {
    if (note.folder && note.folder !== "all") return note.folder;
    const title = note.titre.toLowerCase();
    if (title.includes("cours")) return "courses";
    if (title.includes("projet") || title.includes("idée") || title.includes("idee")) return "projects";
    if (title.includes("révision") || title.includes("revision") || title.includes("examen")) return "revision";
    return "all";
  };

  const toggleFavorite = async (id: number) => {
    const nextFavorite = !favoriteIds.includes(id);
    try {
      const updated = await apiUpdateNote(id, { is_favorite: nextFavorite });
      setNotes(previous => previous.map(note => note.id === id ? updated : note));
      setFavoriteIds(previous => nextFavorite ? [...previous, id] : previous.filter(item => item !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de modifier le favori");
    }
  };

  // Load notes ──────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    Promise.all([apiGetNotes(), apiGetTrashNotes(), apiGetNoteFolders()])
      .then(([data, deleted, folderData]) => {
        setNotes(data);
        setTrashNotes(deleted);
        setFolders(folderData);
        setFavoriteIds(data.filter(note => note.is_favorite).map(note => note.id));
        setSelectedId(prev => prev ?? (data.length > 0 ? data[0].id : null));
      })
      .catch(e => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [authenticated]);

  useEffect(() => { load(); }, [load]);

  const selectedNote = [...notes, ...trashNotes].find(n => n.id === selectedId) ?? null;

  useSetPageContext({
    current_page: "notes",
    page_title:   "Mes notes",
    page_data: {
      notes_count:          notes.length,
      current_note_id:      selectedNote?.id ?? null,
      current_note_title:   selectedNote?.titre ?? null,
      current_note_excerpt: selectedNote?.contenu?.slice(0, 200) ?? null,
    },
  });

  // Autosave (stable — uses refs, no deps) ──────────────────────────────────
  const doAutoSave = useCallback(async () => {
    const id      = selectedIdRef.current;
    const title   = editTitleRef.current.trim();
    const content = editContentRef.current;
    if (!id || !title) return;
    setAutoSaveStatus("saving");
    try {
      const updated = await apiUpdateNote(id, { titre: title, contenu: content, folder: editFolderRef.current });
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
      setIsDirty(false);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus(s => s === "saved" ? "idle" : s), 3000);
    } catch {
      setAutoSaveStatus("error");
    }
  }, []);

  // Ctrl+S handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "edit") return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        void doAutoSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, doAutoSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  // Field change handler with debounced autosave ────────────────────────────
  const handleFieldChange = (field: "title" | "content", value: string) => {
    if (field === "title") setEditTitle(value);
    else setEditContent(value);
    setIsDirty(true);
    if (modeRef.current === "edit") {
      setAutoSaveStatus("pending");
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(doAutoSave, 2500);
    }
  };

  const handleFolderChange = (value: string) => {
    setEditFolder(value);
    setIsDirty(true);
    if (modeRef.current === "edit") {
      setAutoSaveStatus("pending");
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(doAutoSave, 2500);
    }
  };

  // Enter edit mode ─────────────────────────────────────────────────────────
  const startEdit = (note: BackendNote) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setEditTitle(note.titre);
    setEditContent(note.contenu ?? "");
    setEditFolder(note.folder || "all");
    setIsDirty(false);
    setAutoSaveStatus("idle");
    setMode("edit");
  };

  // Enter new mode ──────────────────────────────────────────────────────────
  const startNew = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (modeRef.current === "edit" && isDirty) void doAutoSave();
    setEditTitle("");
    setEditContent("");
    setEditFolder("all");
    setIsDirty(false);
    setAutoSaveStatus("idle");
    setMode("new");
    setSelectedId(null);
    setMobilePanel("detail");
  };

  // Select a note (auto-saves current edit before switching) ────────────────
  const handleSelectNote = async (id: number) => {
    if (modeRef.current === "edit" && isDirty && selectedIdRef.current && id !== selectedIdRef.current) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      await doAutoSave();
    }
    setSelectedId(id);
    setMode("view");
    setMobilePanel("detail");
  };

  // Cancel edit ─────────────────────────────────────────────────────────────
  const handleCancelEdit = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setIsDirty(false);
    setAutoSaveStatus("idle");
    setMode("view");
  };

  // Cancel new ──────────────────────────────────────────────────────────────
  const handleCancelNew = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setIsDirty(false);
    setAutoSaveStatus("idle");
    setMode("view");
    if (notes.length > 0 && !selectedId) setSelectedId(notes[0].id);
    setMobilePanel("list");
  };

  // Create note ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const note = await apiCreateNote({ titre: editTitle.trim(), contenu: editContent, folder: editFolder });
      setNotes(prev => [note, ...prev]);
      setSelectedId(note.id);
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de création");
    } finally {
      setSaving(false);
    }
  };

  // Manual save (button click) — saves + exits edit mode ────────────────────
  const handleManualSave = async () => {
    if (mode === "new") { await handleCreate(); return; }
    if (!selectedId || !editTitle.trim()) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    setAutoSaveStatus("saving");
    try {
      const updated = await apiUpdateNote(selectedId, { titre: editTitle.trim(), contenu: editContent, folder: editFolder });
      setNotes(prev => prev.map(n => n.id === selectedId ? updated : n));
      setIsDirty(false);
      setAutoSaveStatus("idle");
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de mise à jour");
      setAutoSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(CONFIRM_CLOSED);

  // Delete note ─────────────────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer cette note ?",
      description: "La note sera déplacée dans la corbeille et pourra être restaurée.",
      confirmLabel: "Déplacer",
      onConfirm: async () => {
        setConfirmDialog(CONFIRM_CLOSED);
        setDeletingId(id);
        try {
          const response = await apiDeleteNote(id);
          const remaining = notes.filter(n => n.id !== id);
          setNotes(remaining);
          if (response && "note" in response && response.note) setTrashNotes(previous => [response.note as BackendNote, ...previous]);
          setSelectedId(remaining.length > 0 ? remaining[0].id : null);
          setMode("view");
          setMobilePanel("list");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erreur de suppression");
          setError(e instanceof Error ? e.message : "Erreur de suppression");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleRestore = async (id: number) => {
    setDeletingId(id);
    try {
      const restored = await apiRestoreNote(id);
      setTrashNotes(previous => previous.filter(note => note.id !== id));
      setNotes(previous => [restored, ...previous]);
      setSelectedId(restored.id);
      setFolderFilter("all");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de restaurer la note"); }
    finally { setDeletingId(null); }
  };

  const handlePermanentDelete = (id: number) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer définitivement cette note ?",
      description: "Cette action est irréversible. Le contenu ne pourra plus être récupéré.",
      confirmLabel: "Supprimer définitivement",
      onConfirm: async () => {
        setConfirmDialog(CONFIRM_CLOSED); setDeletingId(id);
        try { await apiPermanentlyDeleteNote(id); setTrashNotes(previous => previous.filter(note => note.id !== id)); setSelectedId(null); setMobilePanel("list"); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Erreur de suppression définitive"); }
        finally { setDeletingId(null); }
      },
    });
  };

  const handleCreateFolder = async () => {
    const name = window.prompt("Nom du nouveau dossier");
    if (!name?.trim()) return;
    try {
      const folder = await apiCreateNoteFolder(name.trim());
      setFolders(previous => [...previous, folder].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      setFolderFilter(folder.name);
      toast.success("Dossier créé");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de créer le dossier"); }
  };

  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const folderCounts = {
    courses: notes.filter(note => classifyNote(note) === "courses").length,
    projects: notes.filter(note => classifyNote(note) === "projects").length,
    revision: notes.filter(note => classifyNote(note) === "revision").length,
  };
  const filteredNotes = notes
    .filter(note => !search.trim() || note.titre.toLowerCase().includes(search.toLowerCase()) || note.contenu?.toLowerCase().includes(search.toLowerCase()))
    .filter(note => activeFilter === "all" || (activeFilter === "favorites" ? favoriteIds.includes(note.id) : new Date(note.updated_at || note.created_at || 0).getTime() >= recentCutoff))
    .filter(note => folderFilter === "all" || (folderFilter !== "trash" && classifyNote(note) === folderFilter))
    .sort((a, b) => sortOrder === "title" ? a.titre.localeCompare(b.titre, "fr") : new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  const visibleNotes = folderFilter === "trash" ? trashNotes : filteredNotes;

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) toast.info("L’import de document sera connecté à la bibliothèque prochainement.");
    event.target.value = "";
  };

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-5 p-10 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20">
          <StickyNote className="h-9 w-9 text-[#FF6B00]/60" />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">
            Connectez-vous pour accéder à vos notes
          </p>
          <p className="text-sm text-slate-400">Vos notes personnelles seront disponibles ici.</p>
        </div>
      </div>
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] flex-col bg-white dark:bg-slate-950">

      {/* Page header */}
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-7 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <StickyNote className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Mes Notes</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {loading ? "Chargement…" : `${notes.length} note${notes.length !== 1 ? "s" : ""} · ${folders.length} dossier${folders.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && <div className="hidden items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 lg:flex dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}<button onClick={() => setError(null)}><X className="h-3.5 w-3.5" /></button></div>}
          <input ref={importInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleImport} />
          <button onClick={() => importInputRef.current?.click()} className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 sm:flex dark:border-slate-700 dark:text-slate-300"><FileUp className="h-3.5 w-3.5" />Importer</button>
          <button onClick={() => void handleCreateFolder()} className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 md:flex dark:border-slate-700 dark:text-slate-300"><FolderPlus className="h-3.5 w-3.5" />Nouveau dossier</button>
          <button onClick={startNew} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Nouvelle note</button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left panel — note list */}
        <div className={`${mobilePanel === "list" ? "flex" : "hidden"} sm:flex w-full flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:w-[320px] xl:w-[340px]`}>
          {/* Search + new */}
          <div className="flex-shrink-0 border-b border-slate-100 p-3 dark:border-slate-800">
            <div className="relative mb-2.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une note…"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-8 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[{ id: "all", label: "Toutes" }, { id: "recent", label: "Récentes" }, { id: "favorites", label: "Favoris" }].map(tab => <button key={tab.id} onClick={() => setActiveFilter(tab.id as typeof activeFilter)} className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${activeFilter === tab.id ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300" : "text-slate-500"}`}>{tab.label}</button>)}
            </div>
            <div className="mt-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Dossiers</p><select value={sortOrder} onChange={event => setSortOrder(event.target.value as typeof sortOrder)} className="bg-transparent text-[10px] text-slate-400 outline-none"><option value="recent">Plus récentes</option><option value="title">A-Z</option></select></div>
            <div className="mt-1 space-y-0.5">
              {[{ id: "all", label: "Toutes les notes", count: notes.length, icon: StickyNote }, { id: "courses", label: "Mes cours", count: folderCounts.courses, icon: BookOpen }, { id: "projects", label: "Projets personnels", count: folderCounts.projects, icon: Folder }, { id: "revision", label: "Révisions", count: folderCounts.revision, icon: Archive }, ...folders.map(folder => ({ id: folder.name, label: folder.name, count: folder.note_count, icon: Folder })), { id: "trash", label: "Corbeille", count: trashNotes.length, icon: Trash2 }].map(folder => { const Icon = folder.icon; return <button key={folder.id} onClick={() => { setFolderFilter(folder.id); setSelectedId(folder.id === "trash" ? (trashNotes[0]?.id ?? null) : selectedId); }} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition ${folderFilter === folder.id ? "bg-blue-50 font-semibold text-blue-600 dark:bg-blue-400/10 dark:text-blue-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{folder.label}</span><span className="text-[10px] text-slate-400">{folder.count}</span></button>; })}
            </div>
            <button onClick={startNew} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Nouvelle note</button>
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#FF6B00]" />
              </div>
            ) : visibleNotes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                {search ? (
                  <>
                    <Search className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                    <p className="text-xs text-slate-400">Aucun résultat pour «{search}»</p>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                    <p className="text-xs text-slate-400">{folderFilter === "trash" ? "La corbeille est vide" : "Aucune note pour l'instant"}</p>
                  </>
                )}
              </div>
            ) : (
              visibleNotes.map(note => (
                  <NoteListItem
                  key={note.id}
                  note={note}
                  active={selectedId === note.id && mode !== "new"}
                  favorite={favoriteIds.includes(note.id)}
                  onToggleFavorite={() => void toggleFavorite(note.id)}
                  onClick={() => void handleSelectNote(note.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel — viewer / editor */}
        <div className={`${mobilePanel === "detail" ? "flex" : "hidden"} sm:flex min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950`}>
          {/* Mobile back button */}
          <button
            className="sm:hidden flex flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 hover:text-[#FF6B00] transition-colors dark:border-slate-800 dark:text-slate-400"
            onClick={() => setMobilePanel("list")}
          >
            <ChevronLeft className="h-4 w-4" />
            Mes notes
          </button>
          <div className="min-h-0 flex-1 overflow-hidden">
            {mode === "new" ? (
              <NoteEditor
                title={editTitle}
                content={editContent}
                folder={editFolder}
                folders={folders}
                onChangeTitle={v => handleFieldChange("title", v)}
                onChangeContent={v => handleFieldChange("content", v)}
                onChangeFolder={handleFolderChange}
                onSave={handleManualSave}
                onCancel={handleCancelNew}
                saving={saving}
                autoSaveStatus={autoSaveStatus}
                isNew={true}
              />
            ) : mode === "edit" && selectedNote ? (
              <NoteEditor
                title={editTitle}
                content={editContent}
                folder={editFolder}
                folders={folders}
                onChangeTitle={v => handleFieldChange("title", v)}
                onChangeContent={v => handleFieldChange("content", v)}
                onChangeFolder={handleFolderChange}
                onSave={handleManualSave}
                onCancel={handleCancelEdit}
                saving={saving}
                autoSaveStatus={autoSaveStatus}
                isNew={false}
              />
            ) : selectedNote ? (
              <NoteViewer
                note={selectedNote}
                onEdit={() => startEdit(selectedNote)}
                onDelete={() => handleDelete(selectedNote.id)}
                onRestore={() => void handleRestore(selectedNote.id)}
                onPermanentDelete={() => handlePermanentDelete(selectedNote.id)}
                deleting={deletingId === selectedNote.id}
                trash={folderFilter === "trash"}
              />
            ) : (
              <EmptyPanel onNew={startNew} />
            )}
          </div>
        </div>
      </div>
      <button type="button" onClick={() => onOpenAI ? onOpenAI() : navigate("/dashboard/ai")} className="fixed bottom-5 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-600/30 transition hover:scale-105" aria-label="Ouvrir TESS AI">AI</button>
      <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(CONFIRM_CLOSED)} />
    </div>
  );
}
