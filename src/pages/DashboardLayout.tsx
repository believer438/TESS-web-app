// Copie Zentrix Academy : src/pages/DashboardLayout.tsx
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, Bell, BookOpen, CalendarDays, ChevronLeft, ChevronRight,
  ClipboardList, GraduationCap, HelpCircle, LayoutDashboard, Library,
  LogOut, Menu, Plus, Search, Settings, StickyNote, Upload, Users, X, Award,
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog, CONFIRM_CLOSED, type ConfirmDialogState } from "@/components/ui/confirm-dialog";
import AIPanelChat, { type AIMode } from "@/components/ai/AIPanelChat";
import type { AISection } from "@/pages/AIHubPage";

const DashboardHome = lazy(() => import("@/pages/DashboardHome"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const DocumentAIPage = lazy(() => import("@/pages/DocumentAIPage"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const QuizzesPage = lazy(() => import("@/pages/QuizzesPage"));
const NotesPage = lazy(() => import("@/pages/NotesPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));
const AdminQuizStatsPage = lazy(() => import("@/pages/AdminQuizStatsPage"));
const CourseWizardPage = lazy(() => import("@/pages/CourseWizardPage"));
const QuestionnairePage = lazy(() => import("@/pages/QuestionnairePage"));
const CertificatesPage = lazy(() => import("@/pages/CertificatesPage"));
const AIHubPage = lazy(() => import("@/pages/AIHubPage"));

function PageLoader() {
  return <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">Chargement de la page…</div>;
}

import { type CatalogueCourse, type Course } from "@/lib/backend-types";
import { apiGetMe, apiUpdateMe, clearAuth, isAuthenticated, needsLearningProfile, type UserProfile } from "@/lib/api-client";
import { useTheme } from "@/hooks/useTheme";
import { getStoredLanguage, useLanguage, type Lang } from "@/lib/i18n";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function normalizeCourseState(value: unknown): Course | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Course> & Partial<CatalogueCourse>;
  if (typeof candidate.backendId === "number" && typeof candidate.title === "string") {
    return candidate as Course;
  }
  if (typeof candidate.id !== "number" || typeof candidate.title !== "string") return null;

  const catalogue = candidate as Partial<CatalogueCourse>;
  return {
    id: `cat-${catalogue.id}`,
    backendId: catalogue.id,
    title: catalogue.title,
    description: catalogue.description ?? "",
    coverImage: catalogue.cover_image || "/cours.jpg",
    categoryId: `cat-${catalogue.category ?? "general"}`,
    categoryName: catalogue.category || "Général",
    professor: catalogue.instructor_name || "Zentrix Academy",
    difficulty: (catalogue.level ?? "beginner") as Course["difficulty"],
    estimatedDuration: catalogue.duration_hours ?? 0,
    chaptersCount: catalogue.chapters?.length ?? 0,
    lessonsCount: catalogue.chapters?.length ?? 0,
    enrolledCount: catalogue.enrolled_count ?? 0,
    progress: 0,
    isEnrolled: Boolean(catalogue.is_enrolled),
    isFeatured: Boolean(catalogue.is_published),
    tags: typeof catalogue.tags === "string"
      ? catalogue.tags.split(",").map(tag => tag.trim()).filter(Boolean)
      : [],
  };
}

const navItems = [
  { id: "",               labelKey: "nav.dashboard", icon: LayoutDashboard },
  { id: "courses",        labelKey: "nav.courses", icon: BookOpen },
  { id: "document-ai",   labelKey: "nav.documentAI", icon: Upload },
  { id: "library",        labelKey: "nav.library", icon: Library },
  { id: "certificates",   labelKey: "nav.certificates", icon: Award },
  { id: "calendar",       labelKey: "nav.calendar", icon: CalendarDays },
  { id: "quizzes",        labelKey: "nav.quizzes", icon: HelpCircle },
  { id: "questionnaires", labelKey: "nav.questionnaires", icon: ClipboardList },
  { id: "notes",          labelKey: "nav.notes", icon: StickyNote },
  { id: "analytics",      labelKey: "nav.analytics", icon: BarChart3 },
];

const bottomItems = [
  { id: "notifications", labelKey: "nav.notifications", icon: Bell },
  { id: "settings",      labelKey: "nav.settings", icon: Settings },
];

const adminItems = [
  { id: "create-course", labelKey: "nav.newCourse", icon: Plus },
  { id: "users",         labelKey: "nav.users", icon: Users },
  { id: "quiz-stats",    labelKey: "nav.quizStats", icon: ClipboardList },
];

function pageTitle(segment: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    "":               "nav.dashboard",
    "courses":        "nav.courses",
    "course-detail":  "nav.courseDetail",
    "document-ai":    "nav.documentAI",
    "library":        "nav.library",
    "certificates":   "nav.certificates",
    "calendar":       "nav.calendar",
    "quizzes":        "nav.quizzes",
    "questionnaires": "nav.questionnaires",
    "notes":          "nav.notes",
    "analytics":      "nav.analytics",
    "notifications":  "nav.notifications",
    "settings":       "nav.settings",
    "users":          "nav.users",
    "quiz-stats":     "nav.quizStats",
    "create-course":  "nav.createCourse",
    "edit-course":    "nav.editCourse",
    "ai":             "TESS AI",
  };
  const key = map[segment];
  return key ? (key.includes(".") ? t(key) : key) : t("nav.dashboard");
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  useTheme();
  const { lang, setLang, t } = useLanguage();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiOpenToken, setAiOpenToken] = useState(0);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [aiWidth, setAiWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef      = useRef(false);
  const resizeStartX     = useRef(0);
  const resizeStartWidth = useRef(0);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);
  const wasAiOpenRef = useRef(false);
  const sidebarStateBeforeAIRef = useRef(false);
  const collapsedForAIRef = useRef(false);

  const segment = useMemo(() => {
    const parts = location.pathname.replace(/^\/(dashboard|workspace)/, "").replace(/^\//, "");
    return parts.split("/")[0];
  }, [location.pathname]);
  const aiSection = useMemo(() => {
    if (!location.pathname.startsWith("/dashboard/ai/")) return null;
    const value = location.pathname.split("/")[3] as AISection;
    return ["history", "files", "projects", "memory", "plugins", "settings", "profile"].includes(value) ? value : null;
  }, [location.pathname]);
  const canonicalAiWorkspace = location.pathname === "/dashboard/ai" || location.pathname.startsWith("/dashboard/ai/");
  const aiRouteIndex = useMemo(() => location.pathname.split("/").lastIndexOf("ai"), [location.pathname]);
  const aiRouteActive = aiRouteIndex >= 0 && location.pathname.startsWith("/dashboard/");
  const aiRouteBasePath = useMemo(() => {
    if (!aiRouteActive) return location.pathname;
    const parts = location.pathname.split("/");
    return parts.slice(0, aiRouteIndex).join("/") || "/dashboard";
  }, [aiRouteActive, aiRouteIndex, location.pathname]);
  const aiConversationId = useMemo(() => {
    if (!aiRouteActive) return null;
    const value = Number(location.pathname.split("/")[aiRouteIndex + 1]);
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [aiRouteActive, aiRouteIndex, location.pathname]);

  const selectedCourse = useMemo(
    () => normalizeCourseState((location.state as { course?: unknown } | null)?.course),
    [location.state],
  );

  const aiMode: AIMode = useMemo(() => {
    if (segment === "document-ai") return "document";
    if (segment === "course-detail") return "course";
    return "assistant";
  }, [segment]);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login", { replace: true }); return; }
    apiGetMe().then((user) => {
      if (needsLearningProfile(user)) {
        navigate("/login?onboarding=1&redirect=%2Fdashboard", { replace: true });
        return;
      }
      setCurrentUser(user);
      if (!getStoredLanguage() && user.preferred_language) {
         setLang(user.preferred_language === "sw" ? "sw" : user.preferred_language === "en" ? "en" : "fr");
      }
    }).catch(() => {
      // Une indisponibilité temporaire de l'API ne doit pas détruire la
      // session ni renvoyer l'utilisateur en boucle vers /login. apiFetch
      // efface déjà la session lorsqu'il s'agit réellement d'un 401.
      if (!isAuthenticated()) navigate("/login", { replace: true });
    });
  }, [navigate, setLang]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Every AI route opens the same contextual panel. Its size is controlled by
  // the current expanded state, so navigating between AI sections never
  // ejects the user into a separate page layout.
  useEffect(() => {
    if (aiRouteActive) setAiOpen(true);
  }, [aiRouteActive]);

  useEffect(() => {
    const handler = () => {
      setViewportWidth(window.innerWidth);
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // A pushed panel must not turn the workspace into a narrow-column layout.
  // On normal desktop widths we recover the sidebar's space while the panel is
  // open; on smaller desktops the panel is presented as an overlay instead.
  useEffect(() => {
    const wasOpen = wasAiOpenRef.current;
    if (aiOpen && !wasOpen && !isMobile && viewportWidth < 1720 && !collapsed) {
      sidebarStateBeforeAIRef.current = collapsed;
      collapsedForAIRef.current = true;
      setCollapsed(true);
    }
    if (!aiOpen && wasOpen && collapsedForAIRef.current) {
      setCollapsed(sidebarStateBeforeAIRef.current);
      collapsedForAIRef.current = false;
    }
    wasAiOpenRef.current = aiOpen;
  }, [aiOpen, collapsed, isMobile, viewportWidth]);

  // Collapse the sidebar automatically when the user opens a course
  useEffect(() => {
    if (segment === "course-detail") setCollapsed(true);
  }, [segment]);

  useEffect(() => {
    if (!profileOpen) return;
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [profileOpen]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = resizeStartX.current - e.clientX;
      setAiWidth(Math.max(340, Math.min(700, resizeStartWidth.current + delta)));
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    resizingRef.current      = true;
    resizeStartX.current     = e.clientX;
    resizeStartWidth.current = aiWidth;
    setIsResizing(true);
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [aiWidth]);

  const handleNavigate = useCallback((page: string, data?: unknown) => {
    setMobileOpen(false);
    if (page === "ai-chat") { navigate("/dashboard/ai"); return; }
    if (page === "calendar") { navigate("/dashboard#dashboard-calendar"); return; }
    const routes: Record<string, string> = {
      dashboard:        "/dashboard",
      courses:          "/dashboard/courses",
      certificates:     "/dashboard/certificates",
      "course-detail":  "/dashboard/course-detail",
      "document-ai":    "/dashboard/document-ai",
      library:          "/dashboard/library",
      quizzes:          "/dashboard/quizzes",
      questionnaires:   "/workspace/questionnaires",
      revision:         "/dashboard/quizzes",
      notes:            "/dashboard/notes",
      analytics:        "/dashboard/analytics",
      notifications:    "/dashboard/notifications",
      settings:         "/dashboard/settings",
      users:            "/dashboard/users",
      "quiz-stats":     "/dashboard/quiz-stats",
      "create-course":  "/dashboard/create-course",
      "edit-course":    "/dashboard/edit-course",
      ai:               "/dashboard/ai",
    };
    const path = routes[page] ?? "/dashboard";
    if (data) {
      if (page === "course-detail") navigate(path, { state: { course: data as Course } });
      else if (page === "edit-course") navigate(path, { state: { editCourse: data } });
      else navigate(path, { state: data });
    } else {
      navigate(path);
    }
  }, [navigate]);

  const closeAssistant = useCallback(() => {
    setAiOpen(false);
    setAiExpanded(false);
    if (aiRouteActive) navigate(aiRouteBasePath, { replace: true, state: location.state });
  }, [aiRouteActive, aiRouteBasePath, location.state, navigate]);

  const openAIChat = useCallback(() => {
    if (!aiRouteActive) {
      navigate(`${location.pathname.replace(/\/$/, "")}/ai`, { state: location.state });
    }
    setAiOpen(true);
    setAiOpenToken(value => value + 1);
  }, [aiRouteActive, location.pathname, location.state, navigate]);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const handleLogout = () => { clearAuth(); setCurrentUser(null); navigate("/", { replace: true }); };

  // ── Draggable AI button (mobile only) ────────────────────────────────────────
  const [btnCustomPos, setBtnCustomPos] = useState<{ top: number; left: number } | null>(null);
  const btnDragRef = useRef<{
    startPX: number; startPY: number;
    startBtnTop: number; startBtnLeft: number;
    moved: boolean;
  } | null>(null);

  // Reset drag position whenever the segment changes (document-ai ↔ other pages)
  useEffect(() => { setBtnCustomPos(null); }, [segment]);

  const handleBtnPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    btnDragRef.current = {
      startPX: e.clientX, startPY: e.clientY,
      startBtnTop: rect.top, startBtnLeft: rect.left,
      moved: false,
    };
  }, [isMobile]);

  const handleBtnPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isMobile || !btnDragRef.current) return;
    const dx = e.clientX - btnDragRef.current.startPX;
    const dy = e.clientY - btnDragRef.current.startPY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      btnDragRef.current.moved = true;
      setBtnCustomPos({
        top:  Math.max(8,  Math.min(window.innerHeight - 64, btnDragRef.current.startBtnTop  + dy)),
        left: Math.max(8,  Math.min(window.innerWidth  - 64, btnDragRef.current.startBtnLeft + dx)),
      });
    }
  }, [isMobile]);

  const handleBtnPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isMobile || !btnDragRef.current) return;
    if (!btnDragRef.current.moved) openAIChat();
    btnDragRef.current = null;
  }, [isMobile, openAIChat]);

  // Compute fixed position for mobile button
  const mobileBtnStyle = useMemo((): React.CSSProperties => {
    if (!isMobile) return {};
    if (btnCustomPos) return { position: "fixed", top: btnCustomPos.top, left: btnCustomPos.left, right: "auto", bottom: "auto" };
    if (segment === "document-ai") return { position: "fixed", bottom: 24, left: 24, right: "auto" };
    return { position: "fixed", bottom: 24, right: 24, left: "auto" };
  }, [isMobile, btnCustomPos, segment]);
  const useAIPushPanel = !isMobile && viewportWidth >= 1320;
  const effectiveAiWidth = Math.max(340, Math.min(aiWidth, Math.max(340, viewportWidth - 68 - 900)));
  const expandedAiWidth = viewportWidth;
  const openLogoutConfirm = () => setLogoutConfirmOpen(true);

  const isActive = (id: string) => segment === id || (id === "calendar" && segment === "" && location.hash === "#dashboard-calendar");
  const isAdmin = currentUser?.role === "admin";

  const roleLabel: Record<string, string> = {
    admin: t("roles.admin"), professor: t("roles.professor"), student: t("roles.student"),
  };
  const roleColor: Record<string, string> = {
    admin:     "bg-[#FF6B00]/10 text-[#FF6B00]",
    professor: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    student:   "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  };

  function NavButton({ id, label, Icon, mobile = false }: { id: string; label: string; Icon: React.ElementType; mobile?: boolean }) {
    const active = isActive(id);
    return (
      <button
        key={id}
        onClick={() => handleNavigate(id || "dashboard")}
        title={collapsed && !mobile ? label : undefined}
        className={`group flex w-full items-center rounded-lg transition-all ${
          collapsed && !mobile ? "justify-center p-3" : "gap-2 px-2.5 py-2.5"
        } ${
          active
            ? "bg-[#FF6B00]/10 text-[#FF6B00]"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        }`}
      >
        <Icon style={{ width: 20, height: 20 }} className={`flex-shrink-0 ${active ? "text-[#FF6B00]" : ""}`} />
        {(!collapsed || mobile) && (
          <span className={`text-sm font-medium ${active ? "font-semibold" : ""}`}>{label}</span>
        )}
        {active && (!collapsed || mobile) && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
        )}
      </button>
    );
  }

  function SidebarContent({ mobile = false }: { mobile?: boolean }) {
    return (
      <div className={`flex h-full min-h-0 flex-col bg-white dark:bg-slate-900 ${mobile ? "" : "border-r border-slate-200 dark:border-slate-800"}`}>
        {/* Logo */}
        <div className={`flex items-center border-b border-slate-100 dark:border-slate-800 ${collapsed && !mobile ? "justify-center px-2 py-3" : "gap-2 px-3 py-3"}`}>
          <img src="/zentrix.avif" alt="Zentrix" className="h-9 w-9 flex-shrink-0 object-contain" />
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-800 dark:text-slate-100">Zentrix</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Academy</p>
            </div>
          )}
          {mobile && (
            <button onClick={() => setMobileOpen(false)} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Everything between the logo and the account stays in one scroll
            region, so admin links cannot get trapped below a fixed nav. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Main nav */}
          <nav className="px-2 py-2 space-y-0.5">
            {navItems.map(({ id, labelKey, icon: Icon }) => (
              <NavButton key={id} id={id} label={t(labelKey)} Icon={Icon} mobile={mobile} />
            ))}
          </nav>

          {/* Bottom items and admin links intentionally scroll with the menu. */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-2 py-2 space-y-0.5">
            {bottomItems.map(({ id, labelKey, icon: Icon }) => {
              const label = t(labelKey);
              const active = isActive(id);
              return (
                <button
                  key={id}
                  onClick={() => handleNavigate(id)}
                  title={collapsed && !mobile ? label : undefined}
                  className={`group flex w-full items-center rounded-lg transition-all ${
                      collapsed && !mobile ? "justify-center p-3" : "gap-2 px-2.5 py-2.5"
                  } ${
                    active
                      ? "bg-[#FF6B00]/10 text-[#FF6B00]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Icon style={{ width: 20, height: 20 }} className="flex-shrink-0" />
                  {(!collapsed || mobile) && <span className="text-sm font-medium">{label}</span>}
                </button>
              );
            })}

            {/* Admin items — included in the same scroll region as the menu. */}
            {isAdmin && (
              <>
                <div className="mx-2 my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
                {adminItems.map(({ id, labelKey, icon: Icon }) => (
                  <NavButton key={id} id={id} label={t(labelKey)} Icon={Icon} mobile={mobile} />
                ))}
              </>
            )}
          </div>

          {!collapsed && !mobile && (
            <div className="relative mx-3 mb-3 min-h-[132px] overflow-hidden rounded-xl bg-slate-950 px-4 py-4 text-white">
              <img src="/dashboard-sidebar.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-blue-950/50" />
              <div className="relative max-w-[175px] text-xs leading-5"><p className="font-semibold">Tu es plus proche</p><p className="text-slate-300">de tes objectifs que tu ne le penses.</p><span className="mt-2 block h-px w-7 bg-blue-400" /></div>
            </div>
          )}
        </div>

        {/* User info */}
        {currentUser && (
          <div className={`border-t border-slate-100 dark:border-slate-800 p-3 ${collapsed && !mobile ? "flex justify-center" : ""}`}>
            {collapsed && !mobile ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white shadow-sm shadow-blue-500/30">
                {initials(currentUser.full_name)}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white shadow-sm shadow-blue-500/30">
                  {initials(currentUser.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {currentUser.full_name ?? currentUser.email.split("@")[0]}
                  </p>
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${roleColor[currentUser.role] ?? roleColor.student}`}>
                    {roleLabel[currentUser.role] ?? currentUser.role}
                  </span>
                </div>
                <button onClick={openLogoutConfirm} title="Déconnexion" className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut style={{ width: 16, height: 16 }} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderPage() {
    switch (segment) {
      case "":              return <DashboardHome onNavigate={handleNavigate} isAdmin={isAdmin} />;
      case "courses":       return <CoursesPage onNavigate={handleNavigate} isAdmin={isAdmin} />;
      case "course-detail":
        return selectedCourse
          ? <CourseDetail course={selectedCourse} onBack={() => handleNavigate("courses")} onOpenAI={openAIChat} />
          : <CoursesPage onNavigate={handleNavigate} isAdmin={isAdmin} />;
      case "document-ai":   return <DocumentAIPage onContinueWithAI={openAIChat} />;
      case "library":       return <LibraryPage onOpenAI={openAIChat} />;
      case "certificates":  return <CertificatesPage onNavigate={handleNavigate} />;
      case "calendar":      return <DashboardHome onNavigate={handleNavigate} isAdmin={isAdmin} />;
      case "quizzes":       return <QuizzesPage onOpenAI={openAIChat} />;
      case "questionnaires": return <QuestionnairePage />;
      case "notes":         return <NotesPage onOpenAI={openAIChat} />;
      case "analytics":     return <AnalyticsPage />;
      case "notifications": return <NotificationsPage onNavigate={handleNavigate} />;
      case "settings":      return <SettingsPage />;
      case "users":         return isAdmin ? <AdminUsersPage /> : <DashboardHome onNavigate={handleNavigate} isAdmin={false} />;
      case "quiz-stats":    return isAdmin ? <AdminQuizStatsPage /> : <DashboardHome onNavigate={handleNavigate} isAdmin={false} />;
      case "create-course": return isAdmin ? <CourseWizardPage onNavigate={handleNavigate} /> : <DashboardHome onNavigate={handleNavigate} isAdmin={false} />;
      case "edit-course":   return isAdmin ? <CourseWizardPage onNavigate={handleNavigate} /> : <DashboardHome onNavigate={handleNavigate} isAdmin={false} />;
      case "ai":             return <DashboardHome onNavigate={handleNavigate} isAdmin={isAdmin} />;
      default:              return <DashboardHome onNavigate={handleNavigate} isAdmin={isAdmin} />;
    }
  }

  const renderAIContent = () => aiSection ? <AIHubPage section={aiSection} onClose={closeAssistant} expanded={aiExpanded} onExpandedChange={setAiExpanded} /> : <AIPanelChat
    push
    isOpen={aiOpen}
    onClose={closeAssistant}
    isExpanded={aiExpanded}
    onExpandedChange={setAiExpanded}
    contextCourse={segment === "course-detail" && selectedCourse ? selectedCourse.title : undefined}
    contextCoursId={undefined}
    contextCourseId={segment === "course-detail" && selectedCourse ? (selectedCourse as { backendId?: number }).backendId : undefined}
    mode={aiMode}
    initialConversationId={aiConversationId}
    // Keep TESS addressable on the current page (/current-page/ai), without
    // ejecting the user into the standalone dashboard AI route.
    routeConversations={aiRouteActive}
    conversationRouteBase={aiRouteBasePath}
    conversationRouteState={location.state}
    openChatToken={aiOpenToken}
  />;

  // Canonical TESS routes are a full workspace, not a drawer over the academic
  // dashboard. Contextual assistants (course, document and lesson routes)
  // continue using the existing resizable panel below.
  if (canonicalAiWorkspace) {
    return (
      <TooltipProvider>
        <div className="tess-workspace h-[100dvh] min-h-[100svh] overflow-hidden">
          <div className="h-full min-h-0">
            {aiSection ? (
              <AIHubPage
                section={aiSection}
                onClose={() => navigate("/dashboard")}
                expanded={!isMobile}
              />
            ) : (
              <AIPanelChat
                isOpen
                push
                onClose={() => navigate("/dashboard")}
                isExpanded={!isMobile}
                initialConversationId={aiConversationId}
                routeConversations
                conversationRouteBase="/dashboard/ai"
                conversationRouteState={location.state}
                openChatToken={aiOpenToken}
                mode="assistant"
              />
            )}
          </div>
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] min-h-[100svh] overflow-hidden bg-[#f4f6fb] dark:bg-slate-950 transition-colors duration-200">

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Mobile sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <SidebarContent mobile />
        </div>

        {/* Desktop sidebar — masqué complètement en mode cours */}
        <div className={`relative hidden flex-shrink-0 transition-all duration-300 lg:flex overflow-hidden ${segment === "course-detail" ? "w-0" : collapsed ? "w-[68px]" : "w-[240px]"}`}>
          <div className="absolute inset-0">
            <SidebarContent />
          </div>
        </div>

        {/* Sidebar collapse toggle — fixed so it's always visible and overlaid */}
        {segment !== "course-detail" && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`fixed top-[72px] z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-[left] duration-300 hover:text-slate-600 lg:flex dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-300 ${
              collapsed ? "left-[56px]" : "left-[228px]"
            }`}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-[#0f1219] lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 lg:hidden dark:border-slate-700 dark:text-slate-400"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button onClick={() => handleNavigate("dashboard")} className="flex shrink-0 items-center gap-2.5 text-left lg:hidden">
                <img src="/zentrix.avif" alt="" className="h-8 w-8 object-contain" />
                <span className="hidden sm:block"><span className="block text-base font-bold leading-tight text-slate-900 dark:text-white">Zentrix <span className="font-medium text-blue-600">Academy</span></span><span className="block text-[9px] leading-tight text-slate-500">Apprendre aujourd’hui, construire demain</span></span>
              </button>
            </div>

            <form className="mx-auto hidden w-full max-w-[520px] md:block" onSubmit={(event) => { event.preventDefault(); navigate(dashboardSearch.trim() ? `/dashboard/courses?q=${encodeURIComponent(dashboardSearch.trim())}` : "/dashboard/courses"); }}>
              <label className="flex h-10 items-center gap-3 rounded-full border border-slate-200 bg-slate-50/80 px-4 text-slate-400 transition focus-within:border-blue-300 focus-within:bg-white dark:border-slate-700 dark:bg-slate-900 dark:focus-within:bg-slate-800"><Search className="h-4 w-4 shrink-0"/><input aria-label="Rechercher un cours, une formation ou un sujet" value={dashboardSearch} onChange={(event) => setDashboardSearch(event.target.value)} placeholder="Rechercher un cours, une formation, un sujet…" className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200" /></label>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <label className="sr-only" htmlFor="workspace-language">{t("app.language")}</label>
              <select
                id="workspace-language"
                aria-label={t("app.language")}
                value={lang}
                onChange={(event) => {
                  const next = event.target.value as Lang;
                  setLang(next);
                  if (isAuthenticated()) void apiUpdateMe({ preferred_language: next }).catch(() => {});
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="sw">SW</option>
              </select>
              <button
                onClick={() => handleNavigate("notifications")}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Bell className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </button>

              {currentUser && (
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-[#2563EB]/35 bg-[#EFF6FF] px-2.5 py-1.5 transition hover:border-[#2563EB] hover:bg-[#DBEAFE] dark:border-blue-400/40 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white shadow-sm shadow-blue-500/30">
                      {initials(currentUser.full_name)}
                    </div>
                    <span className="hidden max-w-[100px] truncate text-sm font-medium text-slate-700 sm:block dark:text-slate-200">
                      {currentUser.full_name ?? currentUser.email.split("@")[0]}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {currentUser.full_name ?? "Utilisateur"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</p>
                        <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${roleColor[currentUser.role] ?? roleColor.student}`}>
                          {roleLabel[currentUser.role] ?? currentUser.role}
                        </span>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => { setProfileOpen(false); handleNavigate("settings"); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Settings className="h-4 w-4 text-slate-400" />
                          Paramètres
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setProfileOpen(false); handleNavigate("users"); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Users className="h-4 w-4 text-slate-400" />
                            Gestion utilisateurs
                          </button>
                        )}
                      </div>
                      <div className="border-t border-slate-100 py-1 dark:border-slate-800">
                        <button
                          onClick={() => { setProfileOpen(false); openLogoutConfirm(); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <LogOut className="h-4 w-4" />
                          Se déconnecter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto @container">
            <Suspense fallback={<PageLoader />}>{renderPage()}</Suspense>
          </main>
        </div>

        {/* AI Push Panel — desktop only (sm+) */}
        {!isMobile && useAIPushPanel && (
          <div
            className={`flex-shrink-0 overflow-hidden ${aiExpanded ? "fixed inset-0 z-[70] h-[100dvh] w-screen border-0 shadow-2xl" : ""}`}
            style={{
              width: aiOpen ? (aiExpanded ? expandedAiWidth : effectiveAiWidth + 12) : 0,
              height: aiExpanded ? "100dvh" : undefined,
              transition: isResizing ? "none" : "width 0.32s cubic-bezier(0.4,0,0.2,1)",
              willChange: "width",
            }}
          >
            <div className="flex h-full">
              <div className={`${aiExpanded ? "hidden" : "relative w-3 flex-shrink-0 border-l border-r border-slate-200 bg-[#f4f6fb] dark:border-slate-700 dark:bg-slate-950"}`}>
                <div className="absolute inset-x-0 top-0 h-10 rounded-br-2xl bg-white dark:bg-[#0f1219]" />
                <div
                  onMouseDown={onResizeStart}
                  className="group absolute inset-0 z-10 cursor-col-resize"
                  title="Glisser pour redimensionner"
                >
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col items-center justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <span className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <span className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <span className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                  </div>
                  {isResizing && (
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[#FF6B00]/60" />
                  )}
                </div>
              </div>
              <div className={`flex min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#0f1219] ${aiExpanded ? "" : "rounded-tl-2xl border-l border-t border-slate-200 dark:border-slate-800"}`}>
                {renderAIContent()}
              </div>
            </div>
          </div>
        )}

        {/* At narrower desktop widths the assistant overlays the workspace.
            This keeps every page at a usable reading width instead of
            compressing grids, forms and editors into a thin column. */}
        {!isMobile && !useAIPushPanel && (
          <div
            aria-hidden={!aiOpen}
            className={`fixed ${aiExpanded ? "inset-0 z-[70] h-[100dvh]" : "inset-y-0 right-0 z-[60]"} flex overflow-hidden border-l border-slate-200 bg-white shadow-2xl transition-[width,visibility] duration-300 dark:border-slate-800 dark:bg-[#0f1219] ${aiOpen ? "visible" : "invisible pointer-events-none"}`}
            style={{ width: aiExpanded ? expandedAiWidth : Math.min(Math.max(340, viewportWidth - 32), Math.min(aiWidth, 460)) }}
          >
            <div className={`${aiExpanded ? "hidden" : "relative w-3 flex-shrink-0 border-r border-slate-200 bg-[#f4f6fb] dark:border-slate-700 dark:bg-slate-950"}`}>
              <div
                onMouseDown={onResizeStart}
                className="group absolute inset-0 z-10 cursor-col-resize"
                title="Glisser pour redimensionner"
              >
                <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col items-center justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <span className="h-1 w-1 rounded-full bg-slate-400" />
                  <span className="h-1 w-1 rounded-full bg-slate-400" />
                  <span className="h-1 w-1 rounded-full bg-slate-400" />
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {renderAIContent()}
            </div>
          </div>
        )}

        {/* AI Overlay — mobile fullscreen */}
        {isMobile && (
          <div aria-hidden={!aiOpen} className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-white transition-[visibility] dark:bg-[#0f1219] ${aiOpen ? "visible" : "invisible pointer-events-none"}`}>
            {renderAIContent()}
          </div>
        )}

        {!aiOpen && (
          isMobile ? (
            /* ── Mobile: icon-only, draggable, left on document-ai ── */
            <button
              title="TESS AI"
              onPointerDown={handleBtnPointerDown}
              onPointerMove={handleBtnPointerMove}
              onPointerUp={handleBtnPointerUp}
              className="z-40 flex h-14 w-14 touch-none select-none items-center justify-center overflow-hidden rounded-2xl border border-blue-200 bg-white p-1 shadow-lg shadow-slate-900/20 active:scale-95 dark:border-blue-400/40 dark:bg-slate-900"
              style={mobileBtnStyle}
            >
              <img src="/ai_icon.jpg" alt="TESS AI" className="h-full w-full rounded-xl object-cover" />
            </button>
          ) : (
            /* ── Desktop: icon-only, fixed bottom-left on document-ai, else bottom-right ── */
            <button
              onClick={openAIChat}
              className={`fixed bottom-6 ${segment === "document-ai" ? "left-6" : "right-6"} z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-blue-200 bg-white p-1 shadow-lg shadow-slate-900/20 transition-all hover:scale-105 hover:border-blue-400 hover:shadow-xl active:scale-95 dark:border-blue-400/40 dark:bg-slate-900`}
            >
              <img src="/ai_icon.jpg" alt="TESS AI" className="h-full w-full rounded-xl object-cover" />
            </button>
          )
        )}
      </div>
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Se déconnecter ?"
        description="Vous allez quitter votre session Zentrix Academy. Vous devrez vous reconnecter pour accéder à votre espace."
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={() => { setLogoutConfirmOpen(false); handleLogout(); }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
      <Toaster />
      <SonnerToaster richColors position="top-right" />
    </TooltipProvider>
  );
}

