// Copie Zentrix Academy : src/components/ai/ComposerPlusMenu.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrainCircuit, Camera, FileText, ImagePlus, Plus } from "lucide-react";

export default function ComposerPlusMenu({
  disabled,
  longThinking,
  onChooseImage,
  onChooseCamera,
  onChooseDocument,
  onToggleLongThinking,
}: {
  disabled: boolean;
  longThinking: boolean;
  onChooseImage: () => void;
  onChooseCamera: () => void;
  onChooseDocument: () => void;
  onToggleLongThinking: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <button
        ref={toggleRef}
        type="button"
        disabled={disabled}
        aria-label="Ouvrir les options du message"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-400 ${open ? "rotate-45 bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"}`}
      >
        <Plus className="h-5 w-5" />
      </button>
      {open && (
        <div role="group" aria-label="Ajouter au message" className="absolute bottom-full left-0 z-40 mb-3 w-[min(19rem,calc(100vw-2rem))] origin-bottom-left rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-2xl shadow-slate-950/15 animate-in fade-in slide-in-from-bottom-2 duration-150 motion-reduce:animate-none dark:border-slate-700 dark:bg-[#111827] dark:text-white dark:shadow-slate-950/40">
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Ajouter au message</p>
          <MenuAction icon={<ImagePlus />} title="Image" description="Choisir une image" tint="violet" onClick={() => choose(onChooseImage)} />
          <MenuAction icon={<Camera />} title="Caméra" description="Photographier une page" tint="amber" onClick={() => choose(onChooseCamera)} />
          <MenuAction icon={<FileText />} title="Document PDF" description="Joindre et analyser un document" tint="sky" onClick={() => choose(onChooseDocument)} />
          <div className="my-1.5 border-t border-slate-200 dark:border-white/[0.07]" />
          <button type="button" aria-pressed={longThinking} onClick={() => choose(onToggleLongThinking)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:hover:bg-white/[0.07] dark:focus-visible:ring-cyan-400">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"><BrainCircuit className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Réflexion plus longue</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">Réponse plus approfondie</span></span>
            <span className={`h-[18px] w-8 rounded-full p-0.5 transition-colors ${longThinking ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-600"}`}><span className={`block h-[14px] w-[14px] rounded-full bg-white transition-transform ${longThinking ? "translate-x-3.5" : ""}`} /></span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuAction({
  icon, title, description, tint, onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tint: "violet" | "amber" | "sky";
  onClick: () => void;
}) {
  const colors = {
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
  };
  return (
    <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:hover:bg-white/[0.07] dark:focus-visible:ring-cyan-400">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors[tint]}`}>{icon}</span>
      <span className="min-w-0"><span className="block text-xs font-semibold text-slate-800 dark:text-white">{title}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">{description}</span></span>
    </button>
  );
}
