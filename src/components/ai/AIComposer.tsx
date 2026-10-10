import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as PointerEventType, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp, Bot, BrainCircuit, Check, ChevronDown, Command, FileText, Mic,
  Pause, Play, Search, Square, TriangleAlert, UserRound, X, Zap,
} from "lucide-react";
import HoverTooltip from "@/components/ui/hover-tooltip";

export type ComposerMode = "normal" | "reflect" | "search" | "agent";
export type ComposerResource = { id: string; label: string; description: string };

type Suggestion = {
  id: string;
  label: string;
  description: string;
  icon: typeof Search;
  insert: string;
};

const COMMANDS: Suggestion[] = [
  { id: "search", label: "Rechercher", description: "Chercher des informations vérifiables", icon: Search, insert: "/rechercher " },
  { id: "reflect", label: "Réflexion", description: "Prendre plus de temps pour structurer la réponse", icon: BrainCircuit, insert: "/réfléchir " },
  { id: "agent", label: "Utiliser un agent", description: "Choisir une capacité disponible pour la demande", icon: Bot, insert: "/agent " },
  { id: "task", label: "Créer une tâche", description: "Transformer la demande en action suivie", icon: Zap, insert: "/tâche " },
  { id: "analyze", label: "Analyser", description: "Décomposer un contenu ou un problème", icon: Command, insert: "/analyser " },
];

const RESOURCES: Suggestion[] = [
  { id: "agent", label: "Agent", description: "Invoquer un agent autorisé par T.E.S.S.", icon: Bot, insert: "@agent " },
  { id: "file", label: "Fichier", description: "Utiliser un fichier déjà joint au message", icon: FileText, insert: "@fichier " },
  { id: "context", label: "Contexte", description: "Ajouter le contexte actif de la conversation", icon: Command, insert: "@contexte " },
  { id: "task", label: "Tâche", description: "Référencer une tâche suivie", icon: Zap, insert: "@tâche " },
];

const ROTATING_PLACEHOLDERS = [
  "Posez n’importe quelle question…",
  "Explique-moi un concept simplement",
  "Aide-moi à résoudre un problème",
  "Résume ce document",
  "Rédige un texte clair et précis",
  "Traduis une phrase",
  "Améliore ce message",
  "Prépare un plan étape par étape",
  "Trouve des idées créatives",
  "Compare ces deux options",
  "Vérifie cette information",
  "Aide-moi à comprendre ce code",
  "Organise mes tâches du jour",
  "Prépare une réponse professionnelle",
  "Que souhaitez-vous explorer aujourd’hui ?",
];

const MODE_ITEMS: Array<{ id: ComposerMode; label: string; description: string; icon: typeof Bot }> = [
  { id: "normal", label: "Normal", description: "Réponse directe et équilibrée", icon: Bot },
  { id: "reflect", label: "Réflexion", description: "Prend le temps d’analyser avant de répondre", icon: BrainCircuit },
  { id: "search", label: "Recherche", description: "S’appuie sur la recherche pour vérifier les informations", icon: Search },
  { id: "agent", label: "Agent", description: "Délègue à une capacité autorisée", icon: Zap },
];

function normalizeMessage(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\r\n/g, "\n").trim();
}

