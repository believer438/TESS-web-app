// Copie Zentrix Academy : src/pages/AdminQuizStatsPage.tsx
import { useCallback, useEffect, useState } from "react";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  BarChart3, Brain, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardList, Loader2, RefreshCw, Search, Sparkles,
  Trophy, Users, XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  apiAdminGetAllQuizStats, apiAdminGenerateQuiz,
  apiGetCatalogueAllAdmin,
  type AdminQuizStat, type CatalogueCourse,
} from "@/lib/api-client";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

interface CourseStats {
  course_id: number;
  course_title: string;
  attempts: number;
  avg_score: number;
  best_score: number;
  unique_users: number;
}

function computeCourseStats(stats: AdminQuizStat[]): CourseStats[] {
  const map: Record<number, AdminQuizStat[]> = {};
  for (const s of stats) {
    if (!map[s.course_id]) map[s.course_id] = [];
    map[s.course_id].push(s);
  }
  return Object.entries(map).map(([id, arr]) => ({
    course_id: Number(id),
    course_title: arr[0].course_title,
    attempts: arr.length,
    avg_score: Math.round(arr.reduce((a, s) => a + s.score, 0) / arr.length),
    best_score: Math.max(...arr.map(s => s.score)),
    unique_users: new Set(arr.map(s => s.user_id)).size,
  })).sort((a, b) => b.attempts - a.attempts);
}

