// Copie Zentrix Academy : src/components/ai/MobileAssistantShell.tsx
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUp, AudioLines, BookOpen, Check, ChevronRight, Code2, Database, FileText, Folder, Grid2X2, History, Languages, Lightbulb, Maximize2, Menu, MessageSquare, Mic, Minimize2, Moon, PanelLeftClose, PanelLeftOpen, Phone, Search, Send, Settings, Sun, UserRound, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/hooks/useTheme";
import { apiGetConversations, isAuthenticated, type AIConversation } from "@/lib/api-client";

const navItems = [
  { label: "Nouvelle conversation", icon: MessageSquare, route: null },
  { label: "Historique", icon: History, route: "/dashboard/ai/history" },
  { label: "Mes fichiers", icon: FileText, route: "/dashboard/ai/files" },
  { label: "Mes projets", icon: Folder, route: "/dashboard/ai/projects" },
  { label: "Mémoire", icon: Database, route: "/dashboard/ai/memory" },
  { label: "Outils & Plugins", icon: Grid2X2, route: "/dashboard/ai/plugins" },
  { label: "Paramètres", icon: Settings, route: "/dashboard/ai/settings" },
];
const actions = [
  { title: "Apprendre", body: "Cours, leçons et exercices", icon: BookOpen, tone: "bg-blue-50 text-blue-600 dark:bg-white/[0.08] dark:text-slate-200" },
  { title: "Créer", body: "Code, projets et outils", icon: Code2, tone: "bg-emerald-50 text-emerald-600 dark:bg-white/[0.08] dark:text-slate-200" },
  { title: "Rechercher", body: "Web, infos et actualités", icon: Search, tone: "bg-indigo-50 text-indigo-600 dark:bg-white/[0.08] dark:text-slate-200" },
  { title: "Résoudre", body: "Solutions et conseils", icon: Lightbulb, tone: "bg-amber-50 text-amber-600 dark:bg-white/[0.08] dark:text-slate-200" },
];
const examples = ["Explique-moi la différence entre TCP et UDP", "Comment configurer un routeur Cisco ?", "Aide-moi à résoudre cette erreur de code", "Quelles sont les meilleures ressources pour apprendre Python ?"];

type Props = {
  hasMessages: boolean; input: string; isStreaming: boolean; longThinking: boolean;
  onInputChange: (value: string) => void; onSend: (value?: string) => void;
  onNewConversation: () => void; onModeChange?: (mode: "reflect" | "normal" | "search") => void;
  onClosePanel: () => void; onToggleExpanded?: () => void; onCall: () => void;
  expanded?: boolean; conversation: ReactNode; composerExtras?: ReactNode; onMic: () => void; isDictating?: boolean;
  historyContent?: ReactNode; audioPlayer?: ReactNode; conversationTitle?: string;
  onOpenConversation?: (conversation: AIConversation) => void;
};