function useRecorder(onComplete: (blob: Blob, durationMs: number) => void, onError: (message: string) => void) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "paused" | "processing">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const analyserFrameRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (analyserFrameRef.current !== null) cancelAnimationFrame(analyserFrameRef.current);
    analyserFrameRef.current = null;
  }, []);

  useEffect(() => {
    if (state !== "recording" && state !== "paused") return;
    const timer = window.setInterval(() => {
      if (state === "recording") setElapsed(Math.max(0, Date.now() - startedAtRef.current - pausedAtRef.current));
    }, 100);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("L’enregistrement audio n’est pas disponible dans ce navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      pausedAtRef.current = 0;
      setElapsed(0);
      setLevel(0);
      setWaveform([]);
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        cleanup();
        if (blob.size) onComplete(blob, Math.max(0, Date.now() - startedAtRef.current - pausedAtRef.current));
        setState("idle");
      };
      recorder.onerror = () => { cleanup(); setState("idle"); onError("L’enregistrement audio a rencontré un problème."); };
      recorder.start(250);
      setState("recording");

      const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) {
        const audioContext = new AudioContextCtor();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const sample = () => {
          analyser.getByteTimeDomainData(data);
          const average = data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length;
          setLevel(Math.min(1, average / 34));
          setWaveform(Array.from(data).slice(0, 28).map(value => Math.max(0.04, Math.abs(value - 128) / 128)));
          analyserFrameRef.current = requestAnimationFrame(sample);
        };
        sample();
      }
    } catch (error) {
      cleanup();
      onError(error instanceof DOMException && error.name === "NotAllowedError" ? "L’accès au microphone a été refusé. Autorisez-le dans votre navigateur pour enregistrer." : "Le microphone est indisponible pour le moment.");
    }
  }, [cleanup, onComplete, onError]);

  const pause = useCallback(() => {
    if (!recorderRef.current || state !== "recording") return;
    recorderRef.current.pause();
    pausedAtRef.current += Date.now() - (startedAtRef.current + pausedAtRef.current);
    setState("paused");
  }, [state]);

  const resume = useCallback(() => {
    if (!recorderRef.current || state !== "paused") return;
    recorderRef.current.resume();
    startedAtRef.current = Date.now() - elapsed;
    pausedAtRef.current = 0;
    setState("recording");
  }, [elapsed, state]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.onstop = () => { chunksRef.current = []; cleanup(); setState("idle"); };
    recorder?.stop();
    if (!recorder) { cleanup(); setState("idle"); }
    setElapsed(0);
  }, [cleanup]);

  const finish = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    setState("processing");
    recorderRef.current.stop();
  }, []);

  return { state, elapsed, level, waveform, start, pause, resume, cancel, finish };
}

