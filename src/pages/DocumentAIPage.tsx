// Copie Zentrix Academy : src/pages/DocumentAIPage.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  ArrowLeft, ArrowRight, Bot, CheckCircle2, ChevronUp, Clock, FileText,
  FileUp, HelpCircle, LoaderCircle, Plus, RefreshCw, Save, Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  apiAIChatStream, apiGetMyCours, apiSaveAnalysis, apiUploadCours,
  isAuthenticated, type BackendCours,
} from "@/lib/api-client";
import { useAITracking } from "@/hooks/useAITracking";
import AIMarkdown from "@/components/ai/AIMarkdown";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES    = 15 * 1024 * 1024; // 15 Mo
const ALLOWED_EXTS      = [".pdf", ".doc", ".docx", ".txt"];
const ALLOWED_EXTS_LABEL = "PDF, DOCX ou TXT (max 15 Mo)";

const ANALYSIS_OPTIONS = [
  { id: "explain", label: "Résumer et expliquer le document" },
  { id: "quiz",    label: "Créer un questionnaire de révision" },
  { id: "logic",   label: "Fournir une explication logique" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(s?: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024)          return `${bytes} o`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") return "";
    if (
      err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError") ||
      err.message.includes("network")
    ) {
      return "Connexion interrompue. Vérifiez votre connexion et réessayez.";
    }
    return err.message;
  }
  return "Une erreur inattendue s'est produite.";
}

// ── Render formatted text ─────────────────────────────────────────────────────
function FormattedText({ text, streaming }: { text: string; streaming?: boolean }) {
  return <AIMarkdown content={text} isStreaming={streaming} rich className="text-slate-700 dark:text-slate-300" />;
}

function FormattedQuestions({ text, streaming }: { text: string; streaming?: boolean }) {
  return <AIMarkdown content={text} isStreaming={streaming} rich className="text-slate-700 dark:text-slate-300" />;
}

