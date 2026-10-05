import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, Volume2, X } from "lucide-react";

export type MessageAudioPlayerState = {
  visible: boolean;
  title: string;
  isPlaying: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  currentTime: number;
  totalDuration: number;
  generatedChunks: number;
  totalChunks: number | null;
  waveform: number[];
  error: string;
};

type Props = MessageAudioPlayerState & {
  onPlayPause: () => void;
  onSeek: (value: number) => void;
  onClose: () => void;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const seconds = Math.floor(value);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function resampleWaveform(source: number[], targetSize: number) {
  if (!source.length) return Array.from({ length: targetSize }, (_, index) => 0.2 + ((index * 17) % 65) / 100);
  return Array.from({ length: targetSize }, (_, index) => {
    const start = Math.floor((index / targetSize) * source.length);
    const end = Math.max(start + 1, Math.floor(((index + 1) / targetSize) * source.length));
    return Math.max(...source.slice(start, end));
  });
}

export default function MessageAudioPlayer({ visible, title, isPlaying, isLoading, isStreaming, currentTime, totalDuration, generatedChunks, waveform, error, onPlayPause, onSeek, onClose }: Props) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [barCount, setBarCount] = useState(64);
  useEffect(() => {
    const element = waveformRef.current;
    if (!element) return;
    const updateBarCount = () => setBarCount(Math.max(36, Math.min(140, Math.floor(element.clientWidth / 3))));
    updateBarCount();
    const observer = new ResizeObserver(updateBarCount);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);
  const displayWaveform = useMemo(() => resampleWaveform(waveform, barCount), [barCount, waveform]);
  if (!visible) return null;
  const max = Math.max(1, totalDuration);
  const progress = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;
  const status = isStreaming
    ? generatedChunks > 0 ? "Audio en cours de génération…" : "Préparation de l’audio…"
    : isLoading ? "Chargement…" : "Message audio";
  return (
    <div className="sticky top-0 z-20 rounded-2xl border border-blue-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#111827]/95">
      <div className="mx-auto flex w-full max-w-[760px] items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">{title || "Lecture du message"}</p>
            <span className="shrink-0 text-[9px] text-slate-400">{status}</span>
          </div>
          <div ref={waveformRef} className="relative mt-1.5 h-6 overflow-hidden rounded-md bg-slate-100 px-1 dark:bg-slate-800" aria-label={`Progression audio : ${formatTime(currentTime)} sur ${formatTime(totalDuration)}`}>
            <div className="absolute inset-0 flex items-center gap-px">
              {displayWaveform.map((height, index) => <span key={`quiet-${index}`} className="min-w-0 flex-1 rounded-full bg-slate-300 dark:bg-slate-600" style={{ height: `${Math.max(18, Math.round(height * 100))}%` }} />)}
            </div>
            <div className="absolute inset-0 flex items-center gap-px transition-[clip-path] duration-75 ease-linear" style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}>
              {displayWaveform.map((height, index) => <span key={`played-${index}`} className={`min-w-0 flex-1 rounded-full ${isPlaying && index === Math.floor((progress / 100) * displayWaveform.length) ? "bg-cyan-400" : "bg-blue-600"}`} style={{ height: `${Math.max(18, Math.round(height * 100))}%` }} />)}
            </div>
            {isStreaming && <div className="audio-progress-indeterminate absolute inset-y-0 left-0 w-1/4 rounded-full bg-white/45" />}
            <input aria-label="Déplacer dans l’audio" type="range" min={0} max={max} step={0.01} value={Math.min(currentTime, max)} onChange={(event) => onSeek(Number(event.target.value))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </div>
        </div>
        <span className="hidden whitespace-nowrap text-[10px] tabular-nums text-slate-400 sm:inline">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
        {error && <span role="alert" className="sr-only">{error}</span>}
        <button type="button" onClick={onPlayPause} disabled={isLoading && totalDuration === 0} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label={isPlaying ? "Mettre en pause" : "Lire l’audio"}>
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Fermer le lecteur audio"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
