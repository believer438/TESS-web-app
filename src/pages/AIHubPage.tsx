import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpen, Brain, Check, ChevronRight, Database, FileText,
  Folder, Grid2X2, History, Menu, MessageSquare, Moon, PanelLeftClose,
  PanelLeftOpen, RefreshCw, Save, Search, Settings, Sun, Trash2, UserRound, X,
} from "lucide-react";
import {
  apiDeleteConversation, apiGetAIMemory, apiGetAIPermissions, apiGetConversations,
  apiGetMe, apiGetMyCours, apiGetMyEnrollments, apiUpdateAIPermissions, apiUpdateMe,
  type AIPermissions, type AIConversation, type AIMemorySnapshot, type BackendCours, type UserProfile,
} from "@/lib/api-client";
import { useLanguage, type Lang } from "@/lib/i18n";
import { useTheme } from "@/hooks/useTheme";

export type AISection = "history" | "files" | "projects" | "memory" | "plugins" | "settings" | "profile";
type Section = AISection;

const sectionMeta: Record<Section, { title: string; description: string; icon: typeof MessageSquare; eyebrow: string }> = {
  history: { title: "Vos conversations", description: "Reprenez un fil là où vous l’avez laissé.", icon: History, eyebrow: "Votre atelier" },
  files: { title: "Documents de travail", description: "Les ressources que vous avez confiées à TESS.", icon: FileText, eyebrow: "Votre bibliothèque" },
  projects: { title: "Parcours suivis", description: "Les cours qui donnent du contexte à votre apprentissage.", icon: Folder, eyebrow: "Votre progression" },
  memory: { title: "Mémoire pédagogique", description: "Un aperçu de ce que TESS retient pour mieux vous accompagner.", icon: Brain, eyebrow: "Votre progression" },
  plugins: { title: "Accès de TESS", description: "Choisissez les espaces que TESS peut utiliser pour contextualiser son aide.", icon: Grid2X2, eyebrow: "Votre contrôle" },
  settings: { title: "Préférences", description: "Réglez l’apparence et la langue de votre espace TESS.", icon: Settings, eyebrow: "Votre espace" },
  profile: { title: "Votre profil d’apprentissage", description: "Quelques repères pour adapter le tutorat à votre façon d’apprendre.", icon: UserRound, eyebrow: "Votre profil" },
};

const hubNavItems: { label: string; icon: typeof MessageSquare; route: string; section: Section | null }[] = [
  { label: "Nouvelle conversation", icon: MessageSquare, route: "/dashboard/ai", section: null },
  { label: "Historique", icon: History, route: "/dashboard/ai/history", section: "history" },
  { label: "Mes documents", icon: FileText, route: "/dashboard/ai/files", section: "files" },
  { label: "Parcours suivis", icon: Folder, route: "/dashboard/ai/projects", section: "projects" },
  { label: "Mémoire", icon: Database, route: "/dashboard/ai/memory", section: "memory" },
  { label: "Accès de TESS", icon: Grid2X2, route: "/dashboard/ai/plugins", section: "plugins" },
  { label: "Préférences", icon: Settings, route: "/dashboard/ai/settings", section: "settings" },
  { label: "Profil", icon: UserRound, route: "/dashboard/ai/profile", section: "profile" },
];

