// Copie Zentrix Academy : src/pages/DashboardHome.tsx
import { useEffect, useState } from "react";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  ArrowRight, Award, BookOpen, Brain, CalendarDays, CheckCircle2, ClipboardList, Clock,
  GraduationCap, Layers, Plus, Rocket, School,
  TrendingUp, Upload, UserCheck, Users, FolderOpen, MessageCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  apiGetMe, apiGetMyEnrollments, apiGetMyCertificates, apiGetCourseRecommendations,
  apiGetNotifications, apiGetAllProgress, apiGetAnalyticsProfile,
  apiLogActivity, apiGetAdminStats, apiGetMyChapterCompletions, isAuthenticated,
  type UserProfile, type BackendNotification,
  type CatalogueProgressResult, type AdminStats,
  type CourseRecommendation,
} from "@/lib/api-client";
import { type CatalogueCourse } from "@/lib/backend-types";

interface Props {
  onNavigate: (page: string, data?: unknown) => void;
  isAdmin?: boolean;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

// ── Admin stats strip ─────────────────────────────────────────────────────────
function AdminStatsStrip({ stats, onNavigate }: { stats: AdminStats; onNavigate: (page: string) => void }) {
  const items = [
    { label: "Utilisateurs",   value: stats.total_users,       sub: `${stats.students} étudiants`,       icon: <Users className="h-4 w-4 text-[#FF6B00]" />,        bg: "bg-[#FF6B00]/10",                      action: () => onNavigate("users") },
    { label: "Cours publiés",  value: stats.published_courses, sub: `${stats.draft_courses} brouillons`,  icon: <BookOpen className="h-4 w-4 text-emerald-500" />,   bg: "bg-emerald-50 dark:bg-emerald-900/20", action: () => onNavigate("courses") },
    { label: "Chapitres",      value: stats.total_chapters,    sub: "dans tous les cours",                icon: <Layers className="h-4 w-4 text-sky-500" />,         bg: "bg-sky-50 dark:bg-sky-900/20",         action: () => onNavigate("courses") },
    { label: "Inscriptions",   value: stats.total_enrollments, sub: "au total",                           icon: <GraduationCap className="h-4 w-4 text-blue-500" />, bg: "bg-blue-50 dark:bg-blue-900/20",       action: () => onNavigate("courses") },
    { label: "Quiz passés",    value: (stats as any).total_quizzes ?? 0, sub: `moy. ${(stats as any).avg_quiz_score ?? 0}%`, icon: <Brain className="h-4 w-4 text-violet-500" />, bg: "bg-violet-50 dark:bg-violet-900/20", action: () => onNavigate("quiz-stats") },
    { label: "Professeurs",    value: stats.professors,        sub: `${stats.admins} admins`,             icon: <School className="h-4 w-4 text-purple-500" />,      bg: "bg-purple-50 dark:bg-purple-900/20",   action: () => onNavigate("users") },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#1d1d1d]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-8">
        <div className="mb-3 flex items-center gap-2">
          <span data-brand-eyebrow className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">Vue d'ensemble — Administration</span>
          <div className="h-px flex-1 bg-[#FF6B00]/20" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {items.map(item => (
            <button key={item.label} onClick={item.action} data-dashboard-accent-border
              className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-blue-400/30 dark:hover:bg-blue-500/[0.07]">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{item.value}</p>
                <p className="truncate text-[10px] text-slate-400">{item.label}</p>
                <p className="truncate text-[10px] text-slate-300 dark:text-slate-600">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Admin quick actions panel ─────────────────────────────────────────────────
function AdminQuickActions({ onNavigate }: { onNavigate: (page: string) => void }) {
  const actions = [
    { label: "Créer un cours",     icon: Plus,          color: "bg-[#FF6B00]",       action: () => onNavigate("create-course"), desc: "Wizard multi-étapes" },
    { label: "Gérer les cours",    icon: BookOpen,      color: "bg-emerald-600",      action: () => onNavigate("courses"),       desc: "Modifier, publier" },
    { label: "Utilisateurs",       icon: Users,         color: "bg-blue-600",         action: () => onNavigate("users"),         desc: "Rôles & comptes" },
    { label: "Stats Quiz",         icon: ClipboardList, color: "bg-violet-600",       action: () => onNavigate("quiz-stats"),    desc: "Résultats & scores" },
    { label: "Analytiques",        icon: TrendingUp,    color: "bg-teal-600",         action: () => onNavigate("analytics"),     desc: "Activité globale" },
    { label: "Document IA",        icon: Upload,        color: "bg-indigo-600",       action: () => onNavigate("document-ai"),   desc: "Analyse de fichiers" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#1d1d1d]">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="h-4 w-4 text-[#FF6B00]" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Actions admin</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:p-4">
        {actions.map(({ label, icon: Icon, color, action, desc }) => (
          <button key={label} onClick={action} data-dashboard-accent-border
             className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm sm:gap-3 sm:px-4 dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-blue-400/30 dark:hover:bg-blue-500/[0.07]">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-white">{label}</p>
              <p className="truncate text-[10px] text-slate-400">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardHome({ onNavigate, isAdmin = false }: Props) {
  const [user, setUser]                   = useState<UserProfile | null>(null);
  const [enrollments, setEnrollments]     = useState<CatalogueCourse[]>([]);
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [certificateCount, setCertificateCount] = useState(0);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [completedChapterCounts, setCompletedChapterCounts] = useState<Record<number, number>>({});
  const [progress, setProgress]           = useState<CatalogueProgressResult[]>([]);
  const [notifs, setNotifs]               = useState<BackendNotification[]>([]);
  const [activeDays, setActiveDays]       = useState(0);
  const [loading, setLoading]             = useState(true);
  const [adminStats, setAdminStats]       = useState<AdminStats | null>(null);

  useEffect(() => {
    Promise.allSettled([
      apiGetMe(),
      apiGetMyEnrollments(),
      apiGetCourseRecommendations(6),
      apiGetAllProgress(),
      apiGetNotifications(),
      apiGetMyCertificates(),
      apiGetMyChapterCompletions(),
      apiGetAnalyticsProfile(),
    ]).then(([u, enr, catalog, prog, notif, certificates, chapters, analytics]) => {
      if (u.status === "fulfilled")         setUser(u.value);
      if (enr.status === "fulfilled")       setEnrollments(enr.value);
      if (catalog.status === "fulfilled") setRecommendations(catalog.value);
      if (prog.status === "fulfilled")      setProgress(prog.value);
      if (notif.status === "fulfilled")     setNotifs(notif.value);
      if (certificates.status === "fulfilled") setCertificateCount(certificates.value.length);
      if (chapters.status === "fulfilled") {
        const counts: Record<number, number> = {};
        chapters.value.forEach((chapter) => { counts[chapter.course_id] = (counts[chapter.course_id] ?? 0) + 1; });
        setCompletedChapterCounts(counts);
      }
      if (analytics.status === "fulfilled") {
        setActiveDays(analytics.value.activity_summary?.active_days ?? 0);
        setStudyMinutes(analytics.value.activity_summary?.estimated_time_min ?? 0);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    apiGetAdminStats().then(setAdminStats).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (window.location.hash !== "#dashboard-calendar") return;
    requestAnimationFrame(() => document.getElementById("dashboard-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const interval = setInterval(() => {
      apiLogActivity({ event_type: "PAGE_TIME", metadata: { page: "dashboard", seconds: 60 } });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const progressMap     = Object.fromEntries(progress.map(p => [p.course_id, p.percent_complete]));
  const unreadNotifs    = notifs.filter(n => !n.is_read).length;
  const avgProgress     = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc, c) => acc + (progressMap[c.id] ?? 0), 0) / enrollments.length)
    : 0;
  const completedCourses  = enrollments.filter(c => (progressMap[c.id] ?? 0) >= 100).length;
  const inProgressCourses = enrollments.filter(c => { const p = progressMap[c.id] ?? 0; return p > 0 && p < 100; });

  useSetPageContext({
    current_page: "dashboard",
    page_title:   "Tableau de bord",
    page_data: {
      enrolled_courses_count:  enrollments.length,
      avg_progress:            avgProgress,
      completed_courses:       completedCourses,
      in_progress_courses:     inProgressCourses.length,
      unread_notifications:    unreadNotifs,
      active_days:             activeDays,
      recent_courses:          inProgressCourses.slice(0, 3).map(c => ({
        id:       c.id,
        title:    c.title,
        progress: progressMap[c.id] ?? 0,
      })),
    },
  });

  const statCards = [
    { label: "Cours en cours",       value: String(inProgressCourses.length), icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", onClick: () => onNavigate("courses") },
    { label: "Cours terminés",       value: String(completedCourses), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", onClick: () => onNavigate("courses") },
    { label: "Certificats obtenus",  value: String(certificateCount), icon: Award, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", onClick: () => onNavigate("certificates") },
    { label: "Temps d’apprentissage", value: `${Math.floor(studyMinutes / 60)} h`, icon: Clock, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-900/20", onClick: () => onNavigate("analytics") },
  ];

  return (
    <div className="dashboard-home-root relative min-h-full min-w-0 overflow-x-hidden bg-[#f4f6fb] dark:bg-slate-950">

      {/* ── Welcome banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden px-5 py-5 sm:px-8 sm:py-5">
      <div className="relative grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-center">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">
              {loading
                ? <Skeleton className="mt-1 h-8 w-40" />
                : <>Bonjour {user?.full_name?.split(" ")[0] ?? "Apprenant"} 👋</>}
            </h1>
            <div className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {loading
                ? <Skeleton className="h-4 w-72" />
                : isAdmin
                ? "Vous êtes connecté en tant qu'administrateur. Bonne gestion !"
                : inProgressCourses.length > 0
                  ? "Continue sur ta lancée. Chaque jour est une nouvelle opportunité d’apprendre et de progresser."
                  : enrollments.length > 0
                  ? "Tous vos cours sont à jour. Explorez de nouveaux parcours !"
                  : "Commencez dès aujourd'hui — explorez le catalogue et inscrivez-vous à un cours."}
            </div>
          </div>
          <div className="relative order-2 h-[116px] min-w-0 overflow-hidden rounded-xl bg-slate-900 shadow-sm sm:h-[132px] lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[132px]">
            <img src="/dashboard-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/35 to-transparent" />
            <p className="absolute left-4 top-4 max-w-[180px] text-sm font-semibold leading-5 text-white sm:text-base">Discipline aujourd’hui,<br/>liberté demain.</p>
          </div>
          <div className="hidden">
            {!loading && unreadNotifs > 0 && <button onClick={() => onNavigate("notifications")} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200"><span className="h-2 w-2 rounded-full bg-[#FF6B00]" />{unreadNotifs} nouvelle{unreadNotifs > 1 ? "s" : ""}</button>}
            <button onClick={() => onNavigate("courses")} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700">{isAdmin ? "Gérer les cours" : "Explorer les cours"}<ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Les mêmes repères d’apprentissage restent visibles pour tous les rôles. */}
      {isAdmin && adminStats && <div className="mx-auto w-full max-w-[1500px] px-4 pt-5 sm:px-8"><AdminStatsStrip stats={adminStats} onNavigate={onNavigate} /></div>}
      {isAdmin && <div className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-8"><AdminQuickActions onNavigate={onNavigate} /></div>}
      <div className="w-full px-4 py-5 sm:px-8"><div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]"><div className="min-w-0 space-y-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{statCards.map(({label,value,icon:Icon,color,bg,onClick})=><button key={label} onClick={onClick} className="flex min-h-[84px] items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-[0_2px_8px_rgba(16,35,66,0.05)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}><Icon className={`h-4 w-4 ${color}`}/></span><span className="min-w-0"><span className="block text-xl font-bold leading-none text-slate-900 dark:text-white">{loading?"—":value}</span><span className="mt-1 block truncate text-[10px] leading-tight text-slate-500">{label}</span></span><ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300"/></button>)}</div><div className="space-y-5">
            <section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Mes cours en cours</h2><button onClick={()=>onNavigate("courses")} className="flex items-center gap-1 text-xs font-semibold text-blue-600">Voir tout <ArrowRight className="h-3.5 w-3.5"/></button></div>{loading?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i=><Skeleton key={i} className="h-64 rounded-xl"/>)}</div>:inProgressCourses.length?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{inProgressCourses.slice(0,3).map(course=>{const pct=progressMap[course.id]??0;return <button key={course.id} onClick={()=>onNavigate("course-detail",course)} className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><div className="h-24 overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-slate-800 dark:to-slate-700"><img src={course.cover_image || "/dashboard-hero.jpg"} alt="" className="h-full w-full object-cover transition group-hover:scale-105"/></div><div className="p-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{course.category||"Formation"}</span><h3 className="mt-3 truncate text-sm font-semibold text-slate-900 dark:text-white">{course.title}</h3><p className="mt-1 truncate text-xs text-slate-500">{course.instructor_name||"Zentrix Academy"}</p><div className="mt-4 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-blue-600" style={{width:`${pct}%`}}/></div><span className="text-[10px] text-slate-500">{pct}%</span></div><div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><BookOpen className="h-3.5 w-3.5 text-blue-600"/>{course.chapters?.length ? `Chapitre ${Math.min((completedChapterCounts[course.id]??0)+1,course.chapters.length)} / ${course.chapters.length}` : "Progression du cours"} <ArrowRight className="ml-auto h-3.5 w-3.5"/></div></div></button>})}</div>:<div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><BookOpen className="mx-auto h-8 w-8 text-blue-500"/><p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">Aucun cours en cours</p><button onClick={()=>onNavigate("courses")} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Découvrir les cours</button></div>}</section>
            <section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Parcours recommandés</h2><button onClick={()=>onNavigate("courses")} className="flex items-center gap-1 text-xs font-semibold text-blue-600">Voir tout <ArrowRight className="h-3.5 w-3.5"/></button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recommendations.filter(c=>!enrollments.some(e=>e.id===c.id)).slice(0,3).map(course=><button key={course.id} onClick={()=>onNavigate("courses")} className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="relative h-16 bg-gradient-to-br from-blue-800 to-indigo-950"><img src={course.cover_image || "/dashboard-sidebar.jpg"} alt="" className="h-full w-full object-cover opacity-80"/><span className="absolute bottom-2 left-3 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white">{course.category||"À découvrir"}</span></div><div className="flex items-center gap-3 p-4"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{course.title}</span><span className="mt-1 block text-xs text-slate-500">{course.duration_hours||"—"} h · {course.level||"Tous niveaux"}</span><span className="mt-2 block truncate text-[11px] font-medium text-blue-600 dark:text-blue-400">{course.recommendation_reasons?.[0] ?? "Sélectionné pour votre parcours"}</span></span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white"><ArrowRight className="h-4 w-4"/></span></div></button>)}</div>{!loading&&!recommendations.some(c=>!enrollments.some(e=>e.id===c.id))&&<p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Aucun nouveau parcours à recommander pour le moment.</p>}</section></div></div><aside className="min-w-0 space-y-5 2xl:absolute 2xl:right-4 2xl:top-0 2xl:w-[360px]">
            <section id="dashboard-calendar" className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30"><CalendarDays className="h-5 w-5"/></span><h2 className="text-sm font-bold text-slate-900 dark:text-white">Mon calendrier</h2></div><button onClick={()=>onNavigate("calendar")} className="text-xs font-semibold text-blue-600">Voir tout →</button></div><div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800/60"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Aucune séance planifiée</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Les activités apparaîtront ici dès qu’elles seront programmées.</p></div><button onClick={()=>onNavigate("courses")} className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300">Explorer les cours</button></section>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20"><Clock className="h-5 w-5"/></span><h2 className="text-sm font-bold text-slate-900 dark:text-white">Prochaine échéance</h2></div><p className="mt-4 text-xs text-slate-500">Aucune date limite n’est enregistrée pour vos cours.</p>{inProgressCourses[0]?<><p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Prochaine étape · {inProgressCourses[0].title}</p><p className="mt-1 text-xs text-slate-500">Progression actuelle : {progressMap[inProgressCourses[0].id]??0}%</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-blue-600" style={{width:`${progressMap[inProgressCourses[0].id]??0}%`}}/></div><button onClick={()=>onNavigate("course-detail",inProgressCourses[0])} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">Reprendre maintenant <ArrowRight className="h-3.5 w-3.5"/></button></>:<p className="mt-3 text-xs leading-relaxed text-slate-500">Votre prochaine étape apparaîtra à l’inscription à un cours.</p>}</section>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30"><FolderOpen className="h-5 w-5"/></span><h2 className="text-sm font-bold text-slate-900 dark:text-white">Ressources rapides</h2></div>{[{label:"Accéder aux ressources",icon:FolderOpen,page:"library"},{label:"Voir mes certificats",icon:Award,page:"certificates"},{label:"Contacter un tuteur",icon:MessageCircle,page:"ai-chat"},{label:"Explorer les cours",icon:BookOpen,page:"courses"}].map(({label,icon:Icon,page})=><button key={label} onClick={()=>onNavigate(page)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-xs text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30"><Icon className="h-4 w-4"/></span>{label}<ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400"/></button>)}</section>
            <section className="rounded-xl bg-blue-50 p-5 dark:bg-blue-950/40"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><Rocket className="h-5 w-5"/></span><div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Envie d’aller plus loin ?</h2><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Découvrez de nouveaux parcours et développez vos compétences.</p><button onClick={()=>onNavigate("courses")} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white">Voir les parcours <ArrowRight className="h-3.5 w-3.5"/></button></div></div></section>
          </aside></div></div>
    </div>
  );
}





