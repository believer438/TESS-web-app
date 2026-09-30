// Copie Zentrix Academy : src/pages/CourseDetail.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@/components/admin/RichTextEditor.css";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  AlertCircle, ArrowLeft, ArrowRight, BookOpen, Brain, CheckCircle2,
  ChevronLeft, ChevronRight, Clock, GraduationCap, Loader2, Menu, Play,
  Sparkles, Star, Users, Video, X, ClipboardList, BookMarked, Download, ExternalLink,
  ZoomIn, ZoomOut,
} from "lucide-react";
import { type Course } from "@/lib/backend-types";
import {
  type BackendChapter, apiGetCourseChapters, apiUpdateCatalogueProgress, isAuthenticated,
  apiGenerateCatalogueAIQuiz, apiSaveQuizResult, type CourseQuizQuestion,
  apiGetLibraryByCourse, type LibraryBook,
} from "@/lib/api-client";
import type { LessonSegment } from "@/lib/mock-data";
import { useAITracking } from "@/hooks/useAITracking";
import { useActivityTracker } from "@/hooks/useActivityTracker";

interface CourseDetailProps {
  course: Course;
  onBack: () => void;
  onOpenAI: () => void;
}

type Slide =
  | { kind: "cover" }
  | { kind: "segment"; segment: LessonSegment; index: number }
  | { kind: "done" };

function backendChapterToSegment(chapter: BackendChapter): LessonSegment {
  const paragraphs: string[] = [];
  if (chapter.description) paragraphs.push(chapter.description);
  if (chapter.content) {
    const chunks = chapter.content.split("\n\n").filter(Boolean);
    paragraphs.push(...chunks.slice(0, 10));
  }
  if (paragraphs.length === 0) paragraphs.push("Contenu du chapitre à venir.");
  return {
    id:               `ch-${chapter.id}`,
    heading:          chapter.title,
    paragraphs,
    content:          chapter.content || "",
    videoUrl:         chapter.video_url || "",
    videoPosition:    chapter.video_position || "bottom",
    videoTitle:       chapter.title,
    videoDescription: chapter.description || "",
    videoDuration:    chapter.duration_min > 0 ? `${chapter.duration_min} min` : "",
  };
}

