// TESS AI responsive shell.
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, ArrowUp, AudioLines, Bell, Bot, Brain, Check, ChevronRight, Code2, Languages, Lightbulb, ListTodo, Loader2, LogIn, Menu, MessageSquare, Mic, Moon, PanelLeftClose, PanelLeftOpen, Phone, Search, Send, Settings, ShieldCheck, SquarePen, Sun, UserRound, Wrench, X, Store, PlugZap, MapPin, LockKeyhole, Images, Library } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/hooks/useTheme";
import { apiGetConversations, apiGetMe, isAuthenticated, type AIConversation, type UserProfile } from "@/lib/api-client";
import AIComposer, { type ComposerMode, type ComposerResource } from "@/components/ai/AIComposer";
import HoverTooltip from "@/components/ui/hover-tooltip";

const navItems = [
  { label: "Images", icon: Images, route: "/images" },
  { label: "Bibliothèque", icon: Library, route: "/library" },
  { label: "Opérations", icon: Activity, route: "/operations" },
  { label: "Agents", icon: Bot, route: "/agents" },
  { label: "Tâches et missions", icon: ListTodo, route: "/tasks" },
  { label: "Tool Registry", icon: Wrench, route: "/tools" },
  { label: "Rappels", icon: Bell, route: "/reminders" },
  { label: "Suivis", icon: Bell, route: "/follow-ups" },
  { label: "Mémoire", icon: Brain, route: "/memory" },
  { label: "Notifications", icon: Bell, route: "/notifications" },
  { label: "Sécurité", icon: ShieldCheck, route: "/security" },
  { label: "Marketplace", icon: Store, route: "/marketplace" },
  { label: "Connexions", icon: PlugZap, route: "/connections" },
  { label: "Recherche urbaine", icon: MapPin, route: "/city" },
  { label: "Contrôle opérateur", icon: LockKeyhole, route: "/operator" },
  { label: "Préférences", icon: Settings, route: "/" },
];
const languageOptions = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
] as const;
const actions = [
  { title: "Comprendre", body: "Explications claires et contextualisées", icon: Lightbulb, tone: "bg-blue-50 text-blue-600 dark:bg-white/[0.08] dark:text-slate-200" },
  { title: "Créer", body: "Code, projets et outils", icon: Code2, tone: "bg-emerald-50 text-emerald-600 dark:bg-white/[0.08] dark:text-slate-200" },
  { title: "Rechercher", body: "Infos, sources et actualités", icon: Search, tone: "bg-indigo-50 text-indigo-600 dark:bg-white/[0.08] dark:text-slate-200" },
  { title: "Résoudre", body: "Solutions et conseils", icon: Lightbulb, tone: "bg-amber-50 text-amber-600 dark:bg-white/[0.08] dark:text-slate-200" },
];
const examples = ["Explique-moi la différence entre TCP et UDP", "Comment configurer un routeur Cisco ?", "Aide-moi à résoudre cette erreur de code", "Quelles sont les meilleures ressources pour apprendre Python ?"];

type Props = {
  hasMessages: boolean; input: string; isStreaming: boolean; longThinking: boolean;
  onInputChange: (value: string) => void; onSend: (value?: string) => void;
  onNewConversation: () => void;
  onClosePanel: () => void; onCall?: () => void;
  mode?: ComposerMode; onModeChange?: (mode: ComposerMode) => void;
  interactionActive?: boolean;
  alertMode?: boolean;
  onToggleAlertMode?: () => void;
  onAudioRecorded?: (blob: Blob, durationMs: number) => void; onAudioError?: (message: string) => void;
  resources?: ComposerResource[];
  showClose?: boolean;
  expanded?: boolean; conversation: ReactNode; composerExtras?: ReactNode; onMic?: () => void; isDictating?: boolean;
  historyContent?: ReactNode; audioPlayer?: ReactNode; conversationTitle?: string;
  onOpenConversation?: (conversation: AIConversation) => void;
  onAuthRequired?: (route: string) => void;
};

