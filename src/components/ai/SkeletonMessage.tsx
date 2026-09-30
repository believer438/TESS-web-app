// Copie Zentrix Academy : src/components/ai/SkeletonMessage.tsx
export default function SkeletonMessage() {
  return (
    <div className="w-full max-w-[min(100%,42rem)] animate-in fade-in duration-200 motion-reduce:animate-none" role="status" aria-label="Préparation de la réponse">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 motion-reduce:animate-none" />
        Préparation de la réponse
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-800 bg-[#101722] p-4">
        <div className="h-3 w-2/5 animate-pulse rounded bg-slate-700/80 motion-reduce:animate-none" />
        <div className="space-y-2">
          <div className="h-2.5 w-full animate-pulse rounded bg-slate-800 motion-reduce:animate-none" />
          <div className="h-2.5 w-[91%] animate-pulse rounded bg-slate-800 motion-reduce:animate-none" />
          <div className="h-2.5 w-3/4 animate-pulse rounded bg-slate-800 motion-reduce:animate-none" />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="h-9 animate-pulse rounded-xl bg-slate-800/80 motion-reduce:animate-none" />
          <div className="h-9 animate-pulse rounded-xl bg-slate-800/80 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
