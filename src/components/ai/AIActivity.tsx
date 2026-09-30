// Copie Zentrix Academy : src/components/ai/AIActivity.tsx
import { useEffect, useRef, useState } from "react";
import {
  BookOpen, BrainCircuit, ChevronDown, ChevronRight, CircleAlert,
  Database, FileSearch, FileText, GraduationCap, Image as ImageIcon, Loader2, Sparkles,
} from "lucide-react";
import type { AIActivitySource, AIActivityStep } from "@/lib/backend-types";

const LEGACY_ACTIVITY_TEXT = [
  "aucune recherche dans la base n’était nécessaire",
  "aucune recherche dans la base n'etait necessaire",
  "la réponse est prête",
  "la reponse est prete",
  "le texte final a été généré",
  "le texte final a ete genere",
  "le détail résume les recherches réellement effectuées",
  "le detail resume les recherches reellement effectuees",
];

function isLegacyActivity(step: AIActivityStep) {
  const text = `${step.title} ${step.detail ?? ""}`.toLocaleLowerCase();
  return LEGACY_ACTIVITY_TEXT.some((legacy) => text.includes(legacy));
}

function renderNarrative(text: string) {
  return text.split("\n").map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={`space-${index}`} className="h-2" aria-hidden="true" />;
    if (trimmed.startsWith("•")) {
      return (
        <div key={`point-${index}`} className="ml-3 flex gap-2 pl-2 text-[11px] leading-5">
          <span className="shrink-0 text-slate-400" aria-hidden="true">•</span>
          <span>{trimmed.slice(1).trim()}</span>
        </div>
      );
    }
    const isSmallTitle = trimmed.length <= 90 && trimmed.endsWith(":");
    return (
      <p key={`paragraph-${index}`} className={isSmallTitle ? "mt-2 text-[11px] font-semibold leading-5 text-slate-700 first:mt-0 dark:text-slate-200" : "text-[11px] leading-5"}>
        {trimmed}
      </p>
    );
  });
}

