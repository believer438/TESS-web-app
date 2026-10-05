import { Check, FileText, Image as ImageIcon, Loader2, X } from "lucide-react";

export default function AttachmentCard({
  file,
  type,
  preview,
  uploading = false,
  readyLabel,
  onRemove,
}: {
  file: File;
  type: "image" | "pdf";
  preview?: string;
  uploading?: boolean;
  readyLabel?: string;
  onRemove: () => void;
}) {
  const size = file.size < 1024 * 1024
    ? `${Math.max(1, Math.round(file.size / 1024))} Ko`
    : `${(file.size / (1024 * 1024)).toFixed(1)} Mo`;
  return (
    <div className="mb-2 flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none dark:border-slate-700 dark:bg-[#131b28] dark:text-white">
      {type === "image" && preview ? (
        <img src={preview} alt={`Aperçu de ${file.name}`} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
          {type === "pdf" ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{file.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <span>{type === "pdf" ? "PDF" : "Image"} · {size}</span>
          <span aria-hidden="true">·</span>
          {uploading ? <><Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> Préparation…</> : <><Check className="h-3 w-3 text-emerald-400" /> {readyLabel ?? "Prêt à être envoyé"}</>}
        </span>
      </span>
      <button type="button" onClick={onRemove} aria-label={`Retirer ${file.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-cyan-400">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