function SkeletonRows() {
  return (
    <div className="space-y-3" aria-label="Chargement des données" aria-busy="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 rounded-2xl border border-[var(--tess-line)] p-4">
          <div className="sk h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="sk h-3 w-2/5 rounded-full" />
            <div className="sk h-2.5 w-1/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIHubPage({
  section,
  onClose,
  expanded = false,
}: {
  section: Section;
  onClose?: () => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const meta = sectionMeta[section];
  const Icon = meta.icon;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [files, setFiles] = useState<BackendCours[]>([]);
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof apiGetMyEnrollments>>>([]);
  const [memory, setMemory] = useState<AIMemorySnapshot | null>(null);
  const [permissions, setPermissions] = useState<AIPermissions | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AIConversation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const load = section === "history" ? apiGetConversations().then(value => { if (!cancelled) setConversations(value); })
      : section === "files" ? apiGetMyCours().then(value => { if (!cancelled) setFiles(value); })
      : section === "projects" ? apiGetMyEnrollments().then(value => { if (!cancelled) setProjects(value); })
      : section === "memory" ? apiGetAIMemory().then(value => { if (!cancelled) setMemory(value); })
      : section === "settings" || section === "plugins" ? apiGetAIPermissions().then(value => { if (!cancelled) setPermissions(value); })
      : apiGetMe().then(value => {
        if (!cancelled) {
          setUser(value);
          setName(value.full_name ?? "");
          setBio(value.bio ?? "");
        }
      });
    load.catch(() => {
      if (!cancelled) setError("Les données de TESS ne sont pas disponibles pour le moment.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [section, reloadKey]);

  useEffect(() => {
    if (!searchOpen) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      void apiGetConversations(searchQuery)
        .then(value => { if (!cancelled) setSearchResults(value); })
        .catch(() => { if (!cancelled) setSearchResults([]); })
        .finally(() => { if (!cancelled) setSearchLoading(false); });
    }, searchQuery.trim() ? 260 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchPanelRef.current?.contains(event.target)) setSearchOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen]);

  const updatePermission = async (key: keyof AIPermissions, value: boolean) => {
    if (!permissions) return;
    const previous = permissions;
    setPermissions({ ...previous, [key]: value });
    setError("");
    try {
      setPermissions(await apiUpdateAIPermissions({ [key]: value }));
    } catch {
      setPermissions(previous);
      setError("Impossible d’enregistrer cet accès. Réessayez.");
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await apiUpdateMe({ full_name: name.trim(), bio });
      setUser(updated);
    } catch {
      setError("Impossible d’enregistrer votre profil. Vérifiez votre connexion puis réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const deleteConversation = async (id: number) => {
    setError("");
    try {
      await apiDeleteConversation(id);
      setConversations(items => items.filter(item => item.id !== id));
    } catch {
      setError("Impossible de supprimer cette conversation. Réessayez.");
    }
  };

  const changeLanguage = (next: Lang) => {
    setLang(next);
    void apiUpdateMe({ preferred_language: next }).catch(() => {});
  };

  const goTo = (route: string) => {
    setMobileNavOpen(false);
    navigate(route);
  };

  const permissionLabel = (key: string) => {
    const labels: Record<string, string> = {
      allow_dashboard: "Tableau de bord",
      allow_catalogue: "Catalogue de cours",
      allow_quizzes: "Quiz et exercices",
      allow_analytics: "Progression et statistiques",
      allow_certificates: "Certificats",
      allow_notes: "Notes personnelles",
      allow_documents: "Documents",
      allow_library: "Bibliothèque",
    };
    return labels[key] ?? key.replace(/^allow_/, "").replaceAll("_", " ");
  };

  const renderBody = () => {
    if (loading) return <SkeletonRows />;
    if (section === "history") {
      return conversations.length ? (
        <div className="space-y-2">
          {conversations.map(item => (
            <article key={item.id} className="tess-hub-card group flex items-center gap-3 rounded-2xl border p-3 transition hover:-translate-y-0.5 sm:p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><MessageSquare className="h-4 w-4" /></span>
              <button type="button" onClick={() => goTo(`/dashboard/ai/${item.id}`)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-[var(--tess-ink)]">{item.title?.trim() || "Conversation sans titre"}</span>
                <span className="mt-1 block text-xs text-[var(--tess-muted)]">{new Date(item.updated_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span>
              </button>
              <button type="button" onClick={() => void deleteConversation(item.id)} aria-label="Supprimer la conversation" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--tess-muted)] transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10"><Trash2 className="h-4 w-4" /></button>
              <ArrowRight className="mr-1 hidden h-4 w-4 text-[var(--tess-muted)] transition group-hover:translate-x-1 sm:block" />
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--tess-line)] px-5 py-12 text-center">
          <History className="mx-auto h-7 w-7 text-[var(--tess-muted)]" />
          <p className="mt-3 font-semibold text-[var(--tess-ink)]">Pas encore de conversation enregistrée</p>
          <p className="mt-1 text-sm text-[var(--tess-muted)]">Votre prochain échange restera ici pour être repris à tout moment.</p>
          <button type="button" onClick={() => goTo("/dashboard/ai")} className="mt-5 rounded-xl bg-[var(--tess-ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Commencer un échange</button>
        </div>
      );
    }
    if (section === "files") {
      return files.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map(file => (
            <article key={file.id} className="tess-hub-card rounded-2xl border p-4 transition hover:-translate-y-0.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><FileText className="h-4 w-4" /></span>
              <p className="mt-4 truncate text-sm font-semibold text-[var(--tess-ink)]">{file.titre}</p>
              <p className="mt-1 text-xs text-[var(--tess-muted)]">{file.file_type || "Document"} · {file.has_analysis ? "Analysé par TESS" : "Prêt pour l’analyse"}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--tess-line)] px-5 py-12 text-center">
          <FileText className="mx-auto h-7 w-7 text-[var(--tess-muted)]" />
          <p className="mt-3 font-semibold text-[var(--tess-ink)]">Votre bibliothèque commence ici</p>
          <p className="mt-1 text-sm text-[var(--tess-muted)]">Ajoutez un document dans l’espace d’analyse pour le retrouver avec TESS.</p>
          <button type="button" onClick={() => navigate("/dashboard/document-ai")} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--tess-line)] px-4 py-2.5 text-sm font-semibold text-[var(--tess-ink)] transition hover:bg-[var(--tess-mint)]">Ouvrir l’analyse de documents <ArrowRight className="h-4 w-4" /></button>
        </div>
      );
    }
    if (section === "projects") {
      return projects.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map(project => (
            <article key={project.id} className="tess-hub-card rounded-2xl border p-4 transition hover:-translate-y-0.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><BookOpen className="h-4 w-4" /></span>
              <p className="mt-4 text-sm font-semibold text-[var(--tess-ink)]">{project.title}</p>
              <p className="mt-1 text-xs text-[var(--tess-muted)]">Parcours suivi dans votre espace d’apprentissage</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--tess-line)] px-5 py-12 text-center">
          <Folder className="mx-auto h-7 w-7 text-[var(--tess-muted)]" />
          <p className="mt-3 font-semibold text-[var(--tess-ink)]">Aucun parcours suivi pour l’instant</p>
          <p className="mt-1 text-sm text-[var(--tess-muted)]">Les cours que vous suivez donneront à TESS plus de contexte pour vous aider.</p>
          <button type="button" onClick={() => navigate("/dashboard/courses")} className="mt-5 rounded-xl bg-[var(--tess-ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Découvrir les cours</button>
        </div>
      );
    }
    if (section === "memory") {
      const lastActive = memory?.profile.last_active;
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-2xl bg-[var(--tess-ink)] p-5 text-white sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-white/60">Votre niveau actuel</p>
              <p className="tess-display mt-3 text-3xl">{memory?.profile.level || "En découverte"}</p>
              <p className="mt-2 text-sm leading-6 text-white/65">TESS ajuste ses explications au fil de votre progression.</p>
            </div>
            <div className="tess-hub-card rounded-2xl border p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--tess-muted)]">Échanges accompagnés</p>
              <p className="tess-display mt-3 text-4xl text-[var(--tess-ink)]">{memory?.profile.question_count ?? 0}</p>
              <p className="mt-2 text-sm text-[var(--tess-muted)]">{lastActive ? `Dernière activité ${new Date(lastActive).toLocaleDateString("fr-FR", { dateStyle: "medium" })}` : "Votre activité apparaîtra au fil des échanges."}</p>
            </div>
          </div>
          <div className="tess-hub-card rounded-2xl border p-5 sm:p-6">
            <p className="text-sm font-semibold text-[var(--tess-ink)]">Notions à consolider</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {memory?.profile.weaknesses.length
                ? memory.profile.weaknesses.map(topic => <span key={topic} className="rounded-full bg-[var(--tess-accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--tess-accent)]">{topic}</span>)
                : <p className="text-sm text-[var(--tess-muted)]">TESS construira cette mémoire au fil des échanges, pour vous aider à voir vos progrès.</p>}
            </div>
          </div>
          {memory?.session?.course_title && (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--tess-line)] px-4 py-3">
              <BookOpen className="h-4 w-4 text-[var(--tess-accent)]" />
              <p className="min-w-0 text-sm text-[var(--tess-muted)]">Dernier contexte <span className="font-semibold text-[var(--tess-ink)]">{memory.session.course_title}</span></p>
            </div>
          )}
        </div>
      );
    }
    if (section === "profile") {
      return (
        <div className="space-y-5">
          <label className="block text-sm font-semibold text-[var(--tess-ink)]">Nom affiché
            <input value={name} onChange={event => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--tess-line)] bg-[var(--tess-surface)] px-3.5 py-3 text-sm outline-none transition focus:border-[var(--tess-accent)]" />
          </label>
          <label className="block text-sm font-semibold text-[var(--tess-ink)]">Quelques mots sur votre façon d’apprendre
            <textarea value={bio} onChange={event => setBio(event.target.value)} rows={4} placeholder="Ce que vous apprenez en ce moment, ce qui vous aide à comprendre…" className="mt-2 w-full resize-y rounded-xl border border-[var(--tess-line)] bg-[var(--tess-surface)] px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-[var(--tess-accent)]" />
          </label>
          <p className="text-xs text-[var(--tess-muted)]">{user?.email}</p>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
          <button type="button" onClick={() => void saveProfile()} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--tess-ink)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save className="h-4 w-4" />}
            {saving ? "Enregistrement…" : "Enregistrer le profil"}
          </button>
        </div>
      );
    }
    if (section === "plugins") {
      return (
        <div className="space-y-2">
          <p className="mb-5 max-w-2xl text-sm leading-6 text-[var(--tess-muted)]">TESS n’utilise ces espaces que pour mieux comprendre votre contexte. Vous gardez le contrôle de chaque accès.</p>
          {permissions && Object.entries(permissions).map(([key, value]) => (
            <label key={key} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-[var(--tess-line)] px-4 py-3.5 transition hover:bg-[var(--tess-mint)]/50">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]"><Check className="h-4 w-4" /></span>
              <span className="flex-1 text-sm font-semibold text-[var(--tess-ink)]">{permissionLabel(key)}</span>
              <input type="checkbox" checked={value} onChange={event => void updatePermission(key as keyof AIPermissions, event.target.checked)} className="h-4 w-4 accent-[#c75e3b]" />
            </label>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl border border-[var(--tess-line)] p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--tess-mint)] text-[var(--tess-ink)]">{resolvedTheme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</span>
          <span className="flex-1"><span className="block text-sm font-semibold text-[var(--tess-ink)]">Apparence</span><span className="mt-1 block text-xs text-[var(--tess-muted)]">Adaptez l’espace à votre environnement.</span></span>
          <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="rounded-xl border border-[var(--tess-line)] px-3 py-2 text-xs font-semibold text-[var(--tess-ink)] hover:bg-[var(--tess-mint)]">{resolvedTheme === "dark" ? "Mode clair" : "Mode sombre"}</button>
        </div>
        <label className="block max-w-sm text-sm font-semibold text-[var(--tess-ink)]">Langue de TESS
          <select value={lang} onChange={event => changeLanguage(event.target.value as Lang)} className="mt-2 block w-full rounded-xl border border-[var(--tess-line)] bg-[var(--tess-surface)] px-3.5 py-3 text-sm text-[var(--tess-ink)] outline-none focus:border-[var(--tess-accent)]">
            <option value="fr">Français</option><option value="en">English</option><option value="sw">Kiswahili</option>
          </select>
        </label>
        {permissions && (
          <div className="border-t border-[var(--tess-line)] pt-5">
            <p className="mb-3 text-sm font-semibold text-[var(--tess-ink)]">Accès de l’assistant</p>
            <div className="space-y-1">{Object.entries(permissions).map(([key, value]) => (
              <label key={key} className="flex min-h-11 items-center justify-between gap-4 rounded-xl px-2 text-sm text-[var(--tess-muted)] hover:bg-[var(--tess-mint)]/50">
                <span>{permissionLabel(key)}</span>
                <input type="checkbox" checked={value} onChange={event => void updatePermission(key as keyof AIPermissions, event.target.checked)} className="h-4 w-4 accent-[#c75e3b]" />
              </label>
            ))}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`tess-hub relative flex h-full min-h-0 text-[var(--tess-ink)] ${expanded ? "" : "tess-mobile-hub"}`}>
      {expanded && (
        <aside className={`hidden shrink-0 flex-col border-r border-[var(--tess-line)] bg-[var(--tess-surface)] px-3 pb-4 pt-5 transition-[width] lg:flex ${sidebarCollapsed ? "w-[76px]" : "w-[264px]"}`} aria-label="Navigation TESS">
          <div className={`flex items-center gap-3 px-2 ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
            <img src="/ai_icon.jpg" alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
            {!sidebarCollapsed && <div className="min-w-0"><p className="text-sm font-bold tracking-tight">T.E.S.S.</p><p className="mt-0.5 text-[10px] text-[var(--tess-muted)]">Compagnon d’apprentissage</p></div>}
            <button type="button" aria-label={sidebarCollapsed ? "Déplier la navigation" : "Réduire la navigation"} onClick={() => setSidebarCollapsed(value => !value)} className={`${sidebarCollapsed ? "" : "ml-auto"} flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tess-muted)] hover:bg-[var(--tess-mint)] hover:text-[var(--tess-ink)]`}>{sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
          </div>
          <button type="button" onClick={() => goTo("/dashboard/ai")} className={`mt-7 flex h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${!section ? "tess-hub-active" : "text-[var(--tess-ink)] hover:bg-[var(--tess-mint)]"} ${sidebarCollapsed ? "justify-center px-0" : ""}`} title={sidebarCollapsed ? "Nouvelle conversation" : undefined}>
            <MessageSquare className="h-[18px] w-[18px] shrink-0" />{!sidebarCollapsed && <span>Nouvelle conversation</span>}
          </button>
          <p className={`mb-2 mt-7 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-[var(--tess-muted)] ${sidebarCollapsed ? "sr-only" : ""}`}>Votre espace</p>
          <nav className="space-y-1">
            {hubNavItems.slice(1).map(({ label, icon: NavIcon, route, section: navSection }) => (
              <button key={route} type="button" onClick={() => goTo(route)} aria-current={navSection === section ? "page" : undefined} title={sidebarCollapsed ? label : undefined} className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] font-medium transition ${sidebarCollapsed ? "justify-center px-0" : ""} ${navSection === section ? "tess-hub-active font-semibold" : "text-[var(--tess-muted)] hover:bg-[var(--tess-mint)] hover:text-[var(--tess-ink)]"}`}>
                <NavIcon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />{!sidebarCollapsed && <span>{label}</span>}
              </button>
            ))}
          </nav>
          <div className={`mt-auto border-t border-[var(--tess-line)] pt-4 ${sidebarCollapsed ? "flex flex-col items-center gap-1" : ""}`}>
            <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Changer le thème" title="Changer le thème" className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[var(--tess-muted)] hover:bg-[var(--tess-mint)] hover:text-[var(--tess-ink)]">
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{!sidebarCollapsed && <span>Changer de thème</span>}
            </button>
            {!sidebarCollapsed && (
              <label className="mt-1 flex items-center justify-between gap-2 px-3 py-2 text-xs text-[var(--tess-muted)]">Langue
                <select aria-label="Langue de TESS" value={lang} onChange={event => changeLanguage(event.target.value as Lang)} className="rounded-lg border border-[var(--tess-line)] bg-[var(--tess-surface)] px-2 py-1.5 text-xs text-[var(--tess-ink)]">
                  <option value="fr">Français</option><option value="en">English</option><option value="sw">Kiswahili</option>
                </select>
              </label>
            )}
            <button type="button" onClick={() => goTo("/dashboard")} className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--tess-mint)] ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tess-ink)] text-white"><UserRound className="h-4 w-4" /></span>
              {!sidebarCollapsed && <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[var(--tess-ink)]">Espace apprenant</span><span className="mt-0.5 block text-[10px] text-[var(--tess-muted)]">Retour au tableau de bord</span></span>}
              {!sidebarCollapsed && <ChevronRight className="h-4 w-4 text-[var(--tess-muted)]" />}
            </button>
          </div>
        </aside>
      )}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className={`relative z-30 flex min-h-[76px] shrink-0 items-center gap-3 px-4 py-3 sm:px-7 ${expanded ? "justify-end" : ""}`}>
          {!expanded && (
            <button type="button" onClick={() => setMobileNavOpen(value => !value)} aria-label={mobileNavOpen ? "Fermer la navigation TESS" : "Ouvrir la navigation TESS"} aria-expanded={mobileNavOpen} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--tess-line)] bg-[var(--tess-surface)] text-[var(--tess-ink)]">
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
          <div className={`flex min-w-0 items-center gap-2.5 ${expanded ? "mr-auto" : "flex-1"}`}>
            {!expanded && <img src="/ai_icon.jpg" alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[var(--tess-accent)]">{meta.eyebrow}</p>
              <p className="truncate text-sm font-semibold text-[var(--tess-ink)]">{meta.title}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[var(--tess-line)] bg-[var(--tess-surface)] p-1">
            <button type="button" onClick={() => setSearchOpen(value => !value)} aria-label="Rechercher dans les conversations" aria-expanded={searchOpen} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--tess-muted)] hover:bg-[var(--tess-mint)] hover:text-[var(--tess-ink)]"><Search className="h-4 w-4" /></button>
            {onClose && <button type="button" onClick={onClose} aria-label="Quitter l’espace TESS" className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--tess-muted)] hover:bg-[var(--tess-mint)] hover:text-[var(--tess-ink)]"><X className="h-4 w-4" /></button>}
          </div>
        </header>

        {mobileNavOpen && (
          <div className="absolute inset-0 z-50 bg-[#182421]/25 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileNavOpen(false)}>
            <nav aria-label="Navigation TESS" className="tess-arrive absolute inset-y-0 left-0 flex w-[min(19rem,88vw)] flex-col border-r border-[var(--tess-line)] bg-[var(--tess-surface)] px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl" onClick={event => event.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-[var(--tess-line)] pb-5">
                <img src="/ai_icon.jpg" alt="" className="h-10 w-10 rounded-xl object-cover" />
                <div><p className="text-sm font-bold">T.E.S.S.</p><p className="text-[10px] text-[var(--tess-muted)]">Compagnon d’apprentissage</p></div>
                <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Fermer la navigation" className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[var(--tess-muted)] hover:bg-[var(--tess-mint)]"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 space-y-1">
                {hubNavItems.map(({ label, icon: NavIcon, route, section: navSection }) => (
                  <button key={route} type="button" onClick={() => goTo(route)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ${navSection === section ? "tess-hub-active" : "text-[var(--tess-muted)] hover:bg-[var(--tess-mint)] hover:text-[var(--tess-ink)]"}`}>
                    <NavIcon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => goTo("/dashboard")} className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[var(--tess-muted)] hover:bg-[var(--tess-mint)]"><ChevronRight className="h-4 w-4 rotate-180" />Retour au tableau de bord</button>
            </nav>
          </div>
        )}

        {searchOpen && (
          <>
            <button type="button" aria-label="Fermer la recherche" onClick={() => setSearchOpen(false)} className="absolute inset-0 z-40 bg-[#182421]/20 backdrop-blur-[2px]" />
            <div ref={searchPanelRef} role="dialog" aria-label="Rechercher une conversation" className="tess-arrive absolute left-1/2 top-[82px] z-50 flex max-h-[min(34rem,calc(100dvh-7rem))] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--tess-line)] bg-[var(--tess-surface)] p-3 shadow-2xl sm:p-4">
              <label className="flex items-center gap-2.5 rounded-xl border border-[var(--tess-line)] bg-[var(--tess-paper)] px-3 py-3">
                <Search className="h-4 w-4 shrink-0 text-[var(--tess-muted)]" />
                <input autoFocus value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Rechercher dans vos conversations…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--tess-ink)] outline-none placeholder:text-[var(--tess-muted)]" />
                {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Effacer la recherche" className="rounded-md p-1 text-[var(--tess-muted)] hover:bg-[var(--tess-mint)]"><X className="h-4 w-4" /></button>}
              </label>
              <div className="min-h-0 overflow-y-auto pt-3">
                {searchLoading ? <SkeletonRows /> : searchResults.length ? (
                  <ul className="space-y-1">{searchResults.map(item => (
                    <li key={item.id}><button type="button" onClick={() => goTo(`/dashboard/ai/${item.id}`)} className="flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--tess-mint)]">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tess-accent)]" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[var(--tess-ink)]">{item.title?.trim() || "Conversation sans titre"}</span><span className="mt-1 block text-[11px] text-[var(--tess-muted)]">{new Date(item.updated_at).toLocaleString("fr-FR")}</span>{item.matches?.map((match, index) => <span key={`${item.id}-match-${index}`} className="mt-1 block line-clamp-2 text-xs text-[var(--tess-muted)]">{match}</span>)}</span>
                    </button></li>
                  ))}</ul>
                ) : <p className="px-2 py-6 text-center text-sm text-[var(--tess-muted)]">Aucune conversation trouvée.</p>}
              </div>
            </div>
          </>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-7 lg:px-10">
          <div className="tess-arrive mx-auto w-full max-w-[980px] pb-6 pt-5 sm:pt-9">
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tess-accent-soft)] text-[var(--tess-accent)]"><Icon className="h-[18px] w-[18px]" /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--tess-accent)]">{meta.eyebrow}</p>
                <h1 className="tess-display mt-1 text-3xl text-[var(--tess-ink)] sm:text-4xl">{meta.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tess-muted)]">{meta.description}</p>
              </div>
            </div>
            <section className="tess-hub-card rounded-[22px] border p-4 sm:p-6 lg:p-7">
              {error && (
                <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={() => setReloadKey(value => value + 1)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold hover:bg-rose-100 dark:hover:bg-rose-400/10"><RefreshCw className="h-3.5 w-3.5" />Réessayer</button>
                </div>
              )}
              {loading ? <SkeletonRows /> : renderBody()}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}