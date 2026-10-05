import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { Bot, BrainCircuit, Camera, Check, FileText, ImagePlus, Plus, Search, Zap } from "lucide-react";
import type { ComposerMode } from "@/components/ai/AIComposer";
import HoverTooltip from "@/components/ui/hover-tooltip";

const modeItems: Array<[typeof Bot, string, ComposerMode, string]> = [
  [Bot, "Normal", "normal", "Réponse directe"],
  [BrainCircuit, "Réflexion", "reflect", "Analyse approfondie avant la réponse"],
  [Search, "Recherche", "search", "Recherche orientée"],
  [Zap, "Agent", "agent", "Capacité autorisée"],
];

export default function ComposerPlusMenu({
  disabled,
  onChooseImage,
  onChooseCamera,
  onChooseDocument,
  mode,
  onModeChange,
  alertMode = false,
}: {
  disabled: boolean;
  onChooseImage: () => void;
  onChooseCamera: () => void;
  onChooseDocument: () => void;
  mode?: ComposerMode;
  onModeChange?: (mode: ComposerMode) => void;
  alertMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const positionPanel = () => {
      const trigger = toggleRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + viewportHeight;
      const gap = 12;
      const safeInset = 8;
      const availableAbove = Math.max(0, trigger.top - viewportTop - gap - safeInset);
      const availableBelow = Math.max(0, viewportBottom - trigger.bottom - gap - safeInset);
      const contentHeight = panel.scrollHeight;
      const placeAbove = availableAbove >= Math.min(contentHeight, 220) || availableAbove >= availableBelow;
      const maxHeight = Math.max(1, placeAbove ? availableAbove : availableBelow);
      const height = Math.min(contentHeight, maxHeight);
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const width = Math.max(1, Math.min(window.innerWidth >= 768 ? 512 : 352, viewportWidth - 32));
      const left = Math.min(Math.max(safeInset, trigger.left), viewportWidth - width - safeInset);
      const top = placeAbove ? trigger.top - gap - height : trigger.bottom + gap;
      setPanelPosition({ top: Math.max(viewportTop + safeInset, top), left, width, maxHeight });
    };
    const frame = window.requestAnimationFrame(positionPanel);
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    window.visualViewport?.addEventListener("resize", positionPanel);
    window.visualViewport?.addEventListener("scroll", positionPanel);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
      window.visualViewport?.removeEventListener("resize", positionPanel);
      window.visualViewport?.removeEventListener("scroll", positionPanel);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative mb-2 flex h-9 w-9 shrink-0 self-end items-center justify-center">
      <HoverTooltip label="Options du message" side="top"><button
        ref={toggleRef}
        type="button"
        disabled={disabled}
        aria-label="Ouvrir les options du message"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-400 ${alertMode ? open ? "rotate-45 bg-red-600 text-white dark:bg-red-500" : "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-400/10 dark:hover:text-red-300" : open ? "rotate-45 bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"}`}
      >
        <Plus className="h-5 w-5" />
      </button></HoverTooltip>
        {open && createPortal(
          <div ref={panelRef} role="group" aria-label="Options du message" style={panelPosition ? { position: "fixed", top: panelPosition.top, left: panelPosition.left, width: panelPosition.width, maxHeight: panelPosition.maxHeight } : { position: "fixed", top: -10000, left: 0, width: Math.max(1, Math.min(window.innerWidth >= 768 ? 512 : 352, window.innerWidth - 32)), visibility: "hidden" }} className="z-[150] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-2xl shadow-slate-950/15 animate-in fade-in slide-in-from-bottom-2 duration-150 motion-reduce:animate-none dark:border-white/15 dark:bg-[#242424] dark:text-white dark:shadow-slate-950/40">
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Joindre</p>
          <div className="space-y-0.5">
            <Option icon={<ImagePlus />} label="Image" description="Ajoutez une image à votre message." onClick={() => choose(onChooseImage)} />
            <Option icon={<Camera />} label="Caméra" description="Prenez une photo avec votre appareil." onClick={() => choose(onChooseCamera)} />
            <Option icon={<FileText />} label="Document PDF" description="Joignez un PDF à analyser." onClick={() => choose(onChooseDocument)} />
          </div>
          <div className="my-2 border-t border-slate-200 dark:border-white/10" />
          <p className="px-2.5 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Modes de TESS</p>
          <div className="flex flex-col gap-0.5">
            {modeItems.map(([Icon, label, value, description]) => {
              const ModeIcon = Icon as typeof Bot;
              const selected = mode === value;
              return <button key={value} type="button" aria-pressed={selected} onClick={() => choose(() => onModeChange?.(value as ComposerMode))} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[11px] font-semibold transition md:min-h-12 ${selected ? "bg-blue-50 text-blue-900 dark:bg-blue-400/10 dark:text-blue-100" : "text-slate-600 hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-blue-100 text-blue-700 dark:bg-blue-300/15 dark:text-blue-200" : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300"}`}><ModeIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate">{label}</span><span className="mt-0.5 block whitespace-normal text-[10px] font-normal leading-4 text-slate-500 dark:text-slate-400">{description}</span></span>{selected && <Check className="ml-auto h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />}</button>;
            })}
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Option({ icon, label, description, onClick }: { icon: ReactNode; label: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white">
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block truncate">{label}</span><span className="hidden truncate text-[9px] font-normal leading-3 text-slate-500 md:block dark:text-slate-400">{description}</span></span>
  </button>;
}
