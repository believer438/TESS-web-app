// Copie Zentrix Academy : src/pages/SettingsPage.tsx
import { useEffect, useRef, useState } from "react";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  AlertTriangle, Award, BarChart3, Bell, BookOpen, Bot, Check, ChevronRight,
  Eye, EyeOff, Globe, HelpCircle, Info, LayoutDashboard, Library, Loader2,
  Lock, LogOut, Mail, Monitor, Moon, Settings as SettingsIcon, Shield,
  StickyNote, Sun, Upload, User,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { useToast } from "@/hooks/use-toast";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { useLanguage, type Lang } from "@/lib/i18n";
import {
  apiGetMe, apiUpdateMe, clearAuth, isAuthenticated, type UserProfile,
  apiGetAIPermissions, apiUpdateAIPermissions, type AIPermissions,
} from "@/lib/api-client";
import { useNavigate, useSearchParams } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "profil" | "apparence" | "securite" | "notifications" | "ia";

interface NotifPrefs {
  email: boolean;
  revision: boolean;
  weekly: boolean;
  newCourse: boolean;
}

interface IAPrefs {
  defaultLevel: "debutant" | "intermediaire" | "avance";
  responseLanguage: "fr" | "en" | "ar";
  proactiveHints: boolean;
}

const NOTIF_KEY = "zentrix-notif-prefs";
const IA_KEY    = "zentrix-ia-prefs";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-[#FF6B00]" : "bg-slate-200 dark:bg-slate-700"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  icon, title, description, checked, onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, description }: { icon: typeof SettingsIcon; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:gap-4 sm:px-6 sm:py-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF6B00]/10 sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 text-[#FF6B00] sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function StyledInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#FF6B00] ${props.className ?? ""}`}
    />
  );
}

function ReadonlyField({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      {value || "—"}
    </div>
  );
}

function SaveButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#e56000] disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      {loading ? t("common.saving") : label}
    </button>
  );
}