export default function MobileAssistantShell({ hasMessages, input, isStreaming, onInputChange, onSend, onNewConversation, onClosePanel, onToggleExpanded, onCall, expanded = false, conversation, composerExtras, onMic, historyContent, audioPlayer, conversationTitle, isDictating = false, onOpenConversation }: Props) {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [drawer, setDrawer] = useState(expanded);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AIConversation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullComplete, setPullComplete] = useState(false);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const pullStartRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const pullLockedRef = useRef(false);
  const pullHapticRef = useRef(false);
  const pullThreshold = 104;
  useEffect(() => { if (expanded) setDrawer(true); }, [expanded]);
  useEffect(() => { document.body.style.overflow = drawer || searchOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [drawer, searchOpen]);

  const closeDrawer = () => {
    setDrawer(false);
    setLanguageOpen(false);
  };

  const goTo = (route: string | null) => {
    closeDrawer();
    if (!route) {
      onNewConversation();
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
  return <div className={`ai-mobile-chat-shell relative flex h-full min-h-0 flex-col bg-[#f8fafd] text-[#0b1739] transition-[padding] duration-300 ease-out dark:bg-black dark:text-slate-100 ${expanded ? expandedSidebarOffset : ""}`}>
    <div className={`absolute inset-0 z-[60] bg-slate-950/40 transition-opacity ${drawer && !expanded ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden="true" />
    <aside className={`absolute inset-y-0 left-0 z-[70] flex w-[min(276px,76vw)] -translate-x-full flex-col border-r border-[#e5ebf3] bg-white px-4 pb-4 pt-[max(18px,env(safe-area-inset-top))] shadow-2xl transition-[width,transform] duration-300 dark:border-[#2a2a2a] dark:bg-[#111111] ${drawer ? "translate-x-0" : ""} ${expanded ? (sidebarCollapsed ? "lg:w-[76px] lg:px-2" : "lg:w-[276px]") + " lg:translate-x-0 lg:shadow-none" : ""}`} aria-label="Navigation TESS AI">
      <div className={`flex items-center gap-2 px-1 ${expanded && sidebarCollapsed ? "justify-center px-0" : ""}`}>{!(expanded && sidebarCollapsed) && <><img src="/ai_icon.jpg" alt="TESS AI" className="h-9 w-9 shrink-0 rounded-xl object-cover" /><div><p className="text-[13px] font-bold leading-tight">TESS AI</p><p className="text-[9px] font-medium text-[#6c85ad]">Votre assistant intelligent</p></div></>}<button type="button" aria-label={expanded ? (sidebarCollapsed ? "Déplier le panneau" : "Plier le panneau") : "Fermer le panneau"} onClick={() => expanded ? setSidebarCollapsed(value => !value) : setDrawer(false)} className={`${expanded && sidebarCollapsed ? "" : "ml-auto"} flex h-8 w-8 items-center justify-center rounded-lg text-[#17366c] hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-white/10`}>{expanded ? (sidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />) : <X className="h-[18px] w-[18px]" />}</button></div>
      <nav className="mt-5 space-y-0.5">{navItems.map(({ label, icon: Icon, route }, index) => <button key={label} type="button" onClick={() => goTo(route)} aria-label={expanded && sidebarCollapsed ? label : undefined} className={`flex h-[39px] w-full items-center gap-3 rounded-[8px] px-3 text-left text-[12px] font-medium ${expanded && sidebarCollapsed ? "justify-center px-0" : ""} ${index === 0 ? "bg-[#eef5ff] text-[#146bff] dark:bg-white/[0.08] dark:text-white" : "text-[#17366c] hover:bg-[#f5f8fd] dark:text-slate-200 dark:hover:bg-white/10"}`}><Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} /><span className={expanded && sidebarCollapsed ? "sr-only" : ""}>{label}</span></button>)}</nav>
      {expanded && sidebarCollapsed && <div className="relative mt-auto flex flex-col items-center gap-2 border-t border-[#e8eef6] pt-3 dark:border-slate-700">
        <button type="button" aria-label="Ouvrir le profil" onClick={() => goTo("/dashboard/ai/profile")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101725] text-sm font-semibold text-white shadow-sm transition hover:scale-105"><UserRound className="h-[17px] w-[17px]" /></button>
        <button type="button" aria-label="Changer le thème" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#17366c] transition hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-white/10">{resolvedTheme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
        <button type="button" aria-label="Choisir la langue" aria-expanded={languageOpen} onClick={() => setLanguageOpen(value => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#17366c] transition hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-white/10"><Languages className="h-[18px] w-[18px]" /></button>
        {languageOpen && <div className="absolute bottom-1 left-[68px] z-[90] w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-950/15 dark:border-slate-700 dark:bg-[#172033]">
          <p className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Langue de TESS</p>
          <select aria-label="Langue de TESS AI" value={lang} onChange={(event) => { setLang(event.target.value as "fr" | "en" | "sw"); setLanguageOpen(false); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-[#17366c] outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"><option value="fr">Français</option><option value="en">English</option><option value="sw">Kiswahili</option></select>
        </div>}
      </div>}
      {!(expanded && sidebarCollapsed) && <>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-[#e8eef6] pt-4 dark:border-slate-700"><p className="px-3 text-[12px] font-semibold text-[#17366c] dark:text-slate-200">Historique des conversations</p><div className="mt-2">{historyContent ?? <p className="px-3 text-[10px] text-[#6c85ad] dark:text-slate-400">Aucune conversation récente.</p>}</div><button type="button" onClick={() => goTo("/dashboard/ai/history")} className="mt-2 px-3 text-[10px] font-semibold text-blue-600 hover:underline dark:text-blue-300">Voir tout l’historique</button></div>
      <div className="space-y-3 pt-4"><div className="border-t border-[#e8eef6] px-3 pt-4 dark:border-slate-700"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#17366c] dark:text-slate-200">Préférences</p><button type="button" aria-label="Changer le thème" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="rounded-lg p-1.5 text-[#17366c] hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-white/10">{resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-[#6c85ad] dark:text-slate-400">Langue</span><select aria-label="Langue de TESS AI" value={lang} onChange={(event) => setLang(event.target.value as "fr" | "en" | "sw")} className="rounded-md border border-[#dfe7f1] bg-white px-2 py-1 text-xs text-[#17366c] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"><option value="fr">Français</option><option value="en">English</option><option value="sw">Kiswahili</option></select></div></div><div className="relative h-[88px] overflow-hidden rounded-[12px] bg-[#0d2b5a] px-4 py-3 text-white"><img src="/dashboard-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" /><div className="absolute inset-0 bg-gradient-to-r from-[#0b2a59]/95 to-[#123f79]/25" /><p className="relative max-w-[145px] text-sm font-semibold leading-5">Une question à la fois. Des idées plus claires.</p><ArrowRight className="relative mt-1 h-4 w-4" /></div><button type="button" onClick={() => goTo("/dashboard/ai/profile")} className="flex w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-slate-50 dark:hover:bg-white/10"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101725] text-sm font-semibold text-white"><UserRound className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-[#17366c] dark:text-slate-100">Votre profil</p><p className="text-xs text-[#16a971]">Préférences d’apprentissage</p></div><ChevronRight className="ml-auto h-4 w-4 text-[#17366c] dark:text-slate-300" /></button></div></>}
    </aside>
    <header className={`absolute inset-x-0 top-0 z-40 flex min-h-[78px] items-center gap-3 px-4 pt-[max(0px,env(safe-area-inset-top))] transition-[padding] duration-300 ease-out sm:px-5 ${expanded ? expandedSidebarOffset : ""}`}>
      <button type="button" aria-label="Ouvrir le panneau" onClick={() => setDrawer(true)} className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 ${expanded ? "lg:hidden" : ""}`}><Menu className="h-5 w-5" /></button>
      <div className={`relative z-10 flex h-12 min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-[width,flex-basis,margin] duration-300 ease-out dark:border-slate-700 dark:bg-slate-900 ${expanded ? "lg:static lg:ml-auto lg:h-10 lg:w-[180px] lg:max-w-[180px] lg:flex-none lg:rounded-xl lg:px-2.5 lg:translate-x-0" : "flex-1"}`}>
        <img src="/ai_icon.jpg" alt="TESS AI" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200 dark:ring-slate-600 lg:h-7 lg:w-7 lg:rounded-lg" />
        <div className="min-w-0"><p className="text-sm font-bold leading-tight text-[#0b1739] dark:text-white">TESS AI</p><p title={conversationTitle} className="truncate text-[10px] text-[#6c85ad] dark:text-slate-400">{conversationTitle || "Assistant pédagogique"}</p></div>
      </div>
      <div className={`relative z-10 flex h-12 shrink-0 items-center gap-0.5 rounded-2xl border border-slate-200 bg-white p-1 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${expanded ? "lg:ml-2" : "ml-auto"}`}>
        {onToggleExpanded && <button type="button" aria-label={expanded ? "Réduire TESS AI" : "Agrandir TESS AI"} onClick={onToggleExpanded} className="hidden h-10 w-10 items-center justify-center rounded-xl hover:bg-white/70 dark:hover:bg-white/10 lg:flex">{expanded ? <Minimize2 className="h-[17px] w-[17px]" /> : <Maximize2 className="h-[17px] w-[17px]" />}</button>}
        <button type="button" aria-label="Rechercher dans TESS AI" onClick={() => setSearchOpen(value => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/70 dark:hover:bg-white/10"><Search className="h-[18px] w-[18px]" /></button>
        <span className="mx-0.5 h-5 w-px bg-slate-300/70 dark:bg-white/15" aria-hidden="true" />
        <button type="button" aria-label="Fermer TESS AI" onClick={onClosePanel} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/70 dark:hover:bg-white/10"><X className="h-[18px] w-[18px]" /></button>
      </div>
      {searchOpen && <><button type="button" aria-label="Fermer la recherche" onClick={() => setSearchOpen(false)} className="fixed inset-0 z-[75] bg-slate-950/35" /><div className="fixed left-1/2 top-[88px] z-[80] flex aspect-square w-[min(22rem,calc(100vw-2rem),calc(100dvh-7rem))] -translate-x-1/2 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/15 dark:border-slate-700 dark:bg-slate-900 sm:p-5"><form onSubmit={(event) => event.preventDefault()} className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800"><Search className="h-4 w-4 shrink-0 text-[#6c85ad]" /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Rechercher dans vos conversations…" className="min-w-0 flex-1 bg-transparent text-sm text-[#17366c] outline-none dark:text-slate-100" /></form><div className="min-h-0 flex-1 overflow-y-auto pt-3">{searchLoading ? <div className="flex items-center justify-center py-8 text-sm text-slate-500">Recherche en cours…</div> : searchError ? <p className="px-2 py-5 text-center text-sm text-rose-500">{searchError}</p> : !searchQuery.trim() ? <p className="px-2 py-5 text-center text-sm text-slate-500">Saisissez un mot pour rechercher dans vos échanges.</p> : searchResults.length ? <ul className="space-y-1">{searchResults.map((item) => <li key={item.id}><button type="button" onClick={() => { setSearchOpen(false); onOpenConversation?.(item); }} className="flex min-h-12 w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/[0.08]"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title?.trim() || "Conversation sans titre"}</span><span className="mt-0.5 block text-[11px] text-slate-400">{new Date(item.updated_at).toLocaleString()}</span>{item.matches?.map((match, index) => <span key={`${item.id}-match-${index}`} className="mt-1 block line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{match}</span>)}</span></button></li>)}</ul> : <p className="px-2 py-5 text-center text-sm text-slate-500">Aucune conversation trouvée.</p>}</div></div></>}
    </header>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[78px] bg-gradient-to-b from-white/95 via-white/65 to-transparent dark:from-black/90 dark:via-black/50" />
    {audioPlayer && <div className="relative z-30 mx-4 mt-[78px] shrink-0">{audioPlayer}</div>}
    <div ref={mobileScrollRef} style={{ overscrollBehaviorY: "contain", touchAction: "pan-y" }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><section className={`mx-auto w-full max-w-[1040px] px-5 pb-24 sm:px-8 ${hasMessages ? (audioPlayer ? "pt-3" : "pt-[88px]") : "pt-10 sm:pt-12"}`}>{!hasMessages ? <div className="grid gap-10 pb-4 lg:grid-cols-[1.15fr_.85fr] lg:items-start"><div className="tess-arrive max-w-[620px]"><p className="mb-4 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--tess-accent)]">T.E.S.S. · votre atelier d’étude</p><h1 className="tess-display max-w-[590px] text-[clamp(2.2rem,5vw,4.25rem)] leading-[1.02] tracking-[-.045em] text-[var(--tess-ink)]">Qu’est-ce qu’on <span className="text-[var(--tess-accent)]">éclaircit</span> aujourd’hui&nbsp;?</h1><p className="mt-5 max-w-[500px] text-sm leading-7 text-[var(--tess-muted)]">Je suis TESS, votre compagnon d’apprentissage. On peut décomposer une notion, travailler un exercice ou regarder votre code ensemble.</p><div className="mt-8 flex flex-wrap gap-2">{actions.map(({ title, icon: ActionIcon }) => <button key={title} type="button" onClick={() => onInputChange(`${title} : `)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--tess-line)] bg-[var(--tess-surface)] px-3.5 text-xs font-semibold text-[var(--tess-ink)] transition hover:-translate-y-0.5 hover:border-[var(--tess-accent)]"><ActionIcon className="h-3.5 w-3.5 text-[var(--tess-accent)]" />{title}</button>)}</div></div><div className="tess-arrive lg:mt-2" style={{ animationDelay: "90ms" }}><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[.15em] text-[var(--tess-muted)]">Quelques portes d’entrée</h2><span className="h-px flex-1 ml-4 bg-[var(--tess-line)]" /></div><div className="divide-y divide-[var(--tess-line)] border-y border-[var(--tess-line)]">{examples.map((example, index) => <button key={example} type="button" onClick={() => onSend(example)} className="group flex min-h-[58px] w-full items-center gap-4 py-3 text-left"><span className="font-mono text-[10px] text-[var(--tess-accent)]">0{index + 1}</span><span className="flex-1 text-sm leading-5 text-[var(--tess-ink)] transition-colors group-hover:text-[var(--tess-accent)]">{example}</span><ArrowRight className="h-4 w-4 shrink-0 text-[var(--tess-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--tess-accent)]" /></button>)}</div><p className="mt-3 text-[11px] text-[var(--tess-muted)]">Vos questions peuvent aussi contenir une image ou un PDF.</p></div></div> : conversation}</section></div>
    {pullProgress > 0 && <div className="pointer-events-none absolute bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400"><div className="flex h-11 w-11 items-center justify-center rounded-full p-[3px] transition-[background] duration-75" style={{ background: pullComplete ? "#2563eb" : `conic-gradient(#2563eb ${pullProgress * 360}deg, #dbeafe 0deg)` }}><div className={`flex h-full w-full items-center justify-center rounded-full ${pullComplete ? "bg-blue-600" : "bg-[#f8fafd] dark:bg-black"}`}>{pullComplete ? <span className="flex h-full w-full items-center justify-center rounded-full bg-blue-600 text-white"><Check className="h-5 w-5" strokeWidth={3} /></span> : <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}</div></div><span>Nouveau chat</span></div>}
    <div className="shrink-0 bg-transparent px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-3"><div className="mx-auto w-full max-w-[760px]"><div className="flex min-h-[56px] items-end gap-1 rounded-[19px] border border-[#e5edf7] bg-white px-2 py-2 shadow-[0_4px_16px_rgba(33,82,140,0.12)] dark:border-[#3a3a3a] dark:bg-[#181818] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]">{composerExtras}<textarea value={input} rows={1} onChange={(event) => onInputChange(event.target.value)} onInput={(event) => { const target = event.currentTarget; target.style.height = "auto"; target.style.height = `${Math.min(target.scrollHeight, 144)}px`; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} placeholder="Posez n’importe quelle question…" className="max-h-36 min-h-9 flex-1 resize-none self-center overflow-y-auto bg-transparent px-1 py-2 text-[12px] leading-5 text-[#17366c] outline-none placeholder:text-[#89a4d0] dark:text-slate-100" /><button type="button" aria-label={input.trim() ? "Envoyer le message" : "Appeler TESS AI"} onClick={() => input.trim() ? onSend() : onCall()} disabled={isStreaming} className="order-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#146bff] text-white shadow-[0_3px_8px_rgba(20,107,255,0.28)] dark:bg-[#e8e8e8] dark:text-black dark:shadow-none disabled:opacity-40">{input.trim() ? <ArrowUp className="h-[17px] w-[17px]" /> : <Phone className="h-[15px] w-[15px]" />}</button>{(!input.trim() || isDictating) && <button type="button" aria-label={isDictating ? "Arrêter la dictée" : "Dicter un message"} onClick={onMic} disabled={isStreaming} className={`order-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDictating ? "animate-pulse bg-rose-100 text-rose-600 ring-2 ring-rose-300/60" : "text-[#17366c] dark:text-slate-300"}`}><Mic className="h-[17px] w-[17px]" /></button>}</div><p className="mt-2 text-center text-[8px] text-[#7993bc] dark:text-slate-500">Entrée pour envoyer · Shift + Entrée pour un nouveau ligne</p></div></div>
  </div>;
}
