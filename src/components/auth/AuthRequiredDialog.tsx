import { ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles, X } from "lucide-react";

type Props = {
  redirectTo: string;
  onClose: () => void;
  onOpenAuth: (mode: "login" | "register", redirectTo: string) => void;
};

export default function AuthRequiredDialog({ redirectTo, onClose, onOpenAuth }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-[3px] sm:px-6" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="auth-required-title" className="relative w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:p-8 dark:border-slate-700 dark:bg-[#171a20] dark:text-white" onMouseDown={event => event.stopPropagation()}>
        <button type="button" aria-label="Fermer" onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><X className="h-4 w-4" /></button>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Sparkles className="h-5 w-5" /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Ton espace personnel</p>
        <h1 id="auth-required-title" className="mt-2 pr-8 text-2xl font-semibold tracking-tight">Connecte-toi pour continuer</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Crée un compte pour sauvegarder tes conversations, retrouver tes fichiers et personnaliser TESS. Tu peux aussi fermer ce panneau et continuer en invité.</p>
        <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Conversations synchronisées</div>
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><LockKeyhole className="h-4 w-4 text-slate-500" /> Données liées à ton compte</div>
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><Check className="h-4 w-4 text-blue-600" /> Préférences et onboarding personnalisés</div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => onOpenAuth("login", redirectTo)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">Se connecter <ArrowRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => onOpenAuth("register", redirectTo)} className="flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10">Créer un compte</button>
        </div>
        <button type="button" onClick={onClose} className="mt-5 w-full text-center text-xs text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200">Continuer en mode invité</button>
      </section>
    </div>
  );
}