function SourceIcon({ kind }: { kind: AIActivitySource["kind"] }) {
  // Keep the icon semantically tied to the source emitted by the backend.
  // A course and one of its chapters are different sources, so they must not
  // collapse to the same generic book badge in the details panel.
  const Icon = kind === "course"
    ? GraduationCap
    : kind === "chapter"
    ? BookOpen
    : kind === "document"
    ? FileSearch
    : kind === "image"
    ? ImageIcon
    : kind === "data"
    ? Database
    : FileText;
  return <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

export default function AIActivity({
  steps,
  sources,
  running,
  longThinking = false,
  hasAnswer = false,
  expanded: controlledExpanded,
  onExpandedChange,
}: {
  steps: AIActivityStep[];
  sources: AIActivitySource[];
  running: boolean;
  longThinking?: boolean;
  hasAnswer?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = controlledExpanded ?? localExpanded;
  const setExpanded = onExpandedChange ?? setLocalExpanded;
  const [duration, setDuration] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const visibleSteps = steps.filter((step) => !isLegacyActivity(step));
  const active = visibleSteps.find((step) => step.status === "running") ?? visibleSteps.find((step) => step.status === "planned");
  const lastStep = visibleSteps[visibleSteps.length - 1];
  const failed = steps.some((step) => step.status === "error");
  const hasEvidence = visibleSteps.length > 0 || sources.length > 0;
  // Long reflection has one user-facing narrative written from the facts of
  // this run. Ignore the legacy lifecycle rows here; they are internal
  // bookkeeping and must not reappear as a pre-programmed checklist.
  const narrativeSteps = longThinking
    ? visibleSteps.filter((step) => step.id === "analysis" || step.status === "error")
    : visibleSteps;
  const narrative = narrativeSteps
    .map((step) => step.detail?.trim() || step.title.trim())
    .filter(Boolean)
    .join("\n\n");
  const [displayedNarrative, setDisplayedNarrative] = useState("");
  const displayedNarrativeRef = useRef("");
  const narrativeTargetRef = useRef("");
  const narrativeFrameRef = useRef<number | null>(null);

  useEffect(() => {
    narrativeTargetRef.current = narrative;
    if (!narrative) {
      displayedNarrativeRef.current = "";
      setDisplayedNarrative("");
      return;
    }
    const animate = () => {
      const target = narrativeTargetRef.current;
      setDisplayedNarrative(current => {
        const next = !target.startsWith(current)
          ? target
          : current.length >= target.length
          ? current
          : target.slice(0, Math.min(target.length, current.length + 8));
        displayedNarrativeRef.current = next;
        return next;
      });
      if (narrativeTargetRef.current.length > displayedNarrativeRef.current.length) {
        narrativeFrameRef.current = requestAnimationFrame(animate);
      } else {
        narrativeFrameRef.current = null;
      }
    };
    if (narrativeFrameRef.current === null) narrativeFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (narrativeFrameRef.current !== null) cancelAnimationFrame(narrativeFrameRef.current);
      narrativeFrameRef.current = null;
    };
  }, [narrative]);

  useEffect(() => () => {
    if (narrativeFrameRef.current !== null) cancelAnimationFrame(narrativeFrameRef.current);
  }, []);

  useEffect(() => {
    if (running) {
      if (startedAtRef.current === null) startedAtRef.current = Date.now();
      if (longThinking) setExpanded(true);
      return;
    }
    if (startedAtRef.current !== null) {
      setDuration(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
      startedAtRef.current = null;
    }
    setExpanded(false);
  }, [running, longThinking]);

  // Keep greetings and simple answers free of an empty activity panel.
  if (!running && !hasEvidence && !longThinking) return null;
  if (running && hasAnswer && !hasEvidence && !longThinking) return null;

  const inferred = longThinking ? "Réflexion en cours…" : active?.title ?? lastStep?.title ?? (sources.length ? "Éléments consultés" : "Préparation de la réponse…");
  const title = running
    ? inferred
    : longThinking
    ? `Réflexion${duration ? ` · ${duration} s` : ""}`
    : lastStep?.title ?? (failed ? "Une étape a été interrompue" : `Réponse${duration ? ` · ${duration} s` : " terminée"}`);
  const contextTitle = (active?.title ?? lastStep?.title ?? "").toLowerCase();
  const ContextIcon = longThinking ? BrainCircuit : contextTitle.includes("document") ? FileText : contextTitle.includes("cours") ? BookOpen : sources.some(source => source.kind === "data") ? Database : Sparkles;

  return (
    <section className="ai-activity mb-1 w-full max-w-none" aria-label="État et sources de la réponse">
      <button
        type="button"
        aria-expanded={expanded}
      onClick={() => setExpanded(!expanded)}
        className="group flex min-h-9 w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-white/[0.045]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
          {running && !hasEvidence && !longThinking ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : failed ? <CircleAlert className="h-3.5 w-3.5 text-rose-500" /> : <ContextIcon className="h-3.5 w-3.5" />}
        </span>
        <span className={`relative min-w-0 flex-1 truncate text-xs font-medium ${running ? "ai-activity-shimmer" : "text-slate-500 dark:text-slate-400"}`} aria-live="polite">
          {title}
          {running && <span className="ml-1 inline-flex w-5 items-center justify-start gap-0.5 align-middle" aria-hidden="true"><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400" /><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400 [animation-delay:150ms]" /><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400 [animation-delay:300ms]" /></span>}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors group-hover:bg-white group-hover:text-slate-700 dark:group-hover:bg-white/10 dark:group-hover:text-slate-200" aria-label={expanded ? "Masquer le détail" : "Afficher le détail"}>
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="ml-3.5 mt-1.5 animate-in fade-in slide-in-from-top-1 border-l border-violet-200 pl-3 duration-200 motion-reduce:animate-none dark:border-violet-400/20">
          {displayedNarrative && (
            <div className="text-slate-600 dark:text-slate-300" aria-live="polite">
              {renderNarrative(displayedNarrative)}
              {running && <span className="ml-1 inline-flex gap-0.5 align-middle" aria-hidden="true"><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400" /><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400 [animation-delay:150ms]" /><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400 [animation-delay:300ms]" /></span>}
            </div>
          )}
          {sources.length > 0 && <div className={`${steps.length ? "mt-2 border-t border-slate-200 pt-2 dark:border-white/10" : ""}`}>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Sources utilisées</p>
            <ul className="space-y-1">{sources.map(source => <li key={source.id} className="flex min-w-0 items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300"><SourceIcon kind={source.kind} /><span className="min-w-0 flex-1 truncate">{source.title}</span>{source.detail && <span className="shrink-0 text-[10px] text-slate-400">{source.detail}</span>}</li>)}</ul>
          </div>}
        </div>
      )}
    </section>
  );
}
