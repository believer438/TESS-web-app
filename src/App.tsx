// Copie Zentrix Academy : src/App.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/useTheme";
import SiteFooter from "@/components/layout/SiteFooter";
import CoursesPage from "@/pages/CoursesPage";
import Dashboard from "@/pages/Dashboard";
import AIPanelChat from "@/components/ai/AIPanelChat";
import AboutPage from "@/pages/AboutPage";
import AuthPage from "@/pages/AuthPage";
import GoogleCallbackPage from "@/pages/GoogleCallbackPage";
import GoogleAuthSuccess from "@/pages/GoogleAuthSuccess";
import DashboardLayout from "@/pages/DashboardLayout";
import PublicQuestionnairePage from "@/pages/PublicQuestionnairePage";
import { apiGetMe, apiUpdateMe, clearAuth, isAuthenticated, type UserProfile } from "@/lib/api-client";
import { getStoredLanguage, useLanguage, type Lang } from "@/lib/i18n";
import {
  BookOpen, ChevronDown, Facebook, GraduationCap, Instagram,
  LayoutDashboard, Linkedin, LogOut, Menu, MessageCircle, Settings, Shield,
  Twitter, X, Youtube,
} from "lucide-react";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// ── Public header ─────────────────────────────────────────────────────────────
function PublicHeader({
  currentUser,
  onLogout,
}: {
  currentUser: UserProfile | null;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [profileOpen]);

  const isAuth = isAuthenticated() && !!currentUser;

  const roleLabel: Record<string, string> = {
    admin: t("roles.admin"), professor: t("roles.professor"), student: t("roles.student"),
  };
  const roleColor: Record<string, string> = {
    admin:     "bg-[#FF6B00]/10 text-[#FF6B00]",
    professor: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    student:   "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#0f1219]">
      {/* Social bar */}
      <div className="bg-[#0f0f1a] px-4 py-1.5 sm:px-8">
        <div className="flex items-center justify-end gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            {([Facebook, Twitter, Instagram, Linkedin, Youtube] as const).map((Icon, i) => (
              <button key={i} aria-label={["Facebook", "Twitter", "Instagram", "LinkedIn", "YouTube"][i]} className="text-white/80 transition-colors hover:text-white">
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-8">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex flex-shrink-0 items-center gap-2.5">
            <img src="/zentrix.avif" alt="Zentrix" className="h-9 w-9 object-contain" />
            <span className="hidden text-xs font-bold uppercase tracking-[0.22em] text-slate-500 sm:inline dark:text-slate-400">
              Zentrix Academy
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {[
              { label: t("app.home"), path: "/" },
              { label: t("app.allCourses"), path: "/courses" },
              { label: t("app.about"), path: "/about" },
            ].map(({ label, path }) => {
              const active = location.pathname === path || (path === "/courses" && location.pathname.startsWith("/courses"));
              const dest = path === "/courses" && isAuth ? "/dashboard/courses" : path;
              return (
                <button
                  key={path}
                  onClick={() => navigate(dest)}
                  className={`group relative px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "text-[#FF6B00]" : "text-slate-600 hover:text-[#FF6B00] dark:text-slate-300"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`absolute bottom-0 left-0 h-[2px] w-full origin-left bg-[#FF6B00] transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`} />
                </button>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="site-language">{t("app.language")}</label>
            <select
              id="site-language"
              aria-label={t("app.language")}
              value={lang}
              onChange={(event) => {
                const next = event.target.value as Lang;
                setLang(next);
                if (currentUser) void apiUpdateMe({ preferred_language: next }).catch(() => {});
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-blue-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="fr">FR</option>
              <option value="en">EN</option>
               <option value="sw">SW</option>
            </select>
            {isAuth && currentUser ? (
              <div className="hidden items-center gap-2 md:flex">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#FF6B00]" />
                  {t("app.dashboard")}
                </button>
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full border border-[#d8c8ba] bg-[#f7f2ed] px-2 py-1.5 transition hover:border-[#a65321] hover:bg-[#efe3d8] dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#9b552c] text-[11px] font-bold text-white shadow-sm shadow-black/20">
                      {initials(currentUser.full_name)}
                    </div>
                    <span className="hidden max-w-[100px] truncate text-sm font-medium text-slate-700 sm:block dark:text-slate-200">
                      {currentUser.full_name ?? currentUser.email}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {currentUser.full_name ?? t("app.user")}
                        </p>
                        <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
                        <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${roleColor[currentUser.role] ?? roleColor.student}`}>
                          {roleLabel[currentUser.role] ?? currentUser.role}
                        </span>
                      </div>
                      <div className="py-1">
                        <button onClick={() => { setProfileOpen(false); navigate("/dashboard"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                          <LayoutDashboard className="h-4 w-4 text-slate-400" /> {t("app.dashboardMine")}
                        </button>
                        <button onClick={() => { setProfileOpen(false); navigate("/dashboard/settings"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                          <Settings className="h-4 w-4 text-slate-400" /> {t("app.settings")}
                        </button>
                        {currentUser.role === "admin" && (
                          <button onClick={() => { setProfileOpen(false); navigate("/dashboard/users"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                            <Shield className="h-4 w-4 text-slate-400" /> {t("nav.users")}
                          </button>
                        )}
                      </div>
                      <div className="border-t border-slate-100 py-1 dark:border-slate-800">
                        <button onClick={() => { setProfileOpen(false); onLogout(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                          <LogOut className="h-4 w-4" /> {t("app.logout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <button onClick={() => navigate("/login")} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#FF6B00] dark:text-slate-300">
                  {t("app.login")}
                </button>
                <button onClick={() => navigate("/login?mode=register")} className="rounded-lg bg-[#111318] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#292c33] focus-visible:outline-white">
                  {t("app.signup")}
                </button>
              </div>
            )}
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden dark:border-slate-800 dark:text-slate-300"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-[#0f1219]">
          {isAuth && currentUser && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#9b552c] text-xs font-bold text-white shadow-sm shadow-black/20">
                {initials(currentUser.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentUser.full_name ?? "Utilisateur"}</p>
                <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
              </div>
            </div>
          )}
          <div className="space-y-1">
          <button onClick={() => navigate("/")} className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t("app.home")}</button>
            <button onClick={() => navigate(isAuth ? "/dashboard/courses" : "/courses")} className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t("app.allCourses")}</button>
            <button onClick={() => navigate("/about")} className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t("app.about")}</button>
            {isAuth ? (
              <>
                <button onClick={() => navigate("/dashboard")} className="flex w-full items-center gap-2 rounded-lg bg-[#FF6B00]/10 px-4 py-2.5 text-sm font-semibold text-[#FF6B00]">
                  <LayoutDashboard className="h-4 w-4" /> {t("app.dashboardMine")}
                </button>
                <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400">
                  <LogOut className="h-4 w-4" /> {t("app.logout")}
                </button>
              </>
            ) : (
              <button onClick={() => navigate("/login")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white">
                <GraduationCap className="h-4 w-4" /> {t("app.loginOrSignup")}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ── Shared navigate handler (public) ──────────────────────────────────────────
function usePublicNavigate() {
  const navigate = useNavigate();
  return (page: string, data?: unknown) => {
    if (page === "course-detail") {
      if (!isAuthenticated()) { navigate("/login?redirect=/dashboard/courses"); return; }
      navigate("/dashboard/course-detail", { state: { course: data } });
      return;
    }
    if (page === "courses") {
      const query = typeof data === "string" ? data.trim() : "";
      const path = isAuthenticated() ? "/dashboard/courses" : "/courses";
      navigate(query ? `${path}?q=${encodeURIComponent(query)}` : path);
      return;
    }
    if (!isAuthenticated()) { navigate("/login?redirect=/dashboard"); return; }
    navigate(`/dashboard/${page}`, data ? { state: data } : undefined);
  };
}

// ── Public home (hero + sections) ─────────────────────────────────────────────
function PublicHome({ onOpenAI }: { onOpenAI?: () => void }) {
  const onNavigate = usePublicNavigate();
  return <Dashboard onNavigate={onNavigate} onOpenAI={onOpenAI} />;
}

// ── Public catalogue wrapper ──────────────────────────────────────────────────
function PublicCatalog() {
  const navigate = useNavigate();
  const onNavigate = usePublicNavigate();
  useEffect(() => {
    if (isAuthenticated()) navigate("/dashboard/courses", { replace: true });
  }, [navigate]);
  return <CoursesPage onNavigate={onNavigate} />;
}

// ── Public layout ─────────────────────────────────────────────────────────────
function PublicLayout() {
  const navigate = useNavigate();
  const { setLang } = useLanguage();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiOpenToken, setAiOpenToken] = useState(0);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [aiWidth, setAiWidth] = useState(380);
  const resizingRef = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(380);
  useTheme();

  const isDesktop = viewportWidth >= 768;
  const effectiveAiWidth = Math.min(Math.max(340, viewportWidth - 32), Math.min(aiWidth, 460));
  const openAIChat = useCallback(() => {
    setAiOpen(true);
    setAiOpenToken(value => value + 1);
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = resizeStartX.current - event.clientX;
      setAiWidth(Math.max(340, Math.min(700, resizeStartWidth.current + delta)));
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  const onResizeStart = useCallback((event: React.MouseEvent) => {
    resizingRef.current = true;
    resizeStartX.current = event.clientX;
    resizeStartWidth.current = aiWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  }, [aiWidth]);

  useEffect(() => {
    if (!isAuthenticated()) { setCurrentUser(null); return; }
    apiGetMe().then((user) => {
      setCurrentUser(user);
      // A language selected in this browser is authoritative. Only seed it
      // from the profile when no local preference exists yet.
      if (!getStoredLanguage() && user.preferred_language) {
         setLang(user.preferred_language === "sw" ? "sw" : user.preferred_language === "en" ? "en" : "fr");
      }
    }).catch(() => {
      // Ne pas effacer une session valide pour une coupure réseau ou un 503
      // temporaire pendant que l'utilisateur consulte le site public.
      // apiFetch retire déjà le token lorsqu'il s'agit réellement d'un 401.
      if (!isAuthenticated()) setCurrentUser(null);
    });
  }, [setLang]);

  const handleLogout = () => { clearAuth(); setCurrentUser(null); navigate("/"); };

  return (
    <div className="relative min-h-screen bg-[#f5f3f0] dark:bg-slate-950">
      <div className="min-h-screen min-w-0 transition-[margin] duration-300" style={{ marginRight: isDesktop && aiOpen && !aiExpanded ? effectiveAiWidth : 0 }}>
        <div className="flex min-h-screen min-w-0 flex-col">
          <PublicHeader currentUser={currentUser} onLogout={handleLogout} />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<PublicHome onOpenAI={openAIChat} />} />
              <Route path="/courses" element={<PublicCatalog />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <SiteFooter />
        </div>
      </div>

      {/* Desktop AI panel: fixed to the viewport so its composer never follows
          the landing page scroll. The landing content keeps its right-side space. */}
      {isDesktop && aiOpen && (
        <div className={`fixed inset-y-0 right-0 z-50 flex overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f1219] ${aiExpanded ? "inset-0 w-screen" : ""}`} style={aiExpanded ? undefined : { width: effectiveAiWidth }}>
          {!aiExpanded && <div className="group relative w-3 shrink-0 cursor-col-resize border-r border-slate-200 bg-[#f4f6fb] dark:border-slate-700 dark:bg-slate-950" onMouseDown={onResizeStart} title="Glisser pour redimensionner"><div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col justify-center gap-1 opacity-0 transition group-hover:opacity-100"><span className="h-1 w-1 rounded-full bg-slate-400" /><span className="h-1 w-1 rounded-full bg-slate-400" /><span className="h-1 w-1 rounded-full bg-slate-400" /></div></div>}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <AIPanelChat isOpen={aiOpen} push isExpanded={aiExpanded} onExpandedChange={setAiExpanded} onClose={() => { setAiOpen(false); setAiExpanded(false); }} openChatToken={aiOpenToken} mode="assistant" />
          </div>
        </div>
      )}

      {/* Mobile AI panel: the same shell becomes a full-screen assistant. */}
      {!isDesktop && <div className={`fixed inset-0 z-50 flex overflow-hidden bg-white transition-[visibility,opacity] duration-200 dark:bg-[#0f1219] ${aiOpen ? "visible opacity-100" : "pointer-events-none invisible opacity-0"}`}>
        <AIPanelChat isOpen={aiOpen} push onClose={() => setAiOpen(false)} openChatToken={aiOpenToken} mode="assistant" />
      </div>
      }

      {!aiOpen && (
        <button
          onClick={openAIChat}
          title="TESS AI"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#2563EB] bg-white p-1 shadow-xl shadow-slate-900/20 transition-all duration-200 hover:scale-105 hover:border-blue-700 hover:shadow-2xl active:scale-95 dark:bg-slate-900"
        >
          <img src="/ai_icon.jpg" alt="Ouvrir TESS AI" className="h-full w-full rounded-xl object-cover" />
        </button>
      )}
    </div>
  );
}

// ── Protected route ───────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/questionnaire/:slug" element={<PublicQuestionnairePage />} />
        <Route
          path="/questionnaire-preview/:id"
          element={
            <ProtectedRoute>
              <PublicQuestionnairePage />
            </ProtectedRoute>
          }
        />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
        <Route path="/*" element={<PublicLayout />} />
      </Routes>
      <Toaster />
    </TooltipProvider>
  );
}