export default function MobileAssistantShell({ hasMessages, input, isStreaming, onInputChange, onSend, onNewConversation, onClosePanel, expanded = false, conversation, composerExtras, historyContent, audioPlayer, conversationTitle, onOpenConversation, onAuthRequired, showClose = true, mode = "normal", onModeChange, onAudioRecorded, onAudioError, resources = [], interactionActive = false, alertMode = false, onToggleAlertMode }: Props) {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const [drawer, setDrawer] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024 ? expanded : false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [languageSettingsOpen, setLanguageSettingsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [workspaceExplorerOpen, setWorkspaceExplorerOpen] = useState(false);
  const workspaceExplorerRef = useRef<HTMLButtonElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AIConversation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [assistantUser, setAssistantUser] = useState<UserProfile | null>(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullComplete, setPullComplete] = useState(false);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const pullStartRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const pullLockedRef = useRef(false);
  const pullHapticRef = useRef(false);
  const pullThreshold = 104;
  useEffect(() => {
    if (!workspaceExplorerOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkspaceExplorerOpen(false);
        workspaceExplorerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [workspaceExplorerOpen]);
  useEffect(() => {
    const handleViewport = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setDrawer(desktop ? expanded : false);
      if (!desktop) setSidebarCollapsed(false);
    };
    handleViewport();
    window.addEventListener("resize", handleViewport);
    return () => window.removeEventListener("resize", handleViewport);
  }, [expanded]);
  useEffect(() => { document.body.style.overflow = drawer || searchOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [drawer, searchOpen]);
  useEffect(() => {
    if (!isAuthenticated()) {
      setAssistantUser(null);
      return;
    }
    let active = true;
    void apiGetMe().then((profile) => {
      if (active) setAssistantUser(profile);
    }).catch(() => {
      if (active) setAssistantUser(null);
    });
    return () => { active = false; };
  }, []);

  const closeDrawer = () => {
    setDrawer(false);
    setLanguageOpen(false);
  };

  const goTo = (route: string | null) => {
    if (!route) {
      onNewConversation();
      return;
    }
    if (!isAuthenticated()) {
      onAuthRequired?.(route);
      return;
    }
    navigate(route);
  };
  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || !query || !isAuthenticated()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);
      void apiGetConversations(query)
        .then((results) => { if (!cancelled) setSearchResults(results); })
        .catch(() => { if (!cancelled) setSearchError("Recherche indisponible pour le moment."); })
        .finally(() => { if (!cancelled) setSearchLoading(false); });
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  const expandedSidebarOffset = sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[288px]";
  useEffect(() => {
    const viewport = mobileScrollRef.current;
    if (!viewport) return;

    const isMobileLayout = () => window.innerWidth < 768;
    const isAtBottom = () => viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 4;
    const resetPull = () => {
      pullStartRef.current = null;
      pullDistanceRef.current = 0;
      pullHapticRef.current = false;
      setPullProgress(0);
      setPullComplete(false);
    };

    const handleTouchStart = (event: globalThis.TouchEvent) => {
      if (!isMobileLayout() || !hasMessages || isStreaming || drawer || searchOpen || pullLockedRef.current) return;
      if (!isAtBottom() || event.touches.length !== 1) return;
      pullStartRef.current = event.touches[0].clientY;
      pullDistanceRef.current = 0;
      pullHapticRef.current = false;
      setPullProgress(0);
      setPullComplete(false);
    };

    const handleTouchMove = (event: globalThis.TouchEvent) => {
      if (pullStartRef.current === null || !isMobileLayout() || isStreaming || pullLockedRef.current || event.touches.length !== 1) return;
      const distance = pullStartRef.current - event.touches[0].clientY;
      if (distance <= 0) {
        resetPull();
        return;
      }
      // This listener is deliberately non-passive. Chrome must not consume
      // this overscroll as pull-to-refresh once the user is already at bottom.
      event.preventDefault();
      pullDistanceRef.current = distance;
      const progress = Math.min(1, distance / pullThreshold);
      setPullProgress(progress);
      if (progress >= 1) {
        setPullComplete(true);
        if (!pullHapticRef.current && "vibrate" in navigator) {
          pullHapticRef.current = true;
          navigator.vibrate?.(10);
        }
      } else {
        setPullComplete(false);
      }
    };

    const handleTouchEnd = () => {
      if (pullStartRef.current === null) return;
      const shouldCreate = pullDistanceRef.current >= pullThreshold && isMobileLayout() && hasMessages && !isStreaming && !pullLockedRef.current;
      pullStartRef.current = null;
      if (!shouldCreate) {
        resetPull();
        return;
      }
      pullLockedRef.current = true;
      setPullComplete(true);
      window.setTimeout(() => {
        onNewConversation();
        pullLockedRef.current = false;
        resetPull();
      }, 260);
    };

    viewport.addEventListener("touchstart", handleTouchStart, { passive: true });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", resetPull, { passive: true });
    return () => {
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
      viewport.removeEventListener("touchcancel", resetPull);
      resetPull();
    };
  }, [drawer, hasMessages, isStreaming, onNewConversation, searchOpen]);
  return <div className={`ai-mobile-chat-shell relative flex h-full min-h-0 w-full min-w-0 flex-col bg-[#f8fafd] text-[#0b1739] transition-[padding] duration-300 ease-out dark:bg-[#171717] dark:text-slate-100 ${expanded ? expandedSidebarOffset : ""}`}>
    <div className={`absolute inset-0 z-[60] bg-slate-950/40 transition-opacity ${drawer && !expanded ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden="true" />
    <aside className={`absolute inset-y-0 left-0 z-[70] flex h-full min-h-0 w-[min(276px,76vw)] -translate-x-full flex-col border-r border-[#e5ebf3] bg-white px-4 pb-4 pt-[max(18px,env(safe-area-inset-top))] shadow-2xl transition-[width,transform] duration-300 dark:border-[#2a2a2a] dark:bg-[#111111] ${drawer ? "translate-x-0" : ""} ${expanded ? (sidebarCollapsed ? "lg:w-[76px] lg:px-2" : "lg:w-[276px]") + " lg:translate-x-0 lg:shadow-none" : ""}`} aria-label="Navigation TESS AI">
      <div className={`flex items-center gap-2 px-1 ${isDesktop && expanded && sidebarCollapsed ? "justify-center px-0" : ""}`}>{!(isDesktop && expanded && sidebarCollapsed) && <><img src="/ai_icon.jpg" alt="TESS" className="h-9 w-9 shrink-0 rounded-xl object-cover" /><div><p className="text-[16px] font-bold leading-tight text-slate-950 dark:text-white">TESS</p></div></>}<button type="button" aria-label="Rechercher" onClick={() => isAuthenticated() ? setSearchOpen(value => !value) : onAuthRequired?.("/")} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#17366c] hover:bg-blue-50 dark:text-white dark:hover:bg-white/10"><Search className="h-[17px] w-[17px]" /></button><button type="button" aria-label={!isDesktop ? "Fermer le panneau" : expanded ? (sidebarCollapsed ? "Déplier le panneau" : "Plier le panneau") : "Fermer le panneau"} onClick={() => !isDesktop ? setDrawer(false) : expanded ? setSidebarCollapsed(value => !value) : setDrawer(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#17366c] hover:bg-blue-50 dark:text-white dark:hover:bg-white/10">{!isDesktop ? <X className="h-[18px] w-[18px]" /> : expanded ? (sidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />) : <X className="h-[18px] w-[18px]" />}</button></div>
      <button type="button" onClick={() => goTo(null)} disabled={isStreaming} className="mt-3 flex h-[39px] w-full items-center gap-3 rounded-[8px] bg-[#202020] px-3 text-left text-[12px] font-semibold text-white transition hover:bg-[#2d2d2d] disabled:opacity-50 dark:bg-[#2a2a2a] dark:hover:bg-[#333333]"><SquarePen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} /><span className={expanded && sidebarCollapsed ? "sr-only" : ""}>Nouvelle conversation</span></button>
      <nav className="mt-1 space-y-0.5">{navItems.map(({ label, icon: Icon, route }) => <button key={label} type="button" onClick={() => goTo(route)} aria-label={expanded && sidebarCollapsed ? label : undefined} className={`flex h-[39px] w-full items-center gap-3 rounded-[8px] px-3 text-left text-[12px] font-medium ${expanded && sidebarCollapsed ? "justify-center px-0" : ""} text-[#17366c] hover:bg-[#f5f8fd] dark:text-white dark:hover:bg-white/10`}><Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} /><span className={expanded && sidebarCollapsed ? "sr-only" : ""}>{label}</span></button>)}</nav>
      {expanded && sidebarCollapsed && <div className="relative mt-auto flex flex-col items-center gap-2 pt-3">
        <button type="button" aria-label={isAuthenticated() ? "Retourner à l’assistant" : "Se connecter ou créer un compte"} onClick={() => isAuthenticated() ? goTo("/") : onAuthRequired?.("/")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101725] text-sm font-semibold text-white shadow-sm transition hover:scale-105"><LogIn className="h-[17px] w-[17px]" /></button>
        <button type="button" aria-label="Changer le thème" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#17366c] transition hover:bg-blue-50 dark:text-white dark:hover:bg-white/10">{resolvedTheme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
        <button type="button" aria-label="Choisir la langue" aria-expanded={languageOpen} onClick={() => setLanguageOpen(value => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#17366c] transition hover:bg-blue-50 dark:text-white dark:hover:bg-white/10"><Languages className="h-[18px] w-[18px]" /></button>
        {languageOpen && <div className="absolute bottom-1 left-[68px] z-[90] w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-950/15 dark:border-slate-700 dark:bg-[#172033]">
          <p className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Langue de TESS</p>
          <select aria-label="Langue de TESS" value={lang} onChange={(event) => { setLang(event.target.value as "fr" | "en" | "sw"); setLanguageOpen(false); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-[#17366c] outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"><option value="fr">Français</option><option value="en">English</option><option value="sw">Kiswahili</option></select>
        </div>}
      </div>}
      {!(expanded && sidebarCollapsed) && <>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pt-4"><p className="px-3 text-[12px] font-semibold text-[#17366c] dark:text-white">Conversations récentes</p><div className="mt-2">{historyContent ?? <p className="px-3 text-[10px] text-[#6c85ad] dark:text-slate-400">Aucune conversation récente.</p>}</div><button type="button" onClick={() => goTo("/operations")} className="mt-2 px-3 text-[10px] font-semibold text-slate-600 hover:underline dark:text-white/80">Ouvrir le centre des opérations</button></div>
      <div className="relative shrink-0 pt-3"><button type="button" aria-expanded={preferencesOpen} onClick={() => { setPreferencesOpen(value => !value); setLanguageSettingsOpen(false); setAppearanceOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-semibold text-[#17366c] transition hover:bg-slate-50 dark:text-white dark:hover:bg-white/10"><span>Préférences</span><ChevronRight className={`h-4 w-4 transition-transform ${preferencesOpen ? "rotate-90" : ""}`} /></button>{preferencesOpen && <div className="absolute bottom-[calc(100%-0.5rem)] left-0 z-[95] w-[min(360px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-800 shadow-2xl shadow-slate-950/20 dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-white md:bottom-0 md:left-full md:ml-2"><p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/60">Préférences</p><button type="button" onClick={() => { setLanguageSettingsOpen(value => !value); setAppearanceOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/10"><span className="flex items-center gap-2"><Languages className="h-4 w-4" />Langue</span><ChevronRight className={`h-4 w-4 transition-transform ${languageSettingsOpen ? "rotate-90" : ""}`} /></button>{languageSettingsOpen && <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#171717]"><div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-[#242424]"><Search className="h-3.5 w-3.5 shrink-0 text-slate-400" /><input value={languageSearch} onChange={event => setLanguageSearch(event.target.value)} placeholder="Rechercher une langue" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400 dark:placeholder:text-white/40" /></div><div className="mt-2 space-y-0.5">{languageOptions.filter(option => option.label.toLocaleLowerCase().includes(languageSearch.toLocaleLowerCase())).map(option => <button key={option.value} type="button" onClick={() => { setLang(option.value); setLanguageSettingsOpen(false); }} className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-slate-200 dark:hover:bg-white/10 ${lang === option.value ? "bg-slate-200 font-semibold dark:bg-white/10" : ""}`}>{option.label}</button>)}</div></div>}<button type="button" onClick={() => { setAppearanceOpen(value => !value); setLanguageSettingsOpen(false); }} className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/10"><span className="flex items-center gap-2"><Sun className="h-4 w-4" />Apparence</span><ChevronRight className={`h-4 w-4 transition-transform ${appearanceOpen ? "rotate-90" : ""}`} /></button>{appearanceOpen && <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#171717]"><button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs hover:bg-slate-200 dark:hover:bg-white/10"><span>{resolvedTheme === "dark" ? "Mode nuit" : "Mode clair"}</span><span className="text-slate-500 dark:text-white/60">{resolvedTheme === "dark" ? "Sombre" : "Clair"}</span></button></div>}</div>}<button type="button" onClick={() => isAuthenticated() ? goTo("/") : onAuthRequired?.("/")} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[#3a3a3a] bg-[#202020] px-2.5 py-2 text-left hover:bg-[#2d2d2d]"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101725] text-sm font-semibold text-white"><LogIn className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{isAuthenticated() ? (assistantUser?.full_name || assistantUser?.email || "Votre compte") : "Se connecter / Créer un compte"}</p><p className="truncate text-xs text-white/70">{isAuthenticated() ? (assistantUser?.email || "Assistant TESS") : "Synchroniser vos conversations"}</p></div><ChevronRight className="ml-auto h-4 w-4 shrink-0 text-white" /></button></div></>}
    </aside>
    <header className={`absolute inset-x-0 top-0 z-40 flex min-h-[78px] items-center gap-3 px-4 pt-[max(0px,env(safe-area-inset-top))] transition-[padding] duration-300 ease-out sm:px-5 ${expanded ? expandedSidebarOffset : ""}`}>
      <button type="button" aria-label="Ouvrir le panneau" onClick={() => setDrawer(true)} className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 ${expanded ? "lg:hidden" : ""}`}><Menu className="h-5 w-5" /></button>
      <div className="relative z-10 ml-auto flex min-w-0 items-center gap-1.5">
      <div className={`flex h-12 shrink-0 items-center gap-0.5 rounded-2xl border border-slate-200 bg-white p-1 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white ${expanded ? "lg:ml-2" : ""}`}>
        <HoverTooltip label="Rechercher dans TESS"><button type="button" aria-label="Rechercher dans TESS" onClick={() => isAuthenticated() ? setSearchOpen(value => !value) : onAuthRequired?.("/")} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/70 dark:hover:bg-white/10"><Search className="h-[18px] w-[18px]" /></button></HoverTooltip>
        <span className="mx-0.5 h-5 w-px bg-slate-300/70 dark:bg-white/15" aria-hidden="true" />
        <HoverTooltip label="Nouvelle conversation"><button type="button" aria-label="Nouvelle conversation" disabled={isStreaming} onClick={onNewConversation} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/70 disabled:opacity-40 dark:hover:bg-white/10"><SquarePen className="h-[18px] w-[18px]" /></button></HoverTooltip>
        {showClose && <><span className="mx-0.5 h-5 w-px bg-slate-300/70 dark:bg-white/15" aria-hidden="true" /><HoverTooltip label="Fermer TESS AI"><button type="button" aria-label="Fermer TESS AI" onClick={onClosePanel} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/70 dark:hover:bg-white/10"><X className="h-[18px] w-[18px]" /></button></HoverTooltip></>}
      </div>
      <HoverTooltip label="Explorer TESS"><button ref={workspaceExplorerRef} type="button" aria-label="Explorer TESS" aria-expanded={workspaceExplorerOpen} onClick={() => setWorkspaceExplorerOpen(open => !open)} className="flex h-12 min-w-0 max-w-[148px] shrink items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400/30 dark:hover:bg-white/[0.06] sm:px-3 lg:h-10 lg:rounded-xl"><img src="/ai_icon.jpg" alt="" className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain p-1 ring-1 ring-slate-200 dark:ring-slate-600" /><span className="truncate text-[11px] font-semibold text-[#0b1739] dark:text-white">Explorer TESS</span><ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${workspaceExplorerOpen ? "rotate-90" : ""}`} /></button></HoverTooltip>
      </div>
      {workspaceExplorerOpen && <>
        <button type="button" aria-label="Fermer Explorer TESS" onClick={() => setWorkspaceExplorerOpen(false)} className="fixed inset-0 z-[145] cursor-default" />
        <div role="dialog" aria-label="Espaces TESS" className="fixed right-3 top-[70px] z-[150] flex max-h-[calc(100dvh-82px)] w-[min(320px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-2xl dark:border-white/15 dark:bg-[#202020] dark:text-white sm:right-5">
          <p className="px-2.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Vos espaces</p>
          <nav aria-label="Espaces TESS" className="min-h-0 overflow-y-auto overscroll-contain">
            {navItems.map(({ label, icon: SpaceIcon, route }) => <button key={route} type="button" onClick={() => { setWorkspaceExplorerOpen(false); if (!isAuthenticated()) { onAuthRequired?.(route); return; } navigate(route); }} className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs font-medium transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-400/10 dark:hover:text-blue-200"><SpaceIcon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{label}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" /></button>)}
          </nav>
        </div>
      </>}
        {searchOpen && <>
          <button type="button" aria-label="Fermer la recherche" onClick={() => setSearchOpen(false)} className="fixed inset-0 z-[75] bg-slate-950/45 backdrop-blur-[2px]" />
          <div role="dialog" aria-modal="true" aria-label="Recherche" className="fixed left-1/2 top-1/2 z-[80] flex h-[min(560px,calc(100dvh-40px))] w-[min(620px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-[#0b1739] shadow-[0_20px_70px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:rounded-3xl">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-white/10 sm:px-5"><form onSubmit={(event) => event.preventDefault()} className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-500 focus-within:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus-within:bg-slate-800"><Search className="h-4 w-4 shrink-0 text-[#6c85ad]" /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Rechercher dans vos conversations…" className="min-w-0 flex-1 bg-transparent text-sm text-[#17366c] outline-none placeholder:text-[#89a4d0] dark:text-white dark:placeholder:text-white/60" />{searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Effacer la recherche" className="rounded-md p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>}</form><button type="button" onClick={() => setSearchOpen(false)} aria-label="Fermer la recherche" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"><X className="h-4 w-4" /></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"><p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{searchQuery.trim() ? "Résultats de recherche" : "Vos conversations récentes"}</p>{searchLoading ? <div className="flex items-center justify-center py-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />Recherche en cours…</div> : searchError ? <p role="alert" className="py-12 text-center text-sm text-rose-600">{searchError}</p> : !isAuthenticated() ? <p className="py-12 text-center text-sm text-slate-500">Connectez-vous pour rechercher vos conversations.</p> : !searchQuery.trim() ? <p className="py-12 text-center text-sm text-slate-400">Saisissez un mot pour commencer.</p> : searchResults.length ? <ul className="space-y-1">{searchResults.map((item) => <li key={item.id}><button type="button" onClick={() => { setSearchOpen(false); onOpenConversation?.(item); }} className="flex min-h-14 w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.06]"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title?.trim() || "Conversation sans titre"}</span><span className="mt-1 block text-[11px] text-slate-400">{new Date(item.updated_at).toLocaleString()}</span>{item.matches?.map((match, index) => <span key={`${item.id}-match-${index}`} className="mt-1 block line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{match}</span>)}</span></button></li>)}</ul> : <p className="py-12 text-center text-sm text-slate-500">Aucune conversation trouvée.</p>}</div>
          </div>
        </>}
    </header>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[78px] bg-gradient-to-b from-white/95 via-white/65 to-transparent dark:from-[#171717]/95 dark:via-[#171717]/50" />
    {audioPlayer && <div className="relative z-30 mx-4 mt-[78px] shrink-0">{audioPlayer}</div>}
    <div ref={mobileScrollRef} style={{ overscrollBehaviorY: "contain", touchAction: "pan-y" }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><section className={`mx-auto w-full max-w-[1040px] px-5 pb-24 sm:px-8 ${hasMessages ? (audioPlayer ? "pt-3" : "pt-[88px]") : "pt-10 sm:pt-12"}`}>{!hasMessages ? <div className="grid gap-10 pb-4 lg:grid-cols-[1.15fr_.85fr] lg:items-start"><div className="tess-arrive max-w-[620px]"><p className="mb-4 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--tess-accent)]">T.E.S.S. · votre espace IA</p><h1 className="tess-display max-w-[590px] text-[clamp(2.2rem,5vw,4.25rem)] leading-[1.02] tracking-[-.045em] text-[var(--tess-ink)]">Qu’est-ce qu’on <span className="text-[var(--tess-accent)]">éclaircit</span> aujourd’hui&nbsp;?</h1><p className="mt-5 max-w-[500px] text-sm leading-7 text-[var(--tess-muted)]">Je suis TESS, votre assistant IA. On peut décomposer une notion, créer, analyser un problème ou regarder votre code ensemble.</p><div className="mt-8 flex flex-wrap gap-2">{actions.map(({ title, icon: ActionIcon }) => <button key={title} type="button" onClick={() => onInputChange(`${title} : `)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--tess-line)] bg-[var(--tess-surface)] px-3.5 text-xs font-semibold text-[var(--tess-ink)] transition hover:-translate-y-0.5 hover:border-[var(--tess-accent)]"><ActionIcon className="h-3.5 w-3.5 text-[var(--tess-accent)]" />{title}</button>)}</div></div><div className="tess-arrive lg:mt-2" style={{ animationDelay: "90ms" }}><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[.15em] text-[var(--tess-muted)]">Quelques portes d’entrée</h2><span className="h-px flex-1 ml-4 bg-[var(--tess-line)]" /></div><div className="divide-y divide-[var(--tess-line)] border-y border-[var(--tess-line)]">{examples.map((example, index) => <button key={example} type="button" onClick={() => onSend(example)} className="group flex min-h-[58px] w-full items-center gap-4 py-3 text-left"><span className="font-mono text-[10px] text-[var(--tess-accent)]">0{index + 1}</span><span className="flex-1 text-sm leading-5 text-[var(--tess-ink)] transition-colors group-hover:text-[var(--tess-accent)]">{example}</span><ArrowRight className="h-4 w-4 shrink-0 text-[var(--tess-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--tess-accent)]" /></button>)}</div><p className="mt-3 text-[11px] text-[var(--tess-muted)]">Vos questions peuvent aussi contenir une image ou un PDF.</p></div></div> : conversation}</section></div>
    {pullProgress > 0 && <div className="pointer-events-none absolute bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400"><div className="flex h-11 w-11 items-center justify-center rounded-full p-[3px] transition-[background] duration-75" style={{ background: pullComplete ? "#2563eb" : `conic-gradient(#2563eb ${pullProgress * 360}deg, #dbeafe 0deg)` }}><div className={`flex h-full w-full items-center justify-center rounded-full ${pullComplete ? "bg-blue-600" : "bg-[#f8fafd] dark:bg-[#171717]"}`}>{pullComplete ? <span className="flex h-full w-full items-center justify-center rounded-full bg-blue-600 text-white"><Check className="h-5 w-5" strokeWidth={3} /></span> : <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}</div></div><span>Nouveau chat</span></div>}
    <div className="shrink-0 bg-transparent px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-3"><div className="mx-auto w-full max-w-[760px]"><AIComposer value={input} onChange={onInputChange} onSubmit={value => onSend(value)} disabled={false} isStreaming={isStreaming} mode={mode} onModeChange={onModeChange} prefixActions={composerExtras} onAudioRecorded={onAudioRecorded} onAudioError={onAudioError} resources={resources} interactionActive={interactionActive} alertMode={alertMode} onToggleAlertMode={onToggleAlertMode} placeholder="Écrire à T.E.S.S.…" /><p className="mt-2 text-center text-[8px] text-[#7993bc] dark:text-white/60">Entrée pour envoyer · Shift + Entrée pour une nouvelle ligne</p></div></div>
  </div>;
}