export default function AIComposer({
  value, onChange, onSubmit, disabled = false, isStreaming = false, onStop,
  mode = "normal", onModeChange, placeholder = "Écrire à T.E.S.S.…", prefixActions,
  onAudioRecorded, onAudioError, inputRef: externalInputRef, resources = [], className = "", interactionActive = false, alertMode = false, onToggleAlertMode,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  mode?: ComposerMode;
  onModeChange?: (mode: ComposerMode) => void;
  placeholder?: string;
  prefixActions?: ReactNode;
  onAudioRecorded?: (blob: Blob, durationMs: number) => void;
  onAudioError?: (message: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement>;
  resources?: ComposerResource[];
  className?: string;
  interactionActive?: boolean;
  alertMode?: boolean;
  onToggleAlertMode?: () => void;
}) {
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalInputRef ?? localTextareaRef;
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [audioError, setAudioError] = useState("");
  const audioGestureStartRef = useRef<number | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuPanelRef = useRef<HTMLDivElement>(null);
  const [modeMenuPosition, setModeMenuPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const [textareaHeight, setTextareaHeight] = useState(32);
  const [composerHeight, setComposerHeight] = useState(48);
  const [textareaOverflow, setTextareaOverflow] = useState<"hidden" | "auto">("hidden");
  const [randomPlaceholder] = useState(() =>
    ROTATING_PLACEHOLDERS[Math.floor(Math.random() * ROTATING_PLACEHOLDERS.length)],
  );
  const displayPlaceholder = placeholder.toLocaleLowerCase().includes("fichier")
    ? placeholder
    : randomPlaceholder;
  const normalized = useMemo(() => normalizeMessage(value), [value]);
  const hasDraft = normalized.length > 0 || interactionActive;
  const audioButton = !hasDraft && !isStreaming;
  // Keep the text field clear of the optional action cluster on the left.
  const textareaStart = prefixActions ? 48 : 8;
  const actionButtonTone = alertMode
    ? "border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 dark:border-red-500 dark:bg-red-500 dark:text-white dark:hover:border-red-400 dark:hover:bg-red-600"
    : "border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:text-white dark:hover:border-blue-400 dark:hover:bg-blue-600";
  const activeMode = MODE_ITEMS.find(item => item.id === mode) ?? MODE_ITEMS[0];
  const resourceSuggestions = useMemo<Suggestion[]>(() => resources.map(resource => ({ id: `resource-${resource.id}`, label: resource.label, description: resource.description, icon: UserRound, insert: `@${resource.id} ` })), [resources]);
  const popup = useMemo(() => {
    const match = value.match(/(?:^|\s)([\/@])([^\s]*)$/);
    if (!match) return null;
    const source = match[1] === "/" ? COMMANDS : [...RESOURCES, ...resourceSuggestions];
    const query = match[2].toLocaleLowerCase();
    return { trigger: match[1], query, items: source.filter(item => `${item.label} ${item.id} ${item.description}`.toLocaleLowerCase().includes(query)) };
  }, [resourceSuggestions, value]);
  const suggestions = popup?.items ?? [];
  const recorder = useRecorder(
    (blob, durationMs) => { setAudioOpen(false); onAudioRecorded?.(blob, durationMs); },
    message => { setAudioError(message); onAudioError?.(message); },
  );

  const measureTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = 168;
    const isEmpty = normalized.length === 0;
    const nextHeight = isEmpty ? 32 : Math.min(maxHeight, Math.max(32, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    setTextareaHeight(nextHeight);
    const hasActionRow = nextHeight > 32 || mode !== "normal";
    setComposerHeight(Math.max(48, nextHeight + 10 + (hasActionRow ? 48 : 0)));
    setTextareaOverflow(!isEmpty && textarea.scrollHeight > maxHeight ? "auto" : "hidden");
  }, [mode, normalized, textareaRef]);

  useLayoutEffect(() => {
    measureTextarea();
  }, [audioButton, measureTextarea, mode, textareaRef, value]);

  useEffect(() => {
    const timer = window.setTimeout(measureTextarea, 320);
    return () => window.clearTimeout(timer);
  }, [audioButton, measureTextarea]);

  useEffect(() => setActiveIndex(index => Math.min(index, Math.max(0, suggestions.length - 1))), [suggestions.length]);

  useLayoutEffect(() => {
    if (!modeMenuOpen) return;
    const positionMenu = () => {
      const trigger = modeMenuRef.current?.querySelector("button")?.getBoundingClientRect();
      const panel = modeMenuPanelRef.current;
      if (!trigger || !panel) return;

      const visualViewport = window.visualViewport;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
      const edge = 8;
      const gap = 8;
      const width = Math.max(1, Math.min(240, viewportWidth - edge * 2));
      const left = Math.max(viewportLeft + edge, Math.min(trigger.right - width, viewportLeft + viewportWidth - width - edge));
      const above = Math.max(0, trigger.top - viewportTop - gap - edge);
      const below = Math.max(0, viewportBottom - trigger.bottom - gap - edge);
      const openAbove = above >= Math.min(panel.scrollHeight, 180) || above >= below;
      const maxHeight = Math.max(1, openAbove ? above : below);
      const height = Math.min(panel.scrollHeight, maxHeight);
      const top = openAbove ? trigger.top - gap - height : trigger.bottom + gap;
      setModeMenuPosition({ top: Math.max(viewportTop + edge, top), left, width, maxHeight });
    };
    positionMenu();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !modeMenuRef.current?.contains(event.target) && !modeMenuPanelRef.current?.contains(event.target)) setModeMenuOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setModeMenuOpen(false);
    };
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    window.visualViewport?.addEventListener("resize", positionMenu);
    window.visualViewport?.addEventListener("scroll", positionMenu);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
      window.visualViewport?.removeEventListener("resize", positionMenu);
      window.visualViewport?.removeEventListener("scroll", positionMenu);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modeMenuOpen]);

  const selectSuggestion = useCallback((item: Suggestion) => {
    const match = value.match(/(?:^|\s)([\/@])([^\s]*)$/);
    const next = match ? value.slice(0, value.length - match[0].length) + item.insert : `${value}${item.insert}`;
    onChange(next);
    if (item.id === "search") onModeChange?.("search");
    if (item.id === "reflect") onModeChange?.("reflect");
    if (item.id === "agent") onModeChange?.("agent");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [onChange, onModeChange, textareaRef, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (popup && suggestions.length) {
      if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex(index => (index + 1) % suggestions.length); return; }
      if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(index => (index - 1 + suggestions.length) % suggestions.length); return; }
      if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) { event.preventDefault(); selectSuggestion(suggestions[activeIndex]); return; }
      if (event.key === "Escape") { event.preventDefault(); onChange(value.replace(/(?:^|\s)[\/@][^\s]*$/, "").trimEnd() + " "); return; }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (normalized && !disabled && !isStreaming) onSubmit(normalized);
    }
  };

  const beginAudio = () => { setAudioError(""); setAudioOpen(true); void recorder.start(); };
  const closeAudio = () => { recorder.cancel(); setAudioLocked(false); setAudioOpen(false); };
  const handleAudioPointerDown = (event: PointerEventType<HTMLButtonElement>) => { audioGestureStartRef.current = event.clientY; };
  const handleAudioPointerMove = (event: PointerEventType<HTMLButtonElement>) => {
    if (audioGestureStartRef.current !== null && audioGestureStartRef.current - event.clientY >= 48) setAudioLocked(true);
  };
  const sendAudio = () => { recorder.finish(); };
  return <div className={`relative w-full ${className}`}>
    {alertMode && <div role="status" className="mb-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-800 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-100">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span><strong>Mode Alerte actif.</strong></span>
    </div>}
    {popup && suggestions.length > 0 && <div role="listbox" aria-label={popup.trigger === "/" ? "Commandes TESS" : "Ressources TESS"} className="absolute bottom-[calc(100%+0.6rem)] left-0 right-0 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.18)] dark:border-white/15 dark:bg-[#242424] dark:text-white">
      <div className="flex items-center gap-2 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400"><Command className="h-3.5 w-3.5" />{popup.trigger === "/" ? "Commandes" : "Ressources"}<span className="ml-auto normal-case tracking-normal">↑ ↓ · Entrée</span></div>
      {suggestions.map((item, index) => { const Icon = item.icon; return <button key={item.id} type="button" role="option" aria-selected={index === activeIndex} onMouseDown={event => event.preventDefault()} onClick={() => selectSuggestion(item)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${index === activeIndex ? "bg-slate-100 dark:bg-white/10" : "hover:bg-slate-50 dark:hover:bg-white/[0.06]"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-white/10 dark:text-white/80"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{item.label}</span><span className="block truncate text-[10px] text-slate-500 dark:text-white/55">{item.description}</span></span></button>; })}
    </div>}
    <div style={{ width: audioButton ? "calc(100% - 52px)" : "100%", height: `${composerHeight}px` }} className={`relative flex min-h-[48px] min-w-0 items-center gap-1.5 rounded-[18px] border px-2 shadow-sm transition-[width,height,border-radius] duration-200 ease-out dark:bg-[#202020] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] ${alertMode ? "border-red-300 bg-red-50/40 dark:border-red-500/50" : "border-slate-200 bg-white dark:border-[#383838]"} ${audioButton ? "pr-2" : "pr-14"}`}>
      {prefixActions}
      <div className="absolute right-1 top-2" style={{ left: `${textareaStart}px`, bottom: `${textareaHeight > 32 || mode !== "normal" ? 48 : 8}px` }}>
        <textarea ref={textareaRef} rows={1} value={value} onChange={event => onChange(event.target.value)} onKeyDown={handleKeyDown} placeholder={displayPlaceholder} disabled={disabled} aria-label="Message à T.E.S.S." style={{ height: `${textareaHeight}px`, overflowY: textareaOverflow, scrollbarGutter: "stable" }} className={`block max-h-[168px] min-h-8 w-full resize-none overflow-x-hidden bg-transparent py-1 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-white/55 ${mode !== "normal" ? "pr-2" : "pr-28"}`} />
      </div>
      {mode !== "normal" && <div ref={modeMenuRef} className="relative mb-2 ml-auto inline-flex shrink-0 self-end items-center gap-1">
        <HoverTooltip label={`${activeMode.label} · ${activeMode.description}`}><button type="button" aria-label={`Mode actif : ${activeMode.label}. Choisir un mode`} aria-haspopup="menu" aria-expanded={modeMenuOpen} onClick={() => setModeMenuOpen(open => !open)} className="inline-flex h-8 max-w-[min(10rem,38vw)] items-center justify-center gap-1 rounded-full border border-blue-200 bg-blue-50/80 px-2 text-blue-800 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-200 dark:hover:bg-blue-400/15"><activeMode.icon className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-300" /><span className="hidden truncate text-[10px] font-semibold md:inline">{activeMode.label}</span><ChevronDown className={`h-3 w-3 shrink-0 text-blue-500 transition-transform ${modeMenuOpen ? "rotate-180" : ""}`} /></button></HoverTooltip>
        {modeMenuOpen && createPortal(<div ref={modeMenuPanelRef} role="menu" aria-label="Choisir le mode de réponse" style={modeMenuPosition ? { position: "fixed", top: modeMenuPosition.top, left: modeMenuPosition.left, width: modeMenuPosition.width, maxHeight: modeMenuPosition.maxHeight } : { position: "fixed", top: -10000, left: 8, width: Math.max(1, Math.min(240, window.innerWidth - 16)), maxHeight: 1, visibility: "hidden" }} className="z-[160] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl dark:border-white/15 dark:bg-[#242424] dark:text-white">
          {MODE_ITEMS.map(item => {
            const Icon = item.icon;
            return <button key={item.id} type="button" role="menuitemradio" aria-checked={mode === item.id} onClick={() => { onModeChange?.(item.id); setModeMenuOpen(false); }} className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${mode === item.id ? "bg-blue-50 text-blue-900 dark:bg-blue-400/10 dark:text-blue-100" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.06]"}`}><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${mode === item.id ? "bg-blue-100 text-blue-700 dark:bg-blue-300/15 dark:text-blue-200" : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300"}`}><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold">{item.label}</span><span className="mt-0.5 block whitespace-normal text-[10px] leading-4 text-slate-500 dark:text-slate-400">{item.description}</span></span>{mode === item.id && <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-300" />}</button>;
          })}
        </div>, document.body)}
      </div>}
      {onToggleAlertMode && <HoverTooltip label={alertMode ? "Désactiver le mode alerte" : "Activer le mode alerte"} side="top"><button type="button" aria-pressed={alertMode} aria-label={alertMode ? "Désactiver le mode alerte" : "Activer le mode alerte"} onClick={onToggleAlertMode} className={`relative mb-2 ${mode === "normal" ? "ml-auto" : "ml-0"} inline-flex h-8 min-w-[3.5rem] max-w-[min(5.5rem,24vw)] shrink-0 self-end items-center justify-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold shadow-sm transition-[background-color,color,border-color,box-shadow] duration-200 ${alertMode ? "border-red-600 bg-red-600 text-white shadow-red-600/15 hover:bg-red-700 dark:border-red-500 dark:bg-red-500" : "border-red-200 bg-white/90 text-red-700 hover:border-red-300 hover:bg-red-50 dark:border-red-500/40 dark:bg-[#242424] dark:text-red-300 dark:hover:bg-red-500/10"}`}>
        {alertMode && <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        <span>Alerte</span>
      </button></HoverTooltip>}
      {isStreaming && <HoverTooltip label="Arrêter la réponse"><button type="button" onClick={onStop} aria-label="Arrêter la réponse" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white transition hover:bg-slate-950 dark:bg-white dark:text-black"><Square className="h-3 w-3 fill-current" /></button></HoverTooltip>}
    </div>
    {!isStreaming && <HoverTooltip label={audioButton ? "Démarrer l’enregistrement audio" : "Envoyer le message"}><button type="button" onClick={audioButton ? beginAudio : () => normalized && onSubmit(normalized)} onPointerDown={audioButton ? handleAudioPointerDown : undefined} onPointerMove={audioButton ? handleAudioPointerMove : undefined} onPointerCancel={() => { audioGestureStartRef.current = null; }} disabled={disabled || (!audioButton && !normalized)} aria-label={audioButton ? "Démarrer l’enregistrement audio" : "Envoyer le message"} className={`absolute z-10 flex items-center justify-center rounded-full border shadow-sm transition-[right,bottom,width,height,background-color,color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${audioButton ? `bottom-1 right-0 h-12 w-12 ${actionButtonTone}` : `bottom-2 right-2 h-10 w-10 ${actionButtonTone}`}`}>
      <span className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200 ${audioButton ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} aria-hidden="true"><Mic className="h-[18px] w-[18px]" /></span>
      <span className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200 ${audioButton ? "scale-75 opacity-0" : "scale-100 opacity-100"}`} aria-hidden="true"><ArrowUp className="h-4 w-4" /></span>
    </button></HoverTooltip>}
    {audioError && <div role="alert" className="absolute bottom-[calc(100%+0.6rem)] right-0 z-50 max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-lg dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200"><button type="button" aria-label="Fermer" onClick={() => setAudioError("")} className="float-right ml-2"><X className="h-3.5 w-3.5" /></button>{audioError}</div>}
    {audioOpen && <div role="dialog" aria-modal="true" aria-label="Enregistrement audio" className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:absolute sm:inset-auto sm:bottom-[calc(100%+0.75rem)] sm:right-0 sm:block sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:pointer-events-none"><div className="pointer-events-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#202020] dark:text-white sm:w-96"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Enregistrement audio</p><p className="mt-1 text-xs text-slate-500 dark:text-white/55">{recorder.state === "paused" ? "En pause" : recorder.state === "processing" ? "Préparation de l’audio…" : audioLocked ? "Enregistrement verrouillé" : "T.E.S.S. écoute"}</p></div><button type="button" onClick={closeAudio} aria-label="Annuler l’enregistrement" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button></div><div className="mt-7 flex h-10 items-center justify-center gap-1" aria-label={`Niveau sonore ${Math.round(recorder.level * 100)} pour cent`}>{Array.from({ length: 28 }, (_, index) => <span key={index} className="w-1 rounded-full bg-slate-900 transition-[height] dark:bg-white" style={{ height: `${8 + (recorder.waveform[index] ?? recorder.level * .7) * 30}px`, opacity: recorder.level ? .45 + recorder.level * .55 : .28 }} />)}</div><p className="mt-4 text-center font-mono text-2xl tabular-nums">{`${Math.floor(recorder.elapsed / 60000)}:${String(Math.floor(recorder.elapsed / 1000) % 60).padStart(2, "0")}`}</p><div className="mt-7 flex items-center justify-center gap-3"><button type="button" onClick={closeAudio} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-white/75 dark:hover:bg-white/10" aria-label="Annuler"><X className="h-4 w-4" /></button>{recorder.state === "paused" ? <button type="button" onClick={recorder.resume} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-black" aria-label="Reprendre"><Play className="h-5 w-5" /></button> : <button type="button" onClick={recorder.pause} disabled={recorder.state !== "recording"} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white disabled:opacity-40 dark:bg-white dark:text-black" aria-label="Mettre en pause"><Pause className="h-5 w-5" /></button>}<button type="button" onClick={sendAudio} disabled={recorder.state === "processing" || recorder.elapsed < 300} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white disabled:opacity-40 dark:bg-white dark:text-black" aria-label="Envoyer l’audio"><ArrowUp className="h-5 w-5" /></button></div></div></div>}
  </div>;
}