// ── Document card ─────────────────────────────────────────────────────────────
function DocumentCard({
  doc, onView, onReanalyze,
}: {
  doc: BackendCours;
  onView: () => void;
  onReanalyze: () => void;
}) {
  const preview = doc.analysis_result?.slice(0, 120).trim();
  const ext     = doc.file_type?.toUpperCase() ?? "DOC";

  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFB347]/20 to-[#FF6B00]/20">
          <FileText className="h-5 w-5 text-[#FF6B00]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-[14px] font-bold text-slate-900 dark:text-white">{doc.titre}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium uppercase dark:bg-slate-800">{ext}</span>
            {doc.file_size && <span>{fmtSize(doc.file_size)}</span>}
            {doc.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {fmtDate(doc.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {doc.has_analysis ? (
        <div className="min-h-[48px] rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{preview}…</p>
          <p className="mt-1 text-[10px] font-medium text-emerald-500">
            ✓ Analysé {doc.analyzed_at ? `· ${fmtDate(doc.analyzed_at)}` : ""}
          </p>
        </div>
      ) : (
        <div className="flex min-h-[48px] items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2.5 dark:border-slate-700">
          <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 dark:text-slate-600" />
          <p className="text-[12px] text-slate-400 dark:text-slate-500">Pas encore analysé</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {doc.has_analysis && (
          <button
            onClick={onView}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FF6B00] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#e56000]"
          >
            <Bot className="h-3.5 w-3.5" />
            Voir l'analyse
          </button>
        )}
        <button
          onClick={onReanalyze}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors ${
            doc.has_analysis
              ? "flex-shrink-0 border-slate-200 text-slate-600 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 dark:text-slate-300"
              : "flex-1 border-[#FF6B00]/50 bg-[#FF6B00]/5 text-[#FF6B00] hover:bg-[#FF6B00]/10"
          }`}
        >
          {doc.has_analysis ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {doc.has_analysis ? "Ré-analyser" : "Analyser"}
        </button>
      </div>
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DocumentAIPage({ onContinueWithAI }: { onContinueWithAI?: () => void }) {
  const { toast }  = useToast();
  const location   = useLocation();
  const navState   = (location.state as { id?: number; titre?: string } | null) ?? null;

  const [view, setView] = useState<"list" | "input" | "results" | "saved">(
    navState?.id ? "results" : "list",
  );
  const [documentTitle, setDocumentTitle] = useState(navState?.titre ?? "");
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [userRequest, setUserRequest]     = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>(["explain", "quiz"]);
  const [isLaunching, setIsLaunching]     = useState(false);
  const [resolvedId, setResolvedId]       = useState<number | null>(navState?.id ?? null);
  const [preloadedDoc, setPreloadedDoc]   = useState<BackendCours | null>(null);

  const [analysisText, setAnalysisText]           = useState("");
  const [questionsText, setQuestionsText]         = useState("");
  const [isAnalysisStreaming, setIsAnalysisStreaming] = useState(false);
  const [isQuestionsStreaming, setIsQuestionsStreaming] = useState(false);
  const [analysisError, setAnalysisError]         = useState<string | null>(null);
  const [questionsError, setQuestionsError]       = useState<string | null>(null);
  const [isSaved, setIsSaved]                     = useState(false);
  const [activeTab, setActiveTab]                 = useState<"analysis" | "questions">("analysis");

  const [docs, setDocs]               = useState<BackendCours[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // AbortController refs — cancel streams on unmount or re-launch
  const analysisAbortRef  = useRef<AbortController | null>(null);
  const questionsAbortRef = useRef<AbortController | null>(null);
  const pageRootRef       = useRef<HTMLDivElement | null>(null);

  // ── RAF token buffers — smooth typewriter rendering ────────────────────────
  const analysisBufRef  = useRef<string>("");
  const analysisRafRef  = useRef<number | null>(null);
  const questionsBufRef = useRef<string>("");
  const questionsRafRef = useRef<number | null>(null);

  const drainAnalysis = useCallback(() => {
    if (!analysisBufRef.current) { analysisRafRef.current = null; return; }
    const take = analysisBufRef.current.slice(0, 5);
    analysisBufRef.current = analysisBufRef.current.slice(5);
    setAnalysisText(prev => prev + take);
    analysisRafRef.current = requestAnimationFrame(drainAnalysis);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drainQuestions = useCallback(() => {
    if (!questionsBufRef.current) { questionsRafRef.current = null; return; }
    const take = questionsBufRef.current.slice(0, 5);
    questionsBufRef.current = questionsBufRef.current.slice(5);
    setQuestionsText(prev => prev + take);
    questionsRafRef.current = requestAnimationFrame(drainQuestions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showRegenMenu, setShowRegenMenu] = useState(false);
  const regenRef = useRef<HTMLDivElement>(null);

  const authenticated = isAuthenticated();
  useAITracking({ coursId: resolvedId ?? undefined, courseTitle: documentTitle || navState?.titre });

  useSetPageContext({
    current_page: "document-ai",
    page_title:
      view === "list"
        ? "Document IA — Mes documents"
        : `Document IA — ${documentTitle || "Nouveau document"}`,
    page_data: {
      view,
      document_title: documentTitle || null,
      document_id: resolvedId,
      selected_analysis_options: selectedOptions,
      has_analysis_result: !!analysisText,
      has_quiz_result: !!questionsText,
      analysis_preview: analysisText ? analysisText.slice(0, 400) : null,
      quiz_preview: questionsText ? questionsText.slice(0, 400) : null,
      documents_in_library_count: docs.length,
      is_streaming: isAnalysisStreaming || isQuestionsStreaming,
      is_saved: isSaved,
    },
  });

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort();
      questionsAbortRef.current?.abort();
    };
  }, []);

  // Close regen menu when clicking outside
  useEffect(() => {
    if (!showRegenMenu) return;
    const handler = (e: MouseEvent) => {
      if (regenRef.current && !regenRef.current.contains(e.target as Node)) {
        setShowRegenMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showRegenMenu]);

  // Load list when on list view
  useEffect(() => {
    if (view !== "list" || !authenticated) return;
    setDocsLoading(true);
    apiGetMyCours()
      .then(setDocs)
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [view, authenticated]);

  // Auto-save when both streams finish
  useEffect(() => {
    if (
      !isAnalysisStreaming &&
      !isQuestionsStreaming &&
      resolvedId &&
      (analysisText || questionsText) &&
      !isSaved &&
      (view === "results" || view === "saved")
    ) {
      setIsSaved(true);
      apiSaveAnalysis(resolvedId, analysisText, questionsText).catch(() => {});
    }
  }, [isAnalysisStreaming, isQuestionsStreaming, resolvedId, analysisText, questionsText, isSaved, view]);

  useEffect(() => {
    if (navState?.titre) setDocumentTitle(navState.titre);
  }, [navState?.titre]);

  const toggleOption = (id: string) =>
    setSelectedOptions(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );

  // ── Stream analysis ────────────────────────────────────────────────────────
  const streamAnalysis = useCallback(async (cId: number, opts: string[], instr: string) => {
    analysisAbortRef.current?.abort();
    const ac = new AbortController();
    analysisAbortRef.current = ac;

    // Reset buffer
    if (analysisRafRef.current) { cancelAnimationFrame(analysisRafRef.current); analysisRafRef.current = null; }
    analysisBufRef.current = "";

    setIsAnalysisStreaming(true);
    setAnalysisText("");
    setAnalysisError(null);
    try {
      const isLogic = opts.includes("logic");
      const base = isLogic
        ? `Tu es un expert pédagogique. Fournis une explication logique et structurée du contenu de ce document, étape par étape.

📋 **Format OBLIGATOIRE — utilise ces éléments :**
- Un titre principal avec # et un emoji pertinent (ex: # 🧠 Explication Logique)
- Des sections avec ## et emoji (ex: ## 📌 Étape 1 — Contexte)
- Des sous-sections avec ### si nécessaire
- Des listes à puces avec des repères textuels pertinents (idée, point d'attention, validation, alerte, clé, objectif)
- Du texte en **gras** pour les concepts clés
- Des citations > pour les points cruciaux
- Un séparateur --- entre les grandes sections
- Une section finale ## 🏁 Conclusion avec les points essentiels à retenir

Sois clair, visuel et pédagogique.`
        : `Tu es un expert pédagogique. Fais une analyse complète et structurée de ce document : résumé des idées principales, points clés, concepts importants et conclusion.

📋 **Format OBLIGATOIRE — utilise ces éléments :**
- Un titre principal avec # et un emoji pertinent (ex: # 📄 Analyse du Document)
- Des sections avec ## et emoji (ex: ## 📌 Idées Principales, ## 🔑 Concepts Clés, ## 💡 Points Importants)
- Des sous-sections avec ### si nécessaire
- Des listes à puces avec des repères textuels pertinents (validation, point d'attention, idée, alerte, objectif, recherche, données)
- Du texte en **gras** pour les termes importants
- Des citations > pour les passages ou points cruciaux
- Un séparateur --- entre les grandes sections
- Une section finale ## 🏁 À Retenir avec 3-5 bullet points de synthèse

Sois complet, visuel et pédagogique.`;
      const full = instr.trim() ? `${base}\n\n📝 **Instruction supplémentaire :** ${instr.trim()}` : base;

      for await (const delta of apiAIChatStream(full, {
        coursId: cId,
        mode: "document",
        signal: ac.signal,
      })) {
        if (ac.signal.aborted) break;
        analysisBufRef.current += delta;
        if (!analysisRafRef.current) {
          analysisRafRef.current = requestAnimationFrame(drainAnalysis);
        }
      }
    } catch (err) {
      const msg = friendlyError(err);
      if (msg) setAnalysisError(msg);
    } finally {
      // Flush remaining buffer
      if (analysisRafRef.current) { cancelAnimationFrame(analysisRafRef.current); analysisRafRef.current = null; }
      if (analysisBufRef.current) {
        const rem = analysisBufRef.current;
        analysisBufRef.current = "";
        setAnalysisText(prev => prev + rem);
      }
      setIsAnalysisStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drainAnalysis]);

  // ── Stream questions ───────────────────────────────────────────────────────
  const streamQuestions = useCallback(async (cId: number, instr: string) => {
    questionsAbortRef.current?.abort();
    const ac = new AbortController();
    questionsAbortRef.current = ac;

    // Reset buffer
    if (questionsRafRef.current) { cancelAnimationFrame(questionsRafRef.current); questionsRafRef.current = null; }
    questionsBufRef.current = "";

    setIsQuestionsStreaming(true);
    setQuestionsText("");
    setQuestionsError(null);
    try {
      const prompt = `Tu es un expert pédagogique. Génère 8 questions de révision basées sur ce document.

📋 **Format OBLIGATOIRE pour chaque question :**

## ❓ Question N — [titre court de la question]

**Énoncé :** [texte de la question]

- 🅐 [option A]
- 🅑 [option B]
- 🅒 [option C]
- 🅓 [option D]

**Bonne réponse :** [lettre] — [explication concise]

---

Varie les types de questions : définition, application, analyse, comparaison.
Assure-toi que les 4 options soient plausibles mais qu'une seule soit correcte.${instr.trim() ? `\n\n📝 **Instruction supplémentaire :** ${instr.trim()}` : ""}`;

      for await (const delta of apiAIChatStream(prompt, {
        coursId: cId,
        mode: "document",
        signal: ac.signal,
      })) {
        if (ac.signal.aborted) break;
        questionsBufRef.current += delta;
        if (!questionsRafRef.current) {
          questionsRafRef.current = requestAnimationFrame(drainQuestions);
        }
      }
    } catch (err) {
      const msg = friendlyError(err);
      if (msg) setQuestionsError(msg);
    } finally {
      // Flush remaining buffer
      if (questionsRafRef.current) { cancelAnimationFrame(questionsRafRef.current); questionsRafRef.current = null; }
      if (questionsBufRef.current) {
        const rem = questionsBufRef.current;
        questionsBufRef.current = "";
        setQuestionsText(prev => prev + rem);
      }
      setIsQuestionsStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drainQuestions]);

  // ── Validate file ──────────────────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    if (!ALLOWED_EXTS.includes(ext)) {
      return `Format non supporté. Formats acceptés : ${ALLOWED_EXTS_LABEL}`;
    }
    if (file.size > MAX_FILE_BYTES) {
      return `Fichier trop volumineux (${fmtSize(file.size)}). Taille maximum : 15 Mo`;
    }
    return null;
  };

  // ── Launch analysis ────────────────────────────────────────────────────────
  const handleLaunch = async () => {
    const hasExistingDoc = !!resolvedId;

    if (!hasExistingDoc && !selectedFile) {
      toast({ title: "Ajoutez un document", description: "Importez d'abord un fichier PDF, DOCX ou TXT." });
      return;
    }
    if (!hasExistingDoc && selectedFile) {
      const fileErr = validateFile(selectedFile);
      if (fileErr) {
        toast({ title: "Fichier invalide", description: fileErr, variant: "destructive" });
        return;
      }
    }
    if (selectedOptions.length === 0) {
      toast({ title: "Choisissez une action", description: "Cochez au moins une action pour l'IA." });
      return;
    }
    if (!authenticated) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour lancer l'analyse IA.", variant: "destructive" });
      return;
    }

    // Abort any running streams before re-launching
    analysisAbortRef.current?.abort();
    questionsAbortRef.current?.abort();

    setIsLaunching(true);
    try {
      let cId = resolvedId;

      if (!cId && selectedFile) {
        const uploaded = await apiUploadCours(
          documentTitle || selectedFile.name.replace(/\.[^.]+$/, ""),
          selectedFile,
        );
        cId = uploaded.cours.id;

        // Warn user if no text was extracted (likely a scanned/image PDF)
        const extractedLen = (uploaded.cours as BackendCours & { extracted_length?: number }).extracted_length ?? null;
        if (extractedLen !== null && extractedLen === 0) {
          toast({
            title: "Extraction limitée",
            description:
              "Aucun texte n'a pu être extrait de ce fichier. S'il s'agit d'un PDF scanné (image), l'analyse sera très limitée. Préférez un PDF avec texte natif.",
            variant: "destructive",
          });
        }
      }

      if (!cId) throw new Error("Impossible de déterminer le document à analyser.");

      setResolvedId(cId);
      setIsSaved(false);
      setShowRegenMenu(false);
      setView("results");

      const wantAnalysis = selectedOptions.includes("explain") || selectedOptions.includes("logic");
      const wantQuiz     = selectedOptions.includes("quiz");

      if (wantAnalysis) void streamAnalysis(cId, selectedOptions, userRequest);
      if (wantQuiz)     void streamQuestions(cId, userRequest);
    } catch (err) {
      toast({
        title: "Erreur",
        description: friendlyError(err) || "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  // ── Open saved doc ─────────────────────────────────────────────────────────
  const openSavedDoc = (doc: BackendCours) => {
    setResolvedId(doc.id);
    setDocumentTitle(doc.titre);
    setAnalysisText(doc.analysis_result ?? "");
    setQuestionsText(doc.questions_result ?? "");
    setIsAnalysisStreaming(false);
    setIsQuestionsStreaming(false);
    setAnalysisError(null);
    setQuestionsError(null);
    setIsSaved(true);
    setPreloadedDoc(doc);
    setShowRegenMenu(false);
    setView("saved");
  };

  // ── Re-analyze ─────────────────────────────────────────────────────────────
  const reanalyzeDoc = (doc: BackendCours) => {
    setResolvedId(doc.id);
    setDocumentTitle(doc.titre);
    setSelectedFile(null);
    setAnalysisText("");
    setQuestionsText("");
    setAnalysisError(null);
    setQuestionsError(null);
    setIsSaved(false);
    setSelectedOptions(["explain", "quiz"]);
    setUserRequest("");
    setShowRegenMenu(false);
    setView("input");
  };

  // ── Regen handlers ─────────────────────────────────────────────────────────
  const handleRegenQuestions = () => {
    if (!resolvedId) return;
    setIsSaved(false);
    setQuestionsText("");
    setQuestionsError(null);
    setShowRegenMenu(false);
    void streamQuestions(resolvedId, "");
  };

  const handleRegenDetails = () => {
    if (!resolvedId) return;
    setIsSaved(false);
    setAnalysisText("");
    setAnalysisError(null);
    setShowRegenMenu(false);
    void streamAnalysis(resolvedId, ["explain"], "");
  };

  const handleRegenAll = () => {
    if (!resolvedId) return;
    setIsSaved(false);
    setAnalysisText("");
    setQuestionsText("");
    setAnalysisError(null);
    setQuestionsError(null);
    setShowRegenMenu(false);
    void streamAnalysis(resolvedId, ["explain"], "");
    void streamQuestions(resolvedId, "");
  };

  // ── File input with validation ─────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      const err = validateFile(file);
      if (err) {
        toast({ title: "Fichier invalide", description: err, variant: "destructive" });
        e.target.value = "";
        return;
      }
    }
    setSelectedFile(file);
    setAnalysisText("");
    setQuestionsText("");
  };

  const docLabel    = documentTitle || selectedFile?.name || (resolvedId ? `Document #${resolvedId}` : null);
  const wantAnalysis = selectedOptions.includes("explain") || selectedOptions.includes("logic");
  const wantQuiz     = selectedOptions.includes("quiz");
  const fromList     = !navState?.id;
  const anyStreaming  = isAnalysisStreaming || isQuestionsStreaming;

  useEffect(() => {
    if ((view === "saved" || view === "results") && pageRootRef.current) {
      pageRootRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [view]);

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "list") {
    return (
      <div className="min-h-full bg-[#f4f6fb] p-5 dark:bg-slate-950 sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">
              <Sparkles className="h-3.5 w-3.5" />
              Document IA
            </div>
            <h1 className="mobile-one-line mt-1 text-xl font-black text-slate-900 sm:text-2xl dark:text-white">
              Mes documents analysés
            </h1>
            <p className="mobile-one-line mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Retrouvez vos analyses précédentes ou analysez un nouveau document.
            </p>
          </div>
          <button
            onClick={() => {
              setResolvedId(null);
              setDocumentTitle("");
              setSelectedFile(null);
              setAnalysisText("");
              setQuestionsText("");
              setIsSaved(false);
              setView("input");
            }}
            className="mobile-short-label flex flex-shrink-0 items-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] sm:px-4"
          >
            <Plus className="h-4 w-4" />
            <span className="mobile-label-long">Analyser un PDF</span><span className="mobile-label-short">Analyser</span>
          </button>
        </div>

        {!authenticated && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800/60 dark:bg-amber-900/20">
            <Sparkles className="h-5 w-5 flex-shrink-0 text-amber-500" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Connectez-vous pour accéder à vos documents analysés.
            </p>
          </div>
        )}

        {authenticated && (
          <>
            {docsLoading ? (
              <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @xl:grid-cols-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-10 flex-shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="mt-3 h-12 w-full rounded-xl" />
                    <div className="mt-3 flex gap-2">
                      <Skeleton className="h-8 flex-1 rounded-xl" />
                      <Skeleton className="h-8 w-10 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : docs.length === 0 ? (
              <div className="flex flex-col items-center gap-5 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20">
                  <FileText className="h-9 w-9 text-[#FF6B00]/50" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                    Aucun document pour le moment
                  </p>
                  <p className="text-sm text-slate-500">
                    Analysez votre premier PDF et l'IA vous génèrera une analyse détaillée.
                  </p>
                </div>
                <button
                  onClick={() => setView("input")}
                  className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-[#1D4ED8]"
                >
                  <Plus className="h-4 w-4" />
                  Analyser mon premier document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @xl:grid-cols-3">
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onView={() => openSavedDoc(doc)}
                    onReanalyze={() => reanalyzeDoc(doc)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SAVED VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "saved") {
    return (
      <div ref={pageRootRef} className="flex flex-col lg:h-full lg:overflow-hidden">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-[#0f1219]">
          <button
            onClick={() => { setShowRegenMenu(false); setView("list"); }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Mes documents
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0 text-[#FF6B00]" />
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-white">
              {documentTitle || `Document #${resolvedId}`}
            </span>
          </div>

          {anyStreaming && (
            <span className="flex flex-shrink-0 items-center gap-1.5 text-[11px] font-medium text-emerald-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              IA en cours…
            </span>
          )}
          {isSaved && !anyStreaming && (
            <span className="flex flex-shrink-0 items-center gap-1.5 text-[11px] font-medium text-emerald-500">
              <Save className="h-3 w-3" />
              Sauvegardé
            </span>
          )}
        </div>

        {/* Mobile tabs — Analyse | Questions */}
        <div className="flex flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1219] lg:hidden">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-semibold transition-colors ${activeTab === "analysis" ? "border-[#FF6B00] text-[#FF6B00]" : "border-transparent text-slate-500 dark:text-slate-400"}`}
          >
            <FileText className="h-4 w-4" />
            Analyse
            {isAnalysisStreaming && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-semibold transition-colors ${activeTab === "questions" ? "border-[#FF6B00] text-[#FF6B00]" : "border-transparent text-slate-500 dark:text-slate-400"}`}
          >
            <HelpCircle className="h-4 w-4" />
            Questions
            {isQuestionsStreaming && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
          </button>
        </div>

        {/* Body: two columns */}
        <div className="flex flex-col lg:flex-1 lg:overflow-hidden lg:flex-row">
          {/* Left — Analysis */}
          <div className={`flex flex-col border-b border-slate-200 lg:flex-1 lg:overflow-y-auto lg:border-b-0 lg:border-r dark:border-slate-800 ${activeTab !== "analysis" ? "hidden lg:flex" : ""}`}>
            <div className="hidden flex-shrink-0 border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60 lg:block">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#FF6B00]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Analyse du document</h2>
                {isAnalysisStreaming && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />}
              </div>
            </div>
            <div className="p-5 lg:flex-1">
              {!analysisText && !isAnalysisStreaming && !analysisError && (
                <div className="flex min-h-[120px] items-center justify-center lg:h-full">
                  <div className="text-center">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-slate-200 dark:text-slate-700" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">Aucune analyse disponible</p>
                  </div>
                </div>
              )}
              {analysisError && <StreamError message={analysisError} />}
              {(analysisText || isAnalysisStreaming) && analysisText && (
                <FormattedText text={analysisText} streaming={isAnalysisStreaming} />
              )}
            </div>
          </div>

          {/* Right — Questions */}
          <div className={`flex flex-col lg:w-[320px] lg:flex-shrink-0 lg:overflow-y-auto xl:w-[360px] ${activeTab !== "questions" ? "hidden lg:flex" : ""}`}>
            <div className="hidden flex-shrink-0 border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60 lg:block">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#FF6B00]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Questions & révision</h2>
                {isQuestionsStreaming && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />}
              </div>
            </div>
            <div className="p-4 lg:flex-1">
              {!questionsText && !isQuestionsStreaming && !questionsError && (
                <div className="flex min-h-[120px] items-center justify-center lg:h-full">
                  <div className="text-center">
                    <HelpCircle className="mx-auto mb-3 h-10 w-10 text-slate-200 dark:text-slate-700" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">Aucune question disponible</p>
                  </div>
                </div>
              )}
              {questionsError && <StreamError message={questionsError} />}
              {(questionsText || isQuestionsStreaming) && questionsText && (
                <FormattedQuestions text={questionsText} streaming={isQuestionsStreaming} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-[#0f1219]">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {preloadedDoc?.analyzed_at
              ? `Analysé le ${fmtDate(preloadedDoc.analyzed_at)}`
              : "Analyse sauvegardée"}
          </p>
          <div className="flex items-center gap-2">
            {onContinueWithAI && (
              <button
                type="button"
                onClick={onContinueWithAI}
                className="flex items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#2563EB] shadow-sm transition-colors hover:bg-blue-50 hover:text-[#1D4ED8] dark:border-slate-600 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
              >
                Continuer avec l’IA
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <RegenPopover
              regenRef={regenRef}
              showRegenMenu={showRegenMenu}
              setShowRegenMenu={setShowRegenMenu}
              anyStreaming={anyStreaming}
              onRegenQuestions={handleRegenQuestions}
              onRegenDetails={handleRegenDetails}
              onRegenAll={handleRegenAll}
            />
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INPUT + RESULTS (horizontal slide)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div ref={pageRootRef} className="flex flex-col overflow-x-hidden lg:h-full lg:w-full lg:overflow-hidden">
      <div
        className="flex lg:flex-1 lg:overflow-hidden"
        style={{
          width:      "200%",
          transform:  view === "results" ? "translateX(-50%)" : "translateX(0)",
          transition: "transform 0.48s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* ═══ Panel A — Input ══════════════════════════════════════════════ */}
        <div className="flex w-1/2 flex-col p-5 sm:p-6 lg:overflow-y-auto">
          <button
            onClick={() => setView("list")}
            className="mb-5 flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#FF6B00] dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Mes documents
          </button>

          <div className="mb-6 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF6B00]">
              <Sparkles className="h-3.5 w-3.5" />
              TESS AI — Analyse de document
            </div>
            <h1 className="mobile-one-line mt-1.5 text-xl font-black text-slate-900 sm:text-2xl dark:text-white">
              {resolvedId ? "Ré-analyser le document" : "Analysez vos documents avec l'IA"}
            </h1>
            <p className="mobile-one-line mt-1 text-sm text-slate-500 dark:text-slate-400">
              Importez un document et l'IA génère une analyse détaillée et des questions de révision en temps réel.
            </p>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Titre du document
            </label>
            {resolvedId ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-900/20">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {documentTitle || `Document #${resolvedId}`}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">Document chargé — prêt pour l'analyse</p>
                </div>
              </div>
            ) : (
              <input
                value={documentTitle}
                onChange={e => setDocumentTitle(e.target.value)}
                placeholder="Ex : Analyse mathématique – Chapitre 3"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition-colors placeholder:text-slate-400 focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            )}
          </div>

          {/* File drop zone — only for new uploads */}
          {!resolvedId && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Fichier
              </label>
              <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition-all hover:border-[#FF6B00] hover:bg-orange-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#FF6B00] dark:hover:bg-orange-950/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md dark:bg-slate-800">
                  <FileUp className="h-6 w-6 text-[#FF6B00] transition-transform group-hover:scale-110" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selectedFile ? selectedFile.name : "Cliquez pour choisir un fichier"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{ALLOWED_EXTS_LABEL}</p>
                  {selectedFile && (
                    <p className="mt-0.5 text-xs text-slate-400">{fmtSize(selectedFile.size)}</p>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}

          {/* Options */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ce que l'IA doit faire
            </p>
            <div className="space-y-3">
              {ANALYSIS_OPTIONS.map(opt => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <Checkbox
                    checked={selectedOptions.includes(opt.id)}
                    onCheckedChange={() => toggleOption(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom instruction */}
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Instruction supplémentaire{" "}
              <span className="font-normal normal-case">(optionnel)</span>
            </label>
            <Textarea
              value={userRequest}
              onChange={e => setUserRequest(e.target.value)}
              placeholder="Ex : explique comme à un débutant et ajoute 10 questions de révision détaillées…"
              className="min-h-[80px] resize-none rounded-xl border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          {!authenticated && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-400">
              <span className="mt-0.5 text-base leading-none">🔐</span>
              <span>Connectez-vous pour utiliser l'analyse IA avec votre document.</span>
            </div>
          )}

          <button
            onClick={handleLaunch}
            disabled={isLaunching || !authenticated}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#2563EB] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] hover:shadow-blue-500/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLaunching ? (
              <><LoaderCircle className="h-4 w-4 animate-spin" /> Chargement…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Lancer l'analyse IA <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>

        {/* ═══ Panel B — Results (streaming) ══════════════════════════════ */}
        <div className="flex w-1/2 flex-col overflow-x-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-[#0f1219]">
            <button
              onClick={() => setView(fromList ? "list" : "input")}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {fromList ? "Mes documents" : "Retour"}
            </button>

            {docLabel && (
              <div className="min-w-0 flex-1 items-center gap-2 sm:flex">
                <FileText className="h-4 w-4 flex-shrink-0 text-[#FF6B00]" />
                <span className="truncate text-sm font-semibold text-slate-800 dark:text-white">{docLabel}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {anyStreaming && (
                <span className="flex flex-shrink-0 items-center gap-1.5 text-[11px] font-medium text-emerald-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  IA en cours…
                </span>
              )}
              {isSaved && !anyStreaming && (
                <span className="flex flex-shrink-0 items-center gap-1.5 text-[11px] font-medium text-emerald-500">
                  <Save className="h-3 w-3" />
                  Sauvegardé
                </span>
              )}
              {resolvedId && !anyStreaming && (
                <button
                  onClick={() => setView("input")}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Ré-analyser
                </button>
              )}
            </div>
          </div>

          {/* Mobile tabs — Analyse | Questions */}
          <div className="flex flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1219] lg:hidden">
            <button
              onClick={() => setActiveTab("analysis")}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-semibold transition-colors ${activeTab === "analysis" ? "border-[#FF6B00] text-[#FF6B00]" : "border-transparent text-slate-500 dark:text-slate-400"}`}
            >
              <FileText className="h-4 w-4" />
              Analyse
              {isAnalysisStreaming && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-semibold transition-colors ${activeTab === "questions" ? "border-[#FF6B00] text-[#FF6B00]" : "border-transparent text-slate-500 dark:text-slate-400"}`}
            >
              <HelpCircle className="h-4 w-4" />
              Questions
              {isQuestionsStreaming && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            </button>
          </div>

          <div className="flex flex-col lg:flex-1 lg:overflow-hidden lg:flex-row">
            {/* Left — Analysis */}
            <div className={`flex flex-col border-b border-slate-200 lg:flex-1 lg:overflow-y-auto lg:border-b-0 lg:border-r dark:border-slate-800 ${activeTab !== "analysis" ? "hidden lg:flex" : ""}`}>
              <div className="hidden flex-shrink-0 border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60 lg:block">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#FF6B00]" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Analyse du document</h2>
                  {isAnalysisStreaming && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />}
                </div>
              </div>
              <div className="p-5 lg:flex-1">
                {!analysisText && !isAnalysisStreaming && !analysisError && (
                  <div className="flex min-h-[120px] items-center justify-center lg:h-full">
                    <div className="text-center">
                      <FileText className="mx-auto mb-3 h-10 w-10 text-slate-200 dark:text-slate-700" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        {wantAnalysis ? "L'analyse apparaîtra ici en temps réel…" : "Option d'analyse non sélectionnée"}
                      </p>
                    </div>
                  </div>
                )}
                {analysisError && <StreamError message={analysisError} />}
                {analysisText && <FormattedText text={analysisText} streaming={isAnalysisStreaming} />}
              </div>
            </div>

            {/* Right — Questions */}
            <div className={`flex flex-col lg:w-[320px] lg:flex-shrink-0 lg:overflow-y-auto xl:w-[360px] ${activeTab !== "questions" ? "hidden lg:flex" : ""}`}>
              <div className="hidden flex-shrink-0 border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60 lg:block">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-[#FF6B00]" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Questions & révision</h2>
                  {isQuestionsStreaming && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />}
                </div>
              </div>
              <div className="p-4 lg:flex-1">
                {!questionsText && !isQuestionsStreaming && !questionsError && (
                  <div className="flex min-h-[120px] items-center justify-center lg:h-full">
                    <div className="text-center">
                      <HelpCircle className="mx-auto mb-3 h-10 w-10 text-slate-200 dark:text-slate-700" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        {wantQuiz ? "Les questions apparaîtront ici…" : "Option quiz non sélectionnée"}
                      </p>
                    </div>
                  </div>
                )}
                {questionsError && <StreamError message={questionsError} />}
                {questionsText && <FormattedQuestions text={questionsText} streaming={isQuestionsStreaming} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stream error display ───────────────────────────────────────────────────────
function StreamError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-400">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ── Regen popover (extracted component) ───────────────────────────────────────
function RegenPopover({
  regenRef, showRegenMenu, setShowRegenMenu,
  anyStreaming, onRegenQuestions, onRegenDetails, onRegenAll,
}: {
  regenRef: React.RefObject<HTMLDivElement | null>;
  showRegenMenu: boolean;
  setShowRegenMenu: (v: boolean | ((prev: boolean) => boolean)) => void;
  anyStreaming: boolean;
  onRegenQuestions: () => void;
  onRegenDetails: () => void;
  onRegenAll: () => void;
}) {
  return (
    <div ref={regenRef} className="relative">
      {showRegenMenu && (
        <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Options de régénération</p>
          </div>
          <div className="space-y-0.5 p-1.5">
            <button
              onClick={onRegenQuestions}
              disabled={anyStreaming}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <HelpCircle className="h-4 w-4 flex-shrink-0 text-[#FF6B00]" />
              Régénérer les questions
            </button>
            <button
              onClick={onRegenDetails}
              disabled={anyStreaming}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FileText className="h-4 w-4 flex-shrink-0 text-[#FF6B00]" />
              Régénérer les détails
            </button>
            <button
              onClick={onRegenAll}
              disabled={anyStreaming}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-orange-900/20"
            >
              <Sparkles className="h-4 w-4 flex-shrink-0 text-[#FF6B00]" />
              <span className="font-semibold text-[#FF6B00]">Régénérer le tout</span>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowRegenMenu(prev => !prev)}
        disabled={anyStreaming}
        className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {anyStreaming ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            En cours…
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Régénérer
            <ChevronUp className={`h-3.5 w-3.5 transition-transform duration-200 ${showRegenMenu ? "" : "rotate-180"}`} />
          </>
        )}
      </button>
    </div>
  );
}
