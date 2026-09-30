// Copie Zentrix Academy : src/pages/QuizzesPage.tsx
import { useCallback, useEffect, useState } from "react";
import { useSetPageContext } from "@/hooks/usePageContext";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import {
  BarChart3, BookOpen, Brain, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardCheck, Clock, Hash, Loader2,
  RefreshCw, RotateCcw, Sparkles, Trophy, XCircle,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { useToast } from "@/hooks/use-toast";
import {
  apiGetMyEnrollments,
  apiGetMyQuizResults,
  apiGenerateCourseQuiz,
  apiSaveQuizResult,
  apiErrorMessage,
  isAuthenticated,
  type CatalogueCourse,
  type QuizQuestion,
  type MyQuizResults,
} from "@/lib/api-client";

interface QuizzesPageProps {
  onOpenAI: () => void;
}

// ── Quiz runner ───────────────────────────────────────────────────────────────

function QuizRunner({
  courseId,
  courseTitle,
  questions,
  onFinish,
  onCancel,
}: {
  courseId: number;
  courseTitle: string;
  questions: QuizQuestion[];
  onFinish: (score: number, nCorrect: number) => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const q = questions[current];
  const total = questions.length;
  const answered = Object.keys(answers).length;
  const isLast = current === total - 1;

  const nCorrect = questions.filter((q, i) => answers[i] === q.correct).length;
  const score = Math.round((nCorrect / total) * 100);

  const handleAnswer = (opt: string) => {
    if (showResult) return;
    setAnswers((prev) => ({ ...prev, [current]: opt }));
  };

  const handleNext = () => {
    if (current < total - 1) setCurrent((v) => v + 1);
  };
  const handlePrev = () => {
    if (current > 0) setCurrent((v) => v - 1);
  };

  const handleFinish = async () => {
    setShowResult(true);
    setSaving(true);
    try {
      await apiSaveQuizResult({ course_id: courseId, score, n_questions: total, n_correct: nCorrect });
    } catch {
      toast({ title: "Score non sauvegardé", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (showResult) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <div className="border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${score >= 70 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
            {score >= 70
              ? <Trophy className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              : <XCircle className="h-10 w-10 text-red-500" />}
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{score}%</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {nCorrect} bonne{nCorrect !== 1 ? "s" : ""} réponse{nCorrect !== 1 ? "s" : ""} sur {total}
          </p>
          <p className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-200">
            {score >= 80 ? "Excellent travail !" : score >= 60 ? "Bon travail, continuez !" : "Révisez ce cours et réessayez."}
          </p>
          {saving && <p className="mt-2 text-xs text-slate-400"><Loader2 className="inline mr-1 h-3 w-3 animate-spin" />Sauvegarde…</p>}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Correction</h3>
          {questions.map((q, i) => {
            const userAns = answers[i];
            const correct = q.correct;
            const isOk = userAns === correct;
            return (
              <div key={i} className={`border p-4 ${isOk ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"}`}>
                <div className="flex items-start gap-2">
                  {isOk ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{i + 1}. {q.question}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Votre réponse : <span className={`font-bold ${isOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{userAns ? `${userAns}. ${q.options[userAns as keyof typeof q.options]}` : "—"}</span>
                    </p>
                    {!isOk && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Bonne réponse : <span className="font-bold">{correct}. {q.options[correct as keyof typeof q.options]}</span>
                      </p>
                    )}
                    {q.explanation && (
                      <p className="mt-1.5 text-[11px] italic text-slate-500 dark:text-slate-400">{q.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
            Retour aux cours
          </button>
          <button onClick={() => { setShowResult(false); setCurrent(0); setAnswers({}); }} className="flex flex-1 items-center justify-center gap-2 bg-[#FF6B00] py-2.5 text-sm font-bold text-white hover:bg-[#e56000]">
            <RotateCcw className="h-4 w-4" />Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      {/* Progress bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate mr-2">{courseTitle}</span>
          <span className="flex-shrink-0">Question {current + 1} / {total}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
          <div className="h-full bg-[#FF6B00] transition-all duration-300" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="mb-6 text-base font-bold leading-relaxed text-slate-900 dark:text-white">
          {current + 1}. {q.question}
        </p>
        <div className="space-y-3">
          {(["A", "B", "C", "D"] as const).map((opt) => {
            const selected = answers[current] === opt;
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className={`flex w-full items-start gap-3 border px-4 py-3 text-left text-sm transition-colors ${
                  selected
                    ? "border-[#FF6B00] bg-[#FF6B00]/5 text-slate-900 dark:text-white"
                    : "border-slate-200 bg-white hover:border-[#FF6B00]/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                }`}
              >
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${selected ? "bg-[#FF6B00] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {opt}
                </span>
                <span className="flex-1 leading-snug text-slate-700 dark:text-slate-200">{q.options[opt]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={handlePrev} disabled={current === 0} className="flex shrink-0 items-center gap-1.5 border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
          <ChevronLeft className="h-4 w-4" />Précédente
        </button>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          Abandonner
        </button>
        {isLast ? (
          <button
            onClick={handleFinish}
            disabled={answered < total}
            className="flex shrink-0 items-center gap-1.5 bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white hover:bg-[#e56000] disabled:opacity-50"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span className="whitespace-nowrap">Terminer ({answered}/{total})</span>
          </button>
        ) : (
          <button onClick={handleNext} disabled={!answers[current]} className="flex shrink-0 items-center gap-1.5 border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
            Suivante<ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Course Quiz Card ──────────────────────────────────────────────────────────

function CourseQuizCard({
  course,
  bestScore,
  attempts,
  onGenerate,
  generating,
}: {
  course: CatalogueCourse;
  bestScore: number | null;
  attempts: number;
  onGenerate: (courseId: number) => void;
  generating: boolean;
}) {
  const levelColors: Record<string, string> = {
    beginner:     "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20",
    intermediate: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",
    advanced:     "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20",
  };
  const levelLabel: Record<string, string> = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

  return (
    <article className="border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      {course.cover_image && (
        <div className="h-32 overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img src={course.cover_image} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${levelColors[course.level] ?? levelColors.beginner}`}>
              {levelLabel[course.level] ?? course.level}
            </span>
            {course.category && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{course.category}</p>}
            <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">{course.title}</h3>
          </div>
          {bestScore !== null && (
            <div className="flex flex-shrink-0 flex-col items-end">
              <span className={`text-xl font-black ${bestScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                {bestScore}%
              </span>
              <span className="text-[9px] font-semibold uppercase text-slate-400">meilleur</span>
            </div>
          )}
        </div>

        {attempts > 0 && (
          <div className="mb-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3 text-[#FF6B00]" />{attempts} tentative{attempts !== 1 ? "s" : ""}</span>
            {course.instructor_name && <span className="flex items-center gap-1"><BookOpen className="h-3 w-3 text-[#FF6B00]" />{course.instructor_name}</span>}
          </div>
        )}

        <button
          onClick={() => onGenerate(course.id)}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[#FFB347] to-[#FF6B00] py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Génération en cours…</>
          ) : (
            <><Sparkles className="h-4 w-4" />{attempts > 0 ? "Nouveau quiz IA" : "Générer un quiz IA"}</>
          )}
        </button>
      </div>
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuizzesPage({ onOpenAI }: QuizzesPageProps) {
  const [courses, setCourses] = useState<CatalogueCourse[]>([]);
  const [results, setResults] = useState<MyQuizResults>({});
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<{
    courseId: number;
    courseTitle: string;
    questions: import("@/lib/api-client").QuizQuestion[];
  } | null>(null);
  const { toast } = useToast();
  const authenticated = isAuthenticated();

  const load = useCallback(async () => {
    if (!authenticated) { setLoading(false); return; }
    setLoading(true);
    try {
      const [enrollments, quizResults] = await Promise.all([
        apiGetMyEnrollments(),
        apiGetMyQuizResults(),
      ]);
      setCourses(enrollments);
      setResults(quizResults);
    } catch (err) {
      toast({ title: "Erreur de chargement", description: apiErrorMessage(err, "Erreur réseau"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => { load(); }, [load]);

  const { logEvent } = useActivityTracker({
    courseId: activeQuiz?.courseId,
  });

  const handleGenerate = async (courseId: number) => {
    setGeneratingId(courseId);
    try {
      const data = await apiGenerateCourseQuiz(courseId, 5);
      if (!data.questions || data.questions.length === 0) throw new Error("Aucune question générée");
      setActiveQuiz({ courseId: data.course_id, courseTitle: data.course_title, questions: data.questions });
      logEvent("QUIZ_START", { course_id: data.course_id, course_title: data.course_title });
    } catch (err) {
      toast({
        title: "Génération impossible",
        description: apiErrorMessage(err, "Le quiz n'a pas pu être généré. Réessayez."),
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleQuizFinish = async (score: number, nCorrect: number) => {
    const eventType = score >= 60 ? "QUIZ_COMPLETE" : "QUIZ_FAILED";
    logEvent(eventType, {
      score,
      n_correct: nCorrect,
      course_id: activeQuiz?.courseId,
      course_title: activeQuiz?.courseTitle,
    });
    await load();
    setActiveQuiz(null);
  };

  const allResults = Object.values(results);
  const totalAttempts = allResults.reduce((s, r) => s + r.attempts, 0);
  const completedCourses = allResults.length;
  const avgScore = totalAttempts === 0
    ? 0
    : Math.round(allResults.reduce((s, r) => s + r.best_score, 0) / allResults.length);

  useSetPageContext({
    current_page: "quizzes",
    page_title:   "Quiz & Examens",
    page_data: {
      quiz_in_progress:       !!activeQuiz,
      selected_course_title:  activeQuiz?.courseTitle ?? null,
      total_courses:          courses.length,
      attempts_count:         totalAttempts,
      best_quiz_score:        avgScore,
    },
  });

  if (activeQuiz) {
    return (
    <div className="min-h-full w-full overflow-x-hidden bg-white dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button onClick={() => setActiveQuiz(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#FF6B00] dark:text-slate-400">
            <ChevronLeft className="h-4 w-4" />Retour
          </button>
        </div>
        <QuizRunner
          courseId={activeQuiz.courseId}
          courseTitle={activeQuiz.courseTitle}
          questions={activeQuiz.questions}
          onFinish={handleQuizFinish}
          onCancel={() => setActiveQuiz(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900">
      <PageHero
        eyebrow="Évaluations"
        title="Quiz & Examens"
        subtitle="Des quiz IA générés sur mesure pour chacun de vos cours inscrits. Testez vos connaissances et suivez vos progrès."
        backgroundImage="/page-hero-quizzes.png"
        icon={<ClipboardCheck className="h-7 w-7" />}
      />

       <div className="mx-auto max-w-7xl space-y-8 overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Hash,     label: "Cours inscrits",   value: courses.length,    accent: "text-blue-600" },
            { icon: Trophy,   label: "Cours avec quiz",  value: completedCourses,  accent: "text-emerald-600" },
            { icon: BarChart3, label: "Meilleur moy.",   value: totalAttempts > 0 ? `${avgScore}%` : "—", accent: "text-[#FF6B00]" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 border-l-4 border-[#FF6B00] bg-white p-4 shadow-sm dark:border-orange-500/60 dark:bg-slate-950">
              <div className={`flex h-10 w-10 items-center justify-center bg-slate-100 dark:bg-slate-800 ${stat.accent}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        {!authenticated ? (
          <div className="border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-slate-700 dark:bg-slate-950">
            <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-700" />
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">Connectez-vous pour accéder à vos quiz</p>
            <p className="mt-1 text-sm text-slate-400">Les quiz sont générés à partir de vos cours inscrits.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
          </div>
        ) : courses.length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-slate-700 dark:bg-slate-950">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-700" />
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">Aucun cours inscrit</p>
            <p className="mt-1 text-sm text-slate-400">Inscrivez-vous à un cours dans la section « Tous les cours » pour pouvoir générer des quiz.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vos cours inscrits</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cliquez sur un cours pour générer un quiz IA personnalisé</p>
              </div>
              <button
                onClick={load}
                className="flex items-center gap-1.5 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
              >
                <RefreshCw className="h-3.5 w-3.5" />Actualiser
              </button>
            </div>

             <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const courseResults = results[String(course.id)];
                return (
                  <CourseQuizCard
                    key={course.id}
                    course={course}
                    bestScore={courseResults?.best_score ?? null}
                    attempts={courseResults?.attempts ?? 0}
                    onGenerate={handleGenerate}
                    generating={generatingId === course.id}
                  />
                );
              })}
            </div>

            {/* History */}
            {totalAttempts > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Historique des tentatives</h2>
                <div className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  {courses
                    .filter((c) => results[String(c.id)])
                    .map((course) => {
                      const r = results[String(course.id)];
                      return (
                        <div key={course.id} className="border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{course.title}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                <RotateCcw className="mr-1 inline h-3 w-3" />{r.attempts} tentative{r.attempts !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-4">
                              <div className="text-right">
                                <p className={`text-lg font-black ${r.best_score >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                                  {r.best_score}%
                                </p>
                                <p className="text-[10px] text-slate-400">meilleur</p>
                              </div>
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${r.best_score >= 70 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                                {r.best_score >= 70
                                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                  : <Clock className="h-5 w-5 text-amber-500" />}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {r.results.slice(0, 5).map((res) => (
                              <span key={res.id} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${res.score >= 70 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"}`}>
                                {res.score}% — {res.n_correct}/{res.n_questions}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* AI tip */}
            <div className="border border-[#FF6B00]/20 bg-gradient-to-r from-[#FF6B00]/5 to-transparent p-5">
              <div className="flex items-start gap-3">
                <Brain className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#FF6B00]" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Conseils personnalisés avec l'assistant IA
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Après un quiz, demandez à l'assistant de vous expliquer les erreurs ou d'approfondir un chapitre.
                  </p>
                  <button
                    onClick={onOpenAI}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B00] hover:underline"
                  >
                    <Sparkles className="h-3.5 w-3.5" />Ouvrir l'assistant
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

