import { BrainCircuit, CircleAlert, Sparkles } from "lucide-react";
import type { AIActivitySource, AIActivityStep } from "@/lib/backend-types";

function stepTitle(step: Partial<AIActivityStep> & { label?: string }) {
  return (step.title ?? step.label ?? "TESS traite la demande").toString();
}

/** A single non-collapsible status line; internal lifecycle steps stay hidden. */
export default function AIActivity({
  steps,
  sources,
  running,
  longThinking = false,
  hasAnswer = false,
}: {
  steps: AIActivityStep[];
  sources: AIActivitySource[];
  running: boolean;
  longThinking?: boolean;
  hasAnswer?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  // Pipeline phases (VERIFY, PLAN, ORCHESTRATE, etc.) are internal telemetry,
  // not assistant messages. Keep failures visible, but never expose policy or
  // authorization labels as if TESS were speaking to the user.
  const visibleSteps = steps.filter(step => step.status === "error" && step.detail);
  const active = visibleSteps.find(step => step.status === "running")
    ?? visibleSteps.find(step => step.status === "planned");
  const lastStep = visibleSteps[visibleSteps.length - 1];
  const failed = steps.some(step => step.status === "error");
  const hasEvidence = visibleSteps.length > 0 || sources.length > 0;

  if (!running && !hasEvidence && !longThinking) return null;
  if (running && hasAnswer && !hasEvidence && !longThinking) return null;

  const title = longThinking
    ? "Réflexion en cours…"
    : active
      ? stepTitle(active)
      : lastStep
        ? stepTitle(lastStep)
        : sources.length
          ? "Éléments consultés"
          : "Préparation de la réponse…";
  const Icon = failed ? CircleAlert : longThinking ? BrainCircuit : Sparkles;

  return (
    <section className="ai-activity mb-1 w-full max-w-none" aria-label="État de la réponse">
      <div className="flex min-h-9 w-full items-center gap-2 px-1.5 py-1 text-left">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
          <Icon className={`h-3.5 w-3.5 ${running ? "animate-pulse motion-reduce:animate-none" : ""}`} />
        </span>
        <span className={`min-w-0 truncate text-xs font-medium ${running ? "ai-activity-shimmer" : "text-slate-500 dark:text-slate-400"}`} aria-live="polite">
          {title}
          {running && <span className="ml-1 inline-flex w-5 items-center justify-start gap-0.5 align-middle" aria-hidden="true"><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400" /><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400 [animation-delay:150ms]" /><i className="h-1 w-1 animate-pulse rounded-full bg-violet-400 [animation-delay:300ms]" /></span>}
        </span>
      </div>
    </section>
  );
}