// ── Theme Picker ──────────────────────────────────────────────────────────────
function ThemePicker({ theme, setTheme }: { theme: ThemeMode; setTheme: (t: ThemeMode) => void }) {
  const { t } = useLanguage();
  const options: { id: ThemeMode; labelKey: string; descKey: string; Icon: typeof Sun }[] = [
    { id: "light",  labelKey: "settings.theme_light",  descKey: "settings.theme_light_desc",  Icon: Sun },
    { id: "dark",   labelKey: "settings.theme_dark",   descKey: "settings.theme_dark_desc",   Icon: Moon },
    { id: "system", labelKey: "settings.theme_system", descKey: "settings.theme_system_desc", Icon: Monitor },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {options.map(({ id, labelKey, descKey, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-4 transition-all sm:gap-3 sm:p-5 ${
              active
                ? "border-[#FF6B00] bg-[#FF6B00]/5 shadow-md shadow-[#FF6B00]/10"
                : "border-slate-200 bg-white hover:border-[#FF6B00]/40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#FF6B00]/40"
            }`}
          >
            {active && (
              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] sm:h-5 sm:w-5">
                <Check className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" />
              </span>
            )}
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${
              active ? "bg-[#FF6B00] text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}>
              <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <div className="text-center">
              <p className={`text-xs font-bold sm:text-sm ${active ? "text-[#FF6B00]" : "text-slate-800 dark:text-slate-100"}`}>
                {t(labelKey)}
              </p>
              <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{t(descKey)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Level Picker ──────────────────────────────────────────────────────────────
type Level = "debutant" | "intermediaire" | "avance";

function LevelPicker({ level, setLevel }: { level: Level; setLevel: (l: Level) => void }) {
  const { t } = useLanguage();
  const levels: { id: Level; labelKey: string; descKey: string; color: string }[] = [
    { id: "debutant",      labelKey: "settings.level_debutant", descKey: "settings.level_debutant_desc", color: "emerald" },
    { id: "intermediaire", labelKey: "settings.level_inter",    descKey: "settings.level_inter_desc",    color: "blue"    },
    { id: "avance",        labelKey: "settings.level_avance",   descKey: "settings.level_avance_desc",   color: "purple"  },
  ];
  const colorMap: Record<string, { border: string; text: string }> = {
    emerald: { border: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" },
    blue:    { border: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",         text: "text-blue-600 dark:text-blue-400"       },
    purple:  { border: "border-purple-500 bg-purple-50 dark:bg-purple-900/20",   text: "text-purple-600 dark:text-purple-400"   },
  };
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      {levels.map(({ id, labelKey, descKey, color }) => {
        const active = level === id;
        const c = colorMap[color];
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLevel(id)}
            className={`relative rounded-xl border-2 p-4 text-left transition-all ${
              active ? `${c.border} shadow-sm` : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
            }`}
          >
            {active && <Check className={`absolute right-3 top-3 h-4 w-4 ${c.text}`} />}
            <p className={`text-sm font-bold ${active ? c.text : "text-slate-800 dark:text-slate-100"}`}>{t(labelKey)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(descKey)}</p>
          </button>
        );
      })}
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const word = t("settings.delete_word");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/50 dark:bg-slate-950">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("settings.delete_title")}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("settings.delete_body")}</p>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("settings.delete_label")}{" "}
            <span className="font-mono text-red-500">{word}</span>{" "}
            pour confirmer
          </label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("settings.delete_placeholder")}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            {t("common.cancel")}
          </button>
          <button type="button" onClick={onConfirm} disabled={value !== word}
            className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40">
            {t("settings.delete_confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────
function passwordStrength(pwd: string, t: (k: string) => string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8)             score++;
  if (pwd.length >= 12)            score++;
  if (/[A-Z]/.test(pwd))          score++;
  if (/[0-9]/.test(pwd))          score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;
  if (score <= 1) return { score, label: t("settings.strength_1"), color: "bg-red-500" };
  if (score === 2) return { score, label: t("settings.strength_2"), color: "bg-orange-400" };
  if (score === 3) return { score, label: t("settings.strength_3"), color: "bg-yellow-400" };
  if (score === 4) return { score, label: t("settings.strength_4"), color: "bg-emerald-400" };
  return { score, label: t("settings.strength_5"), color: "bg-emerald-600" };
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-sm font-bold text-slate-700 dark:text-slate-200">{children}</h3>;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();

  const requestedTab = searchParams.get("tab");
  const initialTab: Tab = requestedTab === "ia" || requestedTab === "profil" || requestedTab === "apparence" || requestedTab === "securite" || requestedTab === "notifications"
    ? requestedTab
    : "profil";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [user, setUser]           = useState<UserProfile | null>(null);

  useEffect(() => {
    if (requestedTab === "ia" || requestedTab === "profil" || requestedTab === "apparence" || requestedTab === "securite" || requestedTab === "notifications") {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  // — Profile
  const [fullName, setFullName]         = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // — Security
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [savingPwd, setSavingPwd]         = useState(false);

  // — Language (synced from context)
  const [selectedLang, setSelectedLang] = useState<Lang>(lang);

  // — Notifications
  const [notif, setNotif] = useState<NotifPrefs>(() =>
    loadJSON<NotifPrefs>(NOTIF_KEY, { email: true, revision: true, weekly: false, newCourse: true })
  );

  // — IA prefs
  const [iaPrefs, setIAPrefs] = useState<IAPrefs>(() =>
    loadJSON<IAPrefs>(IA_KEY, { defaultLevel: "intermediaire", responseLanguage: "fr", proactiveHints: true })
  );

  // — AI permissions
  const [aiPerms, setAiPerms] = useState<AIPermissions>({
    allow_dashboard: true, allow_catalogue: true, allow_quizzes: true,
    allow_analytics: true, allow_certificates: true,
    allow_notes: false, allow_documents: false, allow_library: true,
  });
  const [loadingPerms, setLoadingPerms] = useState(false);

  // — Delete modal
  const [showDelete, setShowDelete] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) return;
    apiGetMe()
      .then((u) => {
        setUser(u);
        setFullName(u.full_name ?? "");
        // Sync stored preferred_language from backend if present
        if (u.preferred_language) {
           const pl: Lang = u.preferred_language === "sw" ? "sw" : u.preferred_language === "en" ? "en" : "fr";
          setSelectedLang(pl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    setLoadingPerms(true);
    apiGetAIPermissions()
      .then(setAiPerms)
      .catch(() => {})
      .finally(() => setLoadingPerms(false));
  }, []);

  // Keep selectedLang in sync if lang changes from outside
  useEffect(() => {
    setSelectedLang(lang);
  }, [lang]);

  const updateAIPerm = async (key: keyof AIPermissions, value: boolean) => {
    const updated = { ...aiPerms, [key]: value };
    setAiPerms(updated);
    try {
      await apiUpdateAIPermissions({ [key]: value });
    } catch {
      setAiPerms(aiPerms);
      toast({ title: t("common.error"), description: "Impossible de sauvegarder la permission IA.", variant: "destructive" });
    }
  };

  // ── Role labels (from context) ────────────────────────────────────────────────
  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: t("roles.admin"), professor: t("roles.professor"), student: t("roles.student"),
    };
    return map[role] ?? role;
  };

  useSetPageContext({
    current_page: "settings",
    page_title: `${t("settings.title")} — ${t(`settings.tab_${activeTab as string}`)}`,
    page_data: {
      active_tab: activeTab,
      user_name: user?.full_name ?? null,
      user_email: user?.email ?? null,
      user_role: user ? roleLabel(user.role) : null,
      language: lang,
      ia_default_level: iaPrefs.defaultLevel,
      ia_response_language: iaPrefs.responseLanguage,
      ia_proactive_hints: iaPrefs.proactiveHints,
      theme: resolvedTheme,
    },
  });

  // ── Save handlers ─────────────────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!fullName.trim()) {
      toast({ title: t("common.error"), description: "Le nom ne peut pas être vide.", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      // Save name + preferred_language in one request
      await apiUpdateMe({ full_name: fullName.trim(), preferred_language: selectedLang });
      // Apply language change to the whole app immediately
      if (selectedLang !== lang) {
        setLang(selectedLang);
      }
      toast({ title: t("settings.profil_saved"), description: t("settings.profil_saved_desc") });
    } catch (e) {
      toast({ title: t("common.error"), description: e instanceof Error ? e.message : t("common.error"), variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: t("common.error"), description: "Minimum 8 caractères.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("common.error"), description: t("settings.securite_pwd_match"), variant: "destructive" });
      return;
    }
    setSavingPwd(true);
    try {
      await apiUpdateMe({ password: newPassword });
      toast({ title: t("settings.securite_pwd_ok_toast"), description: t("settings.securite_pwd_ok_desc") });
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast({ title: t("common.error"), description: e instanceof Error ? e.message : t("common.error"), variant: "destructive" });
    } finally {
      setSavingPwd(false);
    }
  };

  const saveNotif = () => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notif));
    toast({ title: t("settings.notif_saved") });
  };

  const saveIA = () => {
    localStorage.setItem(IA_KEY, JSON.stringify(iaPrefs));
    toast({ title: t("settings.ia_saved") });
  };

  const handleLogout = () => { clearAuth(); navigate("/"); };

  const pwdStrength = passwordStrength(newPassword, t);

  const initials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  };

  // ── Tab config ────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; labelKey: string; icon: typeof SettingsIcon }[] = [
    { id: "profil",        labelKey: "settings.tab_profil",    icon: User    },
    { id: "apparence",     labelKey: "settings.tab_apparence", icon: Sun     },
    { id: "securite",      labelKey: "settings.tab_securite",  icon: Shield  },
    { id: "notifications", labelKey: "settings.tab_notif",     icon: Bell    },
    { id: "ia",            labelKey: "settings.tab_ia",        icon: Bot     },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950">
      {showDelete && (
        <DeleteModal
          onClose={() => setShowDelete(false)}
          onConfirm={() => { clearAuth(); navigate("/"); }}
        />
      )}

      <PageHero
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        backgroundImage="/page-hero-settings.png"
        icon={<SettingsIcon className="h-7 w-7" />}
      />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">

          {/* ── Sidebar / Tab nav ── */}
          <aside className="shrink-0 lg:w-56">
            {/* Mobile: compact scrollable pill row */}
            <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:hidden">
              {TABS.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition-colors min-w-0 ${
                    activeTab === id
                      ? "bg-[#FF6B00] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-[10px] font-semibold leading-tight">
                    {t(labelKey).split(" ")[0]}
                  </span>
                </button>
              ))}
            </nav>

            {/* Desktop: vertical sidebar */}
            <nav className="hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:block">
              {TABS.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === id
                      ? "bg-[#FF6B00] text-white shadow-sm shadow-[#FF6B00]/30"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(labelKey)}</span>
                  {activeTab === id && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </nav>

            {/* User card — desktop only */}
            {user && (
              <div className="mt-3 hidden rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB347] to-[#FF6B00] text-sm font-bold text-white">
                  {initials(user.full_name)}
                </div>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.full_name || "—"}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  user.role === "admin"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                }`}>
                  {roleLabel(user.role)}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-4 flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t("common.logout")}
                </button>
              </div>
            )}
          </aside>

          {/* ── Content ── */}
          <main className="min-w-0 flex-1 space-y-4">

            {/* ═══════════ PROFIL ═══════════ */}
            {activeTab === "profil" && (
              <>
                <Card>
                  <CardHeader icon={User} title={t("settings.profil_title")} description={t("settings.profil_desc")} />
                  <div className="space-y-5 p-5 sm:p-6">
                    {/* Avatar row */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB347] to-[#FF6B00] text-xl font-bold text-white shadow-md sm:h-16 sm:w-16">
                        {initials(fullName || user?.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                          {fullName || "—"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                      </div>
                    </div>

                    {/* Fields grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label={t("settings.profil_name")}>
                        <StyledInput
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={t("settings.profil_name")}
                        />
                      </Field>
                      <Field label={t("settings.profil_email")}>
                        <ReadonlyField value={user?.email ?? ""} />
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                          <Info className="h-3 w-3" /> {t("settings.profil_email_hint")}
                        </p>
                      </Field>
                      <Field label={t("settings.profil_role")}>
                        <ReadonlyField value={roleLabel(user?.role ?? "")} />
                      </Field>
                      <Field label={t("settings.profil_lang")}>
                        <select
                          value={selectedLang}
                          onChange={(e) => {
                            const next = e.target.value as Lang;
                            setSelectedLang(next);
                            setLang(next);
                            if (isAuthenticated()) {
                              apiUpdateMe({ preferred_language: next }).catch(() => {
                                toast({ title: t("common.error"), description: "Could not save your language preference.", variant: "destructive" });
                              });
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="fr">🇫🇷 {t("settings.lang_fr")}</option>
                          <option value="en">🇬🇧 {t("settings.lang_en")}</option>
                           <option value="sw">🇹🇿 {t("settings.lang_sw")}</option>
                        </select>
                        {selectedLang !== lang && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#FF6B00]">
                            <Info className="h-3 w-3" />
                            {t("settings.profil_lang_applying")}
                          </p>
                        )}
                      </Field>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <SaveButton loading={savingProfile} onClick={saveProfile} label={t("settings.profil_save")} />
                    </div>
                  </div>
                </Card>

                {/* Mobile logout */}
                <Card className="lg:hidden">
                  <div className="p-4">
                    <button type="button" onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20">
                      <LogOut className="h-4 w-4" />
                      {t("common.logout")}
                    </button>
                  </div>
                </Card>
              </>
            )}

            {/* ═══════════ APPARENCE ═══════════ */}
            {activeTab === "apparence" && (
              <Card>
                <CardHeader icon={Sun} title={t("settings.apparence_title")} description={t("settings.apparence_desc")} />
                <div className="space-y-5 p-5 sm:p-6">
                  <div>
                    <SectionTitle>{t("settings.apparence_theme")}</SectionTitle>
                    <ThemePicker theme={theme} setTheme={setTheme} />
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 dark:bg-slate-900">
                      {resolvedTheme === "dark"
                        ? <Moon className="h-4 w-4 shrink-0 text-[#FF6B00]" />
                        : <Sun  className="h-4 w-4 shrink-0 text-[#FF6B00]" />}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("settings.apparence_active")} :{" "}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {resolvedTheme === "dark" ? t("settings.theme_dark") : t("settings.theme_light")}
                        </strong>
                        {theme === "system" && ` (${t("settings.theme_system").toLowerCase()})`}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#FF6B00]/20 bg-[#FF6B00]/5 px-4 py-3 flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 text-[#FF6B00] mt-0.5" />
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t("settings.apparence_theme_hint")}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* ═══════════ SÉCURITÉ ═══════════ */}
            {activeTab === "securite" && (
              <>
                <Card>
                  <CardHeader icon={Shield} title={t("settings.securite_title")} description={t("settings.securite_desc")} />
                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label={t("settings.securite_new_pwd")}>
                        <div className="relative">
                          <StyledInput
                            type={showPwd ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t("settings.securite_pwd_min")}
                            className="pr-10"
                          />
                          <button type="button" onClick={() => setShowPwd((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {newPassword && (
                          <div className="mt-2 space-y-1">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map((i) => (
                                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                                  i <= pwdStrength.score ? pwdStrength.color : "bg-slate-200 dark:bg-slate-700"
                                }`} />
                              ))}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{pwdStrength.label}</p>
                          </div>
                        )}
                      </Field>
                      <Field label={t("settings.securite_confirm")}>
                        <div className="relative">
                          <StyledInput
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("settings.securite_pwd_repeat")}
                            className={`pr-10 ${confirmPassword && confirmPassword !== newPassword ? "border-red-400 focus:border-red-500" : ""}`}
                          />
                          <button type="button" onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {confirmPassword && confirmPassword !== newPassword && (
                          <p className="mt-1 text-[11px] text-red-500">{t("settings.securite_pwd_match")}</p>
                        )}
                        {confirmPassword && confirmPassword === newPassword && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-500">
                            <Check className="h-3 w-3" /> {t("settings.securite_pwd_ok")}
                          </p>
                        )}
                      </Field>
                    </div>

                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
                      <p className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">{t("settings.securite_tips_title")}</p>
                      <ul className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                        {[
                          [newPassword.length >= 8,            "settings.securite_tip_8"    ],
                          [/[A-Z]/.test(newPassword),          "settings.securite_tip_upper" ],
                          [/[0-9]/.test(newPassword),          "settings.securite_tip_num"  ],
                          [/[^A-Za-z0-9]/.test(newPassword),   "settings.securite_tip_spec" ],
                        ].map(([ok, key], i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className={`h-3 w-3 ${ok ? "text-emerald-500" : "opacity-30"}`} />
                            {t(key as string)}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <SaveButton loading={savingPwd} onClick={savePassword} label={t("settings.securite_save_pwd")} />
                  </div>
                </Card>

                {/* Danger zone */}
                <Card className="border-red-200 dark:border-red-900/50">
                  <div className="flex items-start gap-3 border-b border-red-100 px-5 py-4 dark:border-red-900/30 sm:gap-4 sm:px-6 sm:py-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-4 w-4 text-red-500 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-red-600 dark:text-red-400 sm:text-base">{t("settings.danger_title")}</h2>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("settings.danger_desc")}</p>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-900/10 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("settings.danger_delete_title")}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("settings.danger_delete_desc")}</p>
                      </div>
                      <button type="button" onClick={() => setShowDelete(true)}
                        className="shrink-0 rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-700 dark:text-red-400">
                        {t("settings.danger_delete_btn")}
                      </button>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* ═══════════ NOTIFICATIONS ═══════════ */}
            {activeTab === "notifications" && (
              <Card>
                <CardHeader icon={Bell} title={t("settings.notif_title")} description={t("settings.notif_desc")} />
                <div className="space-y-2.5 p-5 sm:p-6">
                  <ToggleRow icon={<Mail className="h-4 w-4" />}
                    title={t("settings.notif_email_title")} description={t("settings.notif_email_desc")}
                    checked={notif.email} onChange={(v) => setNotif((p) => ({ ...p, email: v }))} />
                  <ToggleRow icon={<Bell className="h-4 w-4" />}
                    title={t("settings.notif_revision_title")} description={t("settings.notif_revision_desc")}
                    checked={notif.revision} onChange={(v) => setNotif((p) => ({ ...p, revision: v }))} />
                  <ToggleRow icon={<Globe className="h-4 w-4" />}
                    title={t("settings.notif_courses_title")} description={t("settings.notif_courses_desc")}
                    checked={notif.newCourse} onChange={(v) => setNotif((p) => ({ ...p, newCourse: v }))} />
                  <ToggleRow icon={<Lock className="h-4 w-4" />}
                    title={t("settings.notif_weekly_title")} description={t("settings.notif_weekly_desc")}
                    checked={notif.weekly} onChange={(v) => setNotif((p) => ({ ...p, weekly: v }))} />
                  <div className="pt-2">
                    <SaveButton loading={false} onClick={saveNotif} label={t("settings.notif_save")} />
                  </div>
                </div>
              </Card>
            )}

            {/* ═══════════ IA ═══════════ */}
            {activeTab === "ia" && (
              <>
                <Card>
                  <CardHeader icon={Bot} title={t("settings.ia_title")} description={t("settings.ia_desc")} />
                  <div className="space-y-5 p-5 sm:p-6">
                    <div>
                      <SectionTitle>{t("settings.ia_level_title")}</SectionTitle>
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t("settings.ia_level_hint")}</p>
                      <LevelPicker
                        level={iaPrefs.defaultLevel}
                        setLevel={(l) => setIAPrefs((p) => ({ ...p, defaultLevel: l }))}
                      />
                    </div>

                    <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                      <SectionTitle>{t("settings.ia_lang_title")}</SectionTitle>
                      <select
                        value={iaPrefs.responseLanguage}
                        onChange={(e) => setIAPrefs((p) => ({ ...p, responseLanguage: e.target.value as IAPrefs["responseLanguage"] }))}
                        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="fr">🇫🇷 Français</option>
                        <option value="en">🇬🇧 English</option>
                         <option value="sw">🇹🇿 Kiswahili</option>
                      </select>
                    </div>

                    <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                      <SectionTitle>{t("settings.ia_behavior_title")}</SectionTitle>
                      <ToggleRow
                        icon={<Bot className="h-4 w-4" />}
                        title={t("settings.ia_hints_title")}
                        description={t("settings.ia_hints_desc")}
                        checked={iaPrefs.proactiveHints}
                        onChange={(v) => setIAPrefs((p) => ({ ...p, proactiveHints: v }))}
                      />
                    </div>

                    <div className="pt-1">
                      <SaveButton loading={false} onClick={saveIA} label={t("settings.ia_save")} />
                    </div>
                  </div>
                </Card>

                {/* AI Context Control */}
                <Card>
                  <CardHeader icon={Eye} title={t("settings.perms_title")} description={t("settings.perms_desc")} />
                  <div className="space-y-2 p-5 sm:p-6">
                    {loadingPerms ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
                      </div>
                    ) : (
                      <>
                        <ToggleRow icon={<LayoutDashboard className="h-4 w-4" />}
                          title={t("settings.perms_dashboard")} description={t("settings.perms_dashboard_d")}
                          checked={aiPerms.allow_dashboard} onChange={(v) => updateAIPerm("allow_dashboard", v)} />
                        <ToggleRow icon={<BookOpen className="h-4 w-4" />}
                          title={t("settings.perms_catalogue")} description={t("settings.perms_catalogue_d")}
                          checked={aiPerms.allow_catalogue} onChange={(v) => updateAIPerm("allow_catalogue", v)} />
                        <ToggleRow icon={<HelpCircle className="h-4 w-4" />}
                          title={t("settings.perms_quizzes")} description={t("settings.perms_quizzes_d")}
                          checked={aiPerms.allow_quizzes} onChange={(v) => updateAIPerm("allow_quizzes", v)} />
                        <ToggleRow icon={<BarChart3 className="h-4 w-4" />}
                          title={t("settings.perms_analytics")} description={t("settings.perms_analytics_d")}
                          checked={aiPerms.allow_analytics} onChange={(v) => updateAIPerm("allow_analytics", v)} />
                        <ToggleRow icon={<Award className="h-4 w-4" />}
                          title={t("settings.perms_certificates")} description={t("settings.perms_certificates_d")}
                          checked={aiPerms.allow_certificates} onChange={(v) => updateAIPerm("allow_certificates", v)} />
                        <ToggleRow icon={<Library className="h-4 w-4" />}
                          title={t("settings.perms_library")} description={t("settings.perms_library_d")}
                          checked={aiPerms.allow_library} onChange={(v) => updateAIPerm("allow_library", v)} />

                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {t("settings.perms_sensitive")}
                          </p>
                          <div className="space-y-2">
                            <ToggleRow icon={<StickyNote className="h-4 w-4" />}
                              title={t("settings.perms_notes")} description={t("settings.perms_notes_d")}
                              checked={aiPerms.allow_notes} onChange={(v) => updateAIPerm("allow_notes", v)} />
                            <ToggleRow icon={<Upload className="h-4 w-4" />}
                              title={t("settings.perms_documents")} description={t("settings.perms_documents_d")}
                              checked={aiPerms.allow_documents} onChange={(v) => updateAIPerm("allow_documents", v)} />
                          </div>
                        </div>
                      </>
                    )}
                    <p className="flex items-start gap-1.5 pt-2 text-xs text-slate-400 dark:text-slate-500">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {t("settings.perms_hint")}
                    </p>
                  </div>
                </Card>
              </>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}