// ── YouTube URL normalizer ─────────────────────────────────────────────────────
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  // Already an embed URL
  if (url.includes("youtube.com/embed/")) return url.split("?")[0] + "?rel=0&modestbranding=1";
  // youtu.be/ID
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return `https://www.youtube.com/embed/${short[1]}?rel=0&modestbranding=1`;
  // youtube.com/shorts/ID
  const shorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts) return `https://www.youtube.com/embed/${shorts[1]}?rel=0&modestbranding=1`;
  // youtube.com/watch?v=ID
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}?rel=0&modestbranding=1`;
  return null;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function normalizeCourseMarkdown(content: string): string {
  return content
    // Some legacy generations were escaped twice (\\\\**texte\\\\**).
    // Strip the complete run so react-markdown receives actual Markdown.
    .replace(/\\+([|*_`])/g, "$1")
    .replace(/^\s*\*{0,2}\d+\s*\/\s*\d+\*{0,2}\s*$/gm, "")
    .replace(/^\s*[←→]+\s*$/gm, "")
    // Legacy PDF imports included visual bullet markers and page separators as
    // standalone lines. They are extraction noise, not lesson list items.
    .replace(/^\s*[•▪◦·‣*\-–—]+\s*$/gm, "")
    .replace(/^\s*\[Page\s+\d+\]\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function CourseMarkdown({ content }: { content: string }) {
  return (
    <div className="chapter-html-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => <div className="my-6 overflow-x-auto rounded-xl border border-slate-200"><table>{children}</table></div>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
        }}
      >
        {normalizeCourseMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

// ── Course Quiz Modal ─────────────────────────────────────────────────────────

type QuizPhase = "loading" | "quiz" | "result";

function CourseQuizModal({
  courseId,
  courseTitle,
  onClose,
}: {
  courseId:    number;
  courseTitle: string;
  onClose:     () => void;
}) {
  const [phase,       setPhase]       = useState<QuizPhase>("loading");
  const [questions,   setQuestions]   = useState<CourseQuizQuestion[]>([]);
  const [currentQ,    setCurrentQ]    = useState(0);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [showFeedback,setShowFeedback]= useState(false);
  const [answers,     setAnswers]     = useState<{ selected: number; correct: boolean }[]>([]);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    apiGenerateCatalogueAIQuiz(courseId, 5)
      .then((data) => {
        if (data.questions.length === 0) throw new Error("Aucune question générée.");
        setQuestions(data.questions);
        setPhase("quiz");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de génération"));
  }, [courseId]);

  const handleSelect = (idx: number) => {
    if (showFeedback) return;
    setSelected(idx);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (selected === null) return;
    const isCorrect = selected === questions[currentQ].correct_index;
    const nextAnswers = [...answers, { selected, correct: isCorrect }];
    setAnswers(nextAnswers);

    if (currentQ < questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setSelected(null);
      setShowFeedback(false);
    } else {
      // Save results to backend before showing the result screen
      const nCorrect = nextAnswers.filter((a) => a.correct).length;
      const pct      = Math.round((nCorrect / questions.length) * 100);
      if (isAuthenticated()) {
        apiSaveQuizResult({
          course_id:   courseId,
          score:       pct,
          n_questions: questions.length,
          n_correct:   nCorrect,
        }).catch(() => {});
      }
      setPhase("result");
    }
  };

  const score = answers.filter((a) => a.correct).length;
  const q     = questions[currentQ];

  const optionLabel = ["A", "B", "C", "D"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

        {/* Loading */}
        {phase === "loading" && !error && (
          <div className="flex flex-col items-center gap-4 px-8 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">Génération du quiz IA…</p>
              <p className="mt-1 text-sm text-slate-500">L'IA prépare 5 questions ciblées sur «&nbsp;{courseTitle}&nbsp;»</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm font-semibold text-slate-700">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Quiz */}
        {phase === "quiz" && q && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">
                {currentQ + 1}
              </div>
              <div className="flex-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-[#FF6B00] transition-all duration-500"
                    style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Question {currentQ + 1} sur {questions.length}
                </p>
              </div>
              <button onClick={onClose} className="text-slate-300 hover:text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Question */}
            <div className="px-6 py-6">
              <p className="text-lg font-bold leading-snug text-slate-900 dark:text-white">
                {q.question}
              </p>

              <div className="mt-5 space-y-3">
                {q.options.map((opt, i) => {
                  const isCorrect  = i === q.correct_index;
                  const isSelected = i === selected;
                  let btnClass =
                    "w-full rounded-xl border p-4 text-left text-sm transition-all duration-200 flex items-start gap-3 ";

                  if (showFeedback) {
                    if (isCorrect)       btnClass += "border-emerald-400 bg-emerald-50 text-emerald-800 ";
                    else if (isSelected) btnClass += "border-red-400 bg-red-50 text-red-700 ";
                    else                 btnClass += "border-slate-100 text-slate-400 ";
                  } else if (isSelected) {
                    btnClass += "border-violet-400 bg-violet-50 text-violet-900 ";
                  } else {
                    btnClass += "border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 cursor-pointer ";
                  }

                  return (
                    <button key={i} className={btnClass} onClick={() => handleSelect(i)}>
                      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                        showFeedback && isCorrect   ? "bg-emerald-500 text-white" :
                        showFeedback && isSelected  ? "bg-red-400 text-white" :
                        isSelected                  ? "bg-violet-500 text-white" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {optionLabel[i]}
                      </span>
                      <span className="flex-1 leading-relaxed">{opt}</span>
                      {showFeedback && isCorrect  && <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />}
                      {showFeedback && isSelected && !isCorrect && <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showFeedback && q.explanation && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Explication</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{q.explanation}</p>
                </div>
              )}
            </div>

            {/* Next */}
            {showFeedback && (
              <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <button
                  onClick={handleNext}
                  className="w-full bg-[#FF6B00] py-3 text-sm font-bold text-white transition hover:bg-[#e56000]"
                >
                  {currentQ < questions.length - 1 ? "Question suivante →" : "Voir mes résultats"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Result */}
        {phase === "result" && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <p className="text-sm font-bold text-slate-900">Résultats du quiz</p>
              <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-6">
              {/* Score */}
              <div className="flex flex-col items-center py-4">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-8 border-slate-100">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(${score / questions.length >= 0.7 ? "#10b981" : score / questions.length >= 0.5 ? "#f59e0b" : "#ef4444"} ${(score / questions.length) * 360}deg, #f1f5f9 0deg)`,
                    }}
                  />
                  <div className="relative flex flex-col items-center bg-white rounded-full h-20 w-20 justify-center">
                    <span className="text-2xl font-black text-slate-900">{score}/{questions.length}</span>
                    <span className="text-[10px] text-slate-400">correct</span>
                  </div>
                </div>
                <p className="mt-4 text-base font-bold text-slate-900">
                   {score === questions.length
                     ? "Score parfait"
                     : score / questions.length >= 0.7
                     ? "Très bien"
                     : score / questions.length >= 0.5
                     ? "Continuez vos efforts"
                     : "À retravailler"}
                </p>
              </div>

              {/* Question review */}
              <div className="mt-4 space-y-2">
                {questions.map((qq, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-xl border p-3 ${answers[i]?.correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
                  >
                    {answers[i]?.correct
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      : <X          className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{qq.question}</p>
                      {!answers[i]?.correct && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Bonne réponse : <span className="font-semibold text-emerald-700">{qq.options[qq.correct_index]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4">
              <button onClick={onClose} className="w-full bg-[#FF6B00] py-3 text-sm font-bold text-white transition hover:bg-[#e56000]">
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CourseDetail({ course, onBack, onOpenAI }: CourseDetailProps) {
  const [backendChapters, setBackendChapters] = useState<BackendChapter[] | null>(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [navigationVisible, setNavigationVisible] = useState(true);
  const [courseBarVisible, setCourseBarVisible] = useState(true);
  const [readingScale, setReadingScale] = useState(0.94);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readingScrollRef = useRef<HTMLDivElement | null>(null);
  const chapterScrollPositions = useRef<Record<string, number>>({});
  const lastReadingScrollTop = useRef(0);
  const pinchDistance = useRef<number | null>(null);

  const currentChapter =
    backendChapters && current > 0 && current <= backendChapters.length
      ? backendChapters[current - 1]
      : null;

  useSetPageContext({
    current_page: "course-detail",
    page_title:   course.title,
    page_data: {
      course_id:            course.backendId ?? null,
      course_title:         course.title,
      chapter_id:           currentChapter?.id ?? null,
      chapter_title:        currentChapter?.title ?? null,
      chapter_index:        current,
      total_chapters:       backendChapters?.length ?? 0,
      visible_text_excerpt: currentChapter?.content?.slice(0, 500) ?? "",
      selected_text:        typeof window !== "undefined" ? window.getSelection?.()?.toString() ?? "" : "",
    },
  });

  useAITracking({
    courseId:     course.backendId,
    courseTitle:  course.title,
    chapterId:    currentChapter?.id,
    chapterTitle: currentChapter?.title,
  });

  const { logEvent } = useActivityTracker({
    courseId:     course.backendId,
    chapterId:    currentChapter?.id,
    chapterTitle: currentChapter?.title,
  });

  const handleOpenAI = useCallback(() => {
    logEvent("CHAT_OPEN", { chapter: currentChapter?.title });
    onOpenAI();
  }, [logEvent, onOpenAI, currentChapter?.title]);

  const loadChapters = useCallback(() => {
    if (!course.backendId) return;
    setLoadingChapters(true);
    setChapterError(null);
    apiGetCourseChapters(course.backendId)
      .then(setBackendChapters)
      .catch((error) => {
        setBackendChapters([]);
        setChapterError(error instanceof Error ? error.message : "Impossible de charger les chapitres.");
      })
      .finally(() => setLoadingChapters(false));
  }, [course.backendId]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const readingPreferenceKey = `zentrix:course-reading-scale:${course.backendId ?? course.title}`;
  useEffect(() => {
    const stored = Number(window.localStorage.getItem(readingPreferenceKey));
    setReadingScale(Number.isFinite(stored) && stored >= 0.8 && stored <= 1.3 ? stored : 0.94);
  }, [readingPreferenceKey]);

  useEffect(() => {
    window.localStorage.setItem(readingPreferenceKey, readingScale.toFixed(2));
  }, [readingPreferenceKey, readingScale]);

  const segments = useMemo<LessonSegment[]>(() => {
    if (course.backendId !== undefined) {
      if (backendChapters === null) return [];
      return backendChapters.map((ch) => backendChapterToSegment(ch));
    }
    return [];
  }, [course, backendChapters]);

  const slides: Slide[] = useMemo(
    () => [
      { kind: "cover" },
      ...segments.map((segment, index) => ({ kind: "segment" as const, segment, index })),
      { kind: "done" },
    ],
    [segments],
  );

  const total = slides.length;

  const isDoneSlide = slides[current]?.kind === "done";
  useEffect(() => {
    if (isDoneSlide && course.backendId) {
      logEvent("CHAPTER_COMPLETE", {
        course_id:     course.backendId,
        chapters_done: backendChapters?.length,
      });
    }
  }, [isDoneSlide]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback(
    (idx: number) => { const clamped = Math.max(0, Math.min(total - 1, idx)); setCurrent(clamped); },
    [total],
  );
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  const revealNavigation = useCallback(() => {
    setNavigationVisible(true);
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    navigationTimer.current = setTimeout(() => setNavigationVisible(false), 1000);
  }, []);

  useEffect(() => {
    revealNavigation();
  }, [revealNavigation]);

  useEffect(() => () => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      revealNavigation();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft")  prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, revealNavigation]);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    revealNavigation();
    touchStart.current = e.touches.length === 1
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
  };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    revealNavigation();
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    // Vertical reading/scrolling and small horizontal movements must never
    // change the lesson. Require a deliberate, clearly horizontal swipe.
    if (Math.abs(dx) >= 96 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : prev();
    touchStart.current = null;
  };

  const activeReadingKey = currentChapter?.id ? `chapter-${currentChapter.id}` : `slide-${current}`;
  const handleReadingScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const reader = event.currentTarget;
    const nextTop = reader.scrollTop;
    chapterScrollPositions.current[activeReadingKey] = nextTop;

    // Collapsing the secondary header changes the reader height. At the very
    // bottom that would clamp scrollTop, fire another scroll event, and make
    // the header alternate between visible and hidden. Keep it stable there.
    const distanceFromBottom = reader.scrollHeight - nextTop - reader.clientHeight;
    if (distanceFromBottom <= 12) {
      setCourseBarVisible(true);
      lastReadingScrollTop.current = nextTop;
      return;
    }

    // The application header stays fixed. This secondary course bar leaves room
    // for the lesson while reading down and immediately returns when reading up.
    if (nextTop <= 12 || nextTop < lastReadingScrollTop.current - 6) setCourseBarVisible(true);
    if (nextTop > 32 && nextTop > lastReadingScrollTop.current + 6) setCourseBarVisible(false);
    lastReadingScrollTop.current = nextTop;
  }, [activeReadingKey]);

  useEffect(() => {
    const reader = readingScrollRef.current;
    if (!reader) return;
    const savedTop = chapterScrollPositions.current[activeReadingKey] ?? 0;
    const frame = window.requestAnimationFrame(() => {
      reader.scrollTop = savedTop;
      lastReadingScrollTop.current = savedTop;
      setCourseBarVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeReadingKey]);

  const updateReadingScale = useCallback((change: number) => {
    setReadingScale((scale) => Math.round(Math.min(1.3, Math.max(0.8, scale + change)) * 100) / 100);
  }, []);

  const handleReadingTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      const [first, second] = Array.from(event.touches);
      pinchDistance.current = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    }
  };

  const handleReadingTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || pinchDistance.current === null) return;
    event.stopPropagation();
    const [first, second] = Array.from(event.touches);
    const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    const delta = distance - pinchDistance.current;
    if (Math.abs(delta) >= 12) {
      updateReadingScale(delta > 0 ? 0.04 : -0.04);
      pinchDistance.current = distance;
      event.preventDefault();
    }
  };

  const handleReadingTouchEnd = () => { pinchDistance.current = null; };
  const handleReadingWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return;
    // Keep browser/page zoom from taking over while the course reader has focus.
    event.preventDefault();
    updateReadingScale(event.deltaY < 0 ? 0.02 : -0.02);
  };

  const [showBlockingHint, setShowBlockingHint] = useState(false);
  useEffect(() => {
    setShowBlockingHint(false);
    if (!currentChapter) return;
    const timer = setTimeout(() => setShowBlockingHint(true), 3 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [currentChapter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = (current / Math.max(total - 1, 1)) * 100;

  useEffect(() => {
    if (!course.backendId || !isAuthenticated()) return;
    const pct = Math.round(progressPct);
    const t   = setTimeout(() => { apiUpdateCatalogueProgress(course.backendId!, pct).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [progressPct, course.backendId]);

  // Mid-course quiz: show button at chapter index 9 (10th) when course has 20+ chapters
  const showMidCourseQuiz = segments.length >= 20;

  if (loadingChapters) {
    return (
      <div className="h-full w-full overflow-y-auto bg-[hsl(var(--background))] p-6 sm:p-10">
        <div className="mx-auto max-w-3xl animate-pulse space-y-5">
          <div className="h-4 w-24 rounded bg-[hsl(var(--secondary))]" />
          <div className="h-12 w-3/4 rounded bg-[hsl(var(--secondary))]" />
          <div className="h-4 w-1/2 rounded bg-[hsl(var(--secondary))]" />
          <div className="h-64 rounded-2xl bg-[hsl(var(--secondary))]" />
          <div className="space-y-3">
            <div className="h-4 rounded bg-[hsl(var(--secondary))]" />
            <div className="h-4 w-11/12 rounded bg-[hsl(var(--secondary))]" />
            <div className="h-4 w-4/5 rounded bg-[hsl(var(--secondary))]" />
          </div>
        </div>
      </div>
    );
  }

  if (chapterError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--background))] p-6">
        <div className="max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--accent)/.14)] text-[hsl(var(--accent))]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[hsl(var(--foreground))]">Le cours n'est pas disponible</h2>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{chapterError}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={onBack} className="rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]">Retour</button>
            <button onClick={loadChapters} className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))]">Réessayer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="course-reader relative flex h-full flex-col bg-[hsl(var(--card))]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseMove={revealNavigation}
      onWheel={revealNavigation}
    >
      {/* Quiz modal */}
      {quizOpen && course.backendId && (
        <CourseQuizModal
          courseId={course.backendId}
          courseTitle={course.title}
          onClose={() => setQuizOpen(false)}
        />
      )}

      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <div className={`course-reader-topbar z-20 flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 dark:border-[#343434] dark:bg-[#1b1b1b] sm:px-5 ${courseBarVisible ? "course-reader-topbar--visible" : "course-reader-topbar--hidden"}`}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-[#FF6B00] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Cours</span>
        </button>

        <div className="h-5 w-px bg-slate-200" />

        <button
          onClick={() => setPlanOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors ${planOpen ? "text-[#FF6B00]" : "text-slate-500 hover:text-[#FF6B00]"}`}
          title="Afficher / masquer le plan"
        >
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">Plan</span>
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p data-course-category className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF6B00]">
            {course.categoryName}
          </p>
          <p className="truncate text-xs font-semibold text-slate-800">{course.title}</p>
        </div>

        {/* Quiz button */}
        {course.backendId && (
          <button
            onClick={() => setQuizOpen(true)}
            className="flex items-center gap-1.5 border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 transition-colors"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quiz</span>
          </button>
        )}

        <button
          onClick={handleOpenAI}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#FFB347] to-[#FF6B00] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          <Brain className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">IA</span>
        </button>

        <div className="course-reader-zoom hidden items-center gap-1 border-l border-slate-200 pl-2 md:flex" aria-label="Zoom du contenu du cours">
          <button type="button" onClick={() => updateReadingScale(-0.05)} disabled={readingScale <= 0.8} title="Réduire le texte" aria-label="Réduire le texte" className="rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-9 text-center text-[10px] font-semibold tabular-nums text-slate-500">{Math.round(readingScale * 100)}%</span>
          <button type="button" onClick={() => updateReadingScale(0.05)} disabled={readingScale >= 1.3} title="Agrandir le texte" aria-label="Agrandir le texte" className="rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── PROGRESS BAR ─────────────────────────────────────── */}
      <div className="h-[2px] w-full flex-shrink-0 bg-slate-100 dark:bg-[#343434]">
        <div
          className="h-full bg-gradient-to-r from-[#FFB347] to-[#FF6B00] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ── MAIN AREA ─────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">

        {/* Mobile backdrop — tap to close sidebar */}
        {planOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setPlanOpen(false)}
          />
        )}

        {/* ── LEFT PLAN SIDEBAR ────────────── */}
        {/* Mobile: absolute overlay slide-in; Desktop (lg): in-flow width animation */}
        <aside
          className={`absolute inset-y-0 left-0 z-30 w-64 flex-shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:transition-all lg:duration-300 ${planOpen ? "translate-x-0 lg:w-64" : "-translate-x-full lg:w-0"}`}
        >
          <div className="flex h-full w-64 flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Plan du cours</p>
              <button onClick={() => setPlanOpen(false)} className="rounded p-1 text-slate-300 hover:text-slate-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <button
                onClick={() => { goTo(0); setPlanOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                  current === 0
                    ? "border-l-2 border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                    : "border-l-2 border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Star className={`h-3.5 w-3.5 flex-shrink-0 ${current === 0 ? "text-[#FF6B00]" : "text-slate-300"}`} />
                <span className="text-xs font-semibold">Introduction</span>
              </button>

              {segments.length > 0 && (
                <>
                  <p className="mb-1 mt-3 px-4 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-300">
                    {segments.length} chapitre{segments.length !== 1 ? "s" : ""}
                  </p>
                  {segments.map((seg, i) => {
                    const slideIdx  = i + 1;
                    const isCurrent = current === slideIdx;
                    const isDone    = current > slideIdx;
                    return (
                      <button
                        key={seg.id}
                        onClick={() => { goTo(slideIdx); setPlanOpen(false); }}
                        className={`flex w-full items-start gap-2.5 border-l-2 px-4 py-2.5 text-left transition-colors ${
                          isCurrent
                            ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                            : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          isCurrent ? "bg-[#FF6B00] text-white" : isDone ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                        }`}>
                          {isDone ? "✓" : i + 1}
                        </span>
                        <span className="flex-1 text-xs font-medium leading-snug">{seg.heading}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {segments.length === 0 && course.backendId && (
                <p className="px-4 py-6 text-center text-xs text-slate-400">Aucun chapitre disponible.</p>
              )}

              <button
                onClick={() => { goTo(total - 1); setPlanOpen(false); }}
                className={`mt-1 flex w-full items-center gap-2.5 border-l-2 px-4 py-2.5 text-left transition-colors ${
                  current === total - 1
                    ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${current === total - 1 ? "text-emerald-500" : "text-slate-300"}`} />
                <span className="text-xs font-semibold">Fin du cours</span>
              </button>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="font-medium text-slate-400">Progression</span>
                <span className="font-bold text-[#FF6B00]">{Math.round(progressPct)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF6B00] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-2 text-center text-[9px] text-slate-300">{current} / {total - 1} étapes</p>
            </div>
          </div>
        </aside>

        {/* ── SLIDE TRACK ──────────────────────────────────────── */}
        <div className="course-reader-surface relative min-w-0 flex-1 overflow-hidden bg-[hsl(var(--card))]">

          {/* Floating sidebar toggle — always above content */}
          <button
            onClick={() => setPlanOpen((v) => !v)}
            title={planOpen ? "Masquer le plan" : "Afficher le plan"}
            className="absolute left-0 top-1/2 z-40 -translate-y-1/2 flex h-10 w-5 items-center justify-center bg-[#FF6B00] text-white shadow-lg hover:bg-[#e56000] transition-colors"
          >
            {planOpen
              ? <ChevronLeft className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />
            }
          </button>
          <div
            ref={readingScrollRef}
            className="h-full overflow-y-auto overscroll-contain"
            style={{ touchAction: "pan-y" }}
            onScroll={handleReadingScroll}
            onTouchStart={handleReadingTouchStart}
            onTouchMove={handleReadingTouchMove}
            onTouchEnd={handleReadingTouchEnd}
            onWheel={handleReadingWheel}
          >
            {slides[current]?.kind === "cover" && <CoverSlide course={course} onStart={next} />}
            {slides[current]?.kind === "segment" && (
              <SegmentSlide
                segment={(slides[current] as { kind: "segment"; segment: LessonSegment; index: number }).segment}
                index={(slides[current] as { kind: "segment"; segment: LessonSegment; index: number }).index}
                total={segments.length}
                showMidQuizButton={showMidCourseQuiz && (slides[current] as { kind: "segment"; index: number }).index === 9}
                onStartQuiz={() => setQuizOpen(true)}
                readingScale={readingScale}
              />
            )}
            {slides[current]?.kind === "done" && (
              <DoneSlide
                course={course}
                onBack={onBack}
                onOpenAI={handleOpenAI}
                onStartQuiz={() => setQuizOpen(true)}
              />
            )}
          </div>

          {navigationVisible && current > 0 && (
            <button
              onClick={prev}
              onMouseMove={revealNavigation}
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-200 bg-white text-slate-400 shadow-sm hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors sm:left-5"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          {navigationVisible && current < total - 1 && (
            <button
              onClick={next}
              onMouseMove={revealNavigation}
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-200 bg-white text-slate-400 shadow-sm hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors sm:right-5"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── BOTTOM NAV ───────────────────────────────────────── */}
      <div className="course-reader-bottom-nav flex flex-shrink-0 items-center justify-center gap-3 border-t border-slate-100 bg-white py-2.5">
        <span className="text-[10px] font-semibold tabular-nums text-slate-300">{current + 1} / {total}</span>
        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                background:
                  i === current
                    ? "linear-gradient(90deg,#FFB347,#FF6B00)"
                    : i < current
                    ? "rgba(255,107,0,0.3)"
                    : "#e2e8f0",
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-300">← →</span>
      </div>

      {/* ── PROACTIVE AI BLOCKING HINT ───────────────────────────────────── */}
      {showBlockingHint && currentChapter && (
        <div className="absolute bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="course-ai-hint flex items-start gap-3 rounded-2xl border border-orange-200 bg-white p-4 shadow-2xl shadow-[#FF6B00]/10">
            <div className="course-ai-hint-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full shadow">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800">Cette partie semble difficile ?</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                Je peux t'expliquer <span className="font-medium text-slate-700">«&nbsp;{currentChapter.title}&nbsp;»</span> autrement, avec des exemples concrets.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => { setShowBlockingHint(false); handleOpenAI(); }}
                  className="course-ai-hint-action flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold shadow transition-opacity hover:opacity-90"
                >
                  Oui, aide-moi
                </button>
                <button
                  onClick={() => setShowBlockingHint(false)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
                >
                  Non merci
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Cover Slide ─────────────────────────────────────────────────────────── */
function CoverSlide({ course, onStart }: { course: Course; onStart: () => void }) {
  return (
    <div className="course-reader-cover flex min-h-full flex-col items-center justify-center bg-white px-6 py-12">
      {course.coverImage && (
        <div className="mb-8 w-full max-w-2xl overflow-hidden rounded-none shadow-lg">
          <img src={course.coverImage} alt={course.title} className="h-48 w-full object-cover" />
        </div>
      )}

      <div className="w-full max-w-2xl text-center">
        <span data-course-category className="inline-block border border-[#FF6B00]/30 bg-orange-50 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#FF6B00]">
          {course.categoryName}
        </span>

        <h1 className="mt-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
          {course.title}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">{course.description}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-400">
          {course.estimatedDuration > 0 && (
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#FFB347]" />{course.estimatedDuration}h de contenu</span>
          )}
          {course.chaptersCount > 0 && (
            <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-[#FFB347]" />{course.chaptersCount} chapitre{course.chaptersCount !== 1 ? "s" : ""}</span>
          )}
          {course.enrolledCount != null && (
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#FFB347]" />{course.enrolledCount.toLocaleString("fr-FR")} inscrits</span>
          )}
          {course.professor && (
            <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-[#FFB347]" />{course.professor}</span>
          )}
        </div>

        <button
          onClick={onStart}
          className="course-reader-primary-action mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-md transition-all hover:shadow-lg"
        >
          <Play className="h-4 w-4 fill-white" />
          Commencer
        </button>

        <p className="mt-4 text-[10px] text-slate-300">Utilisez les flèches ou swipez pour naviguer</p>
      </div>
    </div>
  );
}

/* ── Segment Slide ───────────────────────────────────────────────────────── */
function SegmentSlide({
  segment,
  index,
  total,
  showMidQuizButton,
  onStartQuiz,
  readingScale,
}: {
  segment:           LessonSegment;
  index:             number;
  total:             number;
  showMidQuizButton: boolean;
  onStartQuiz:       () => void;
  readingScale:      number;
}) {
  const hasVideo   = Boolean(segment.videoUrl);
  const hasContent = Boolean(segment.content?.trim());

  return (
    <div className="course-reader-chapter flex min-h-full flex-col bg-white">
      {/* Chapter header */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-100 px-6 py-4 lg:px-10">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-[#FF6B00] text-xs font-bold text-white">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-300">
            Chapitre {index + 1} sur {total}
          </p>
          <h2 className="truncate text-base font-bold text-slate-900">{segment.heading}</h2>
        </div>
      </div>

      {/* ── Video at top ── */}
      {hasVideo && segment.videoPosition === "top" && (
        <VideoPlayer url={segment.videoUrl} />
      )}

      {hasVideo && segment.videoPosition === "middle" && (
        <div className="mx-auto w-full max-w-4xl px-6 pt-7 lg:px-10">
          <VideoPlayer url={segment.videoUrl} />
        </div>
      )}

      {/* ── Text content (max width centered) ── */}
      <div className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
        <div
          className="chapter-reading-content mx-auto w-full max-w-3xl"
          style={{ "--course-reading-scale": readingScale } as React.CSSProperties}
        >

          {hasContent ? (
            segment.content!.trim().startsWith("<") ? (
              <div
                className="chapter-html-content"
                dangerouslySetInnerHTML={{ __html: segment.content! }}
              />
            ) : <CourseMarkdown content={segment.content!} />
          ) : (
            <div className="space-y-5">
              {segment.paragraphs.map((p, i) => (
                <p key={i} className="text-[15px] leading-8 text-slate-600">{p}</p>
              ))}
            </div>
          )}

          {/* Mid-course quiz button (chapter 10 in long courses) */}
          {showMidQuizButton && (
            <div className="mt-10 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100">
                  <ClipboardList className="h-6 w-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-slate-900">Faites le point !</h3>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    Vous avez parcouru 10 chapitres. L'IA va générer un quiz ciblé sur ce que vous venez d'étudier pour valider votre compréhension avant de continuer.
                  </p>
                  <button
                    onClick={onStartQuiz}
                    className="mt-4 flex items-center gap-2 bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    Passer au quiz intermédiaire
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Video at bottom (default) ── */}
      {hasVideo && segment.videoPosition === "bottom" && (
        <VideoPlayer url={segment.videoUrl} />
      )}
    </div>
  );
}

/* ── Standalone video player (no background wrapper) ─────────────────────── */
function VideoPlayer({ url }: { url: string }) {
  const embedUrl = getYouTubeEmbedUrl(url);
  return (
    <div className="w-full">
      <div className="relative aspect-video w-full bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Vidéo associée"
          />
        ) : (
          <video controls preload="metadata" playsInline className="h-full w-full bg-black">
            <source src={url} type="video/mp4" />
          </video>
        )}
      </div>
    </div>
  );
}

/* ── Done Slide ──────────────────────────────────────────────────────────── */
function DoneSlide({
  course,
  onBack,
  onOpenAI,
  onStartQuiz,
}: {
  course:       Course;
  onBack:       () => void;
  onOpenAI:     () => void;
  onStartQuiz:  () => void;
}) {
  const [resources, setResources] = useState<LibraryBook[]>([]);

  useEffect(() => {
    if (!course.backendId) return;
    apiGetLibraryByCourse(course.backendId)
      .then(setResources)
      .catch(() => {});
  }, [course.backendId]);

  return (
    <div className="course-reader-done flex min-h-full flex-col items-center bg-white px-6 py-12">
      <div className="flex h-20 w-20 items-center justify-center border-2 border-emerald-200 bg-emerald-50">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      </div>

      <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500">Cours terminé</p>
      <h2 className="mt-2 text-3xl font-black text-slate-900">Félicitations !</h2>
      <p className="mt-4 max-w-md text-center text-sm leading-7 text-slate-500">
        Vous avez parcouru toutes les sections de{" "}
        <span className="font-semibold text-slate-800">« {course.title} »</span>.<br />
        Testez vos connaissances avec un quiz de révision !
      </p>

      {/* Quiz CTA — primary */}
      <button
        onClick={onStartQuiz}
        className="course-reader-primary-action mt-8 flex w-full max-w-sm items-center justify-center gap-2.5 px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:opacity-95"
      >
        <ClipboardList className="h-5 w-5" />
        Quiz de révision IA
        <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
          5 questions
        </span>
      </button>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:mt-5 w-full max-w-sm">
        <button
          onClick={onOpenAI}
          className="course-reader-secondary-action flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 transition-opacity"
        >
          <Sparkles className="h-4 w-4" />
          Réviser avec l'IA
        </button>
        <button
          onClick={onBack}
          className="course-reader-return-action flex flex-1 items-center justify-center gap-2 border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux cours
        </button>
      </div>

      {/* ── Ressources associées ──────────────────────────────────── */}
      {resources.length > 0 && (
        <div className="mt-10 w-full max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-[#FF6B00]" />
            <p className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Ressources recommandées pour ce cours
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {resources.map(book => (
              <div
                key={book.id}
                className="flex gap-3 border border-slate-200 bg-white p-3 shadow-sm hover:border-[#FF6B00]/30 transition-colors"
              >
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={book.title}
                    className="h-16 w-11 flex-shrink-0 rounded object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="flex h-16 w-11 flex-shrink-0 items-center justify-center rounded bg-slate-100">
                    <BookMarked className="h-5 w-5 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{book.title}</p>
                  <p className="truncate text-xs text-slate-400">{book.author}</p>
                  <span className="mt-1 inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FF6B00]">
                    {book.category}
                  </span>
                  <div className="mt-2 flex gap-1.5">
                    {(book.read_url || book.file_url) && (
                      <a
                        href={book.read_url || book.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-[#FF6B00]/40 hover:text-[#FF6B00] transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Lire
                      </a>
                    )}
                    {book.download_url && (
                      <a
                        href={book.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="h-3 w-3" /> PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