export default function AdminQuizStatsPage() {
  const [stats, setStats]       = useState<AdminQuizStat[]>([]);
  const [courses, setCourses]   = useState<CatalogueCourse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [genId, setGenId]       = useState<number | null>(null);
  const [sortCol, setSortCol]   = useState<"date" | "score" | "user">("date");
  const [sortAsc, setSortAsc]   = useState(false);
  const [tab, setTab]           = useState<"results" | "courses">("results");
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([
      apiAdminGetAllQuizStats(),
      apiGetCatalogueAllAdmin(),
    ])
      .then(([s, c]) => { setStats(s); setCourses(c); })
      .catch(e => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useSetPageContext({
    current_page: "admin-quiz-stats",
    page_title: "Administration — Statistiques Quiz",
    page_data: {
      active_tab: tab,
      total_quiz_results: stats.length,
      total_courses: courses.length,
      search_query: search || null,
      sort_column: sortCol,
      sort_ascending: sortAsc,
      recent_results: stats.slice(0, 10).map((s) => ({
        user_email: s.user_email ?? s.user_name,
        course_title: s.course_title,
        score: s.score,
        date: s.date ?? s.created_at,
      })),
    },
  });

  const handleGenerate = async (courseId: number, courseTitle: string) => {
    setGenId(courseId);
    try {
      const res = await apiAdminGenerateQuiz(courseId, 8);
      toast({
        title: "Quiz généré !",
        description: `${res.questions.length} questions créées pour « ${courseTitle} »`,
      });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur IA", variant: "destructive" });
    } finally {
      setGenId(null);
    }
  };

  const courseStats = computeCourseStats(stats);

  const filtered = stats.filter(s =>
    s.user_name.toLowerCase().includes(search.toLowerCase()) ||
    s.course_title.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortCol === "date")  diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortCol === "score") diff = a.score - b.score;
    if (sortCol === "user")  diff = a.user_name.localeCompare(b.user_name);
    return sortAsc ? diff : -diff;
  });

  const SortBtn = ({ col, label }: { col: typeof sortCol; label: string }) => (
    <button
      onClick={() => { if (sortCol === col) setSortAsc(v => !v); else { setSortCol(col); setSortAsc(false); } }}
      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
    >
      {label}
      {sortCol === col
        ? sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        : <ChevronDown className="h-3 w-3 opacity-30" />}
    </button>
  );

  const totalAttempts = stats.length;
  const avgScore = stats.length ? Math.round(stats.reduce((a, s) => a + s.score, 0) / stats.length) : 0;
  const passRate = stats.length ? Math.round((stats.filter(s => s.score >= 70).length / stats.length) * 100) : 0;
  const uniqueStudents = new Set(stats.map(s => s.user_id)).size;

  return (
    <div className="min-h-full bg-[#f4f6fb] p-5 dark:bg-slate-950 sm:p-6">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">
            <ClipboardList className="h-3.5 w-3.5" />
            Administration
          </div>
          <h1 className="mt-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            Résultats Quiz
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {totalAttempts} tentatives · {uniqueStudents} étudiants · score moyen {avgScore}%
          </p>
        </div>
        <button
          onClick={load}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tentatives",       value: totalAttempts, icon: <ClipboardList className="h-5 w-5 text-[#FF6B00]" />,           bg: "bg-[#FF6B00]/10" },
          { label: "Score moyen",      value: `${avgScore}%`, icon: <BarChart3 className="h-5 w-5 text-blue-500" />,              bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Taux de réussite", value: `${passRate}%`, icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,        bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Étudiants actifs", value: uniqueStudents, icon: <Users className="h-5 w-5 text-violet-500" />,                bg: "bg-violet-50 dark:bg-violet-900/20" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 w-fit">
        {([
          { key: "results", label: "Tous les résultats", icon: ClipboardList },
          { key: "courses", label: "Par cours", icon: Brain },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-[#FF6B00] text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      ) : tab === "results" ? (
        <>
          {/* Search */}
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chercher par étudiant ou cours…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
              <Trophy className="h-12 w-12 text-slate-200 dark:text-slate-700" />
              <p className="text-sm text-slate-400">Aucun résultat de quiz pour l'instant</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                      <th className="px-4 py-3 text-left"><SortBtn col="user" label="Étudiant" /></th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Cours</th>
                      <th className="px-4 py-3 text-center"><SortBtn col="score" label="Score" /></th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">Réponses</th>
                      <th className="px-4 py-3 text-right"><SortBtn col="date" label="Date" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sorted.map(s => (
                      <tr key={s.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB347] to-[#FF6B00] text-[10px] font-bold text-white">
                              {s.user_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white">{s.user_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{s.course_title}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            s.score >= 80 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : s.score >= 60 ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                            : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          }`}>
                            {s.score >= 70
                              ? <CheckCircle2 className="h-3 w-3" />
                              : <XCircle className="h-3 w-3" />}
                            {s.score}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-xs">
                          {s.n_correct}/{s.n_questions}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {relativeTime(s.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Par cours tab ── */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => {
            const cs = courseStats.find(c => c.course_id === course.id);
            const isGenerating = genId === course.id;
            return (
              <div key={course.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                {course.cover_image && (
                  <div className="h-28 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={course.cover_image} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
                <div className="p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2 flex-1">{course.title}</h3>
                    {!course.is_published && (
                      <span className="flex-shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">Brouillon</span>
                    )}
                  </div>

                  {cs ? (
                    <div className="mb-3 mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="text-base font-black text-[#FF6B00]">{cs.attempts}</p>
                        <p className="text-[9px] text-slate-400">tentatives</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                        <p className={`text-base font-black ${cs.avg_score >= 70 ? "text-emerald-500" : "text-amber-500"}`}>{cs.avg_score}%</p>
                        <p className="text-[9px] text-slate-400">moy.</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="text-base font-black text-violet-500">{cs.unique_users}</p>
                        <p className="text-[9px] text-slate-400">étudiants</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mb-3 mt-2 text-xs text-slate-400">Aucune tentative enregistrée</p>
                  )}

                  <button
                    onClick={() => handleGenerate(course.id, course.title)}
                    disabled={isGenerating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB347] to-[#FF6B00] py-2.5 text-xs font-bold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
                  >
                    {isGenerating
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Génération…</>
                      : <><Sparkles className="h-4 w-4" />Générer un quiz IA</>}
                  </button>
                </div>
              </div>
            );
          })}

          {courses.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
              <Brain className="h-12 w-12 text-slate-200 dark:text-slate-700" />
              <p className="text-sm text-slate-400">Aucun cours disponible</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
