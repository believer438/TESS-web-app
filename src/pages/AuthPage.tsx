import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import {
  apiGetMe, apiLogin, apiRegister, apiUpdateMe, clearAuth, getGoogleLoginUrl,
  isAuthenticated, markOAuthSession, setToken, type LearningProfile,
} from "@/lib/api-client";

type Mode = "login" | "register";

const profileDefaults: LearningProfile = {
  goals: [], level: "beginner", interests: [], weekly_time: "30", preferred_style: "mixed", target_date: "none",
};
const onboardingSteps = ["Objectif", "Niveau", "Sujets", "Rythme"];
const goalOptions = ["Apprendre plus vite", "Créer et rédiger", "Analyser mes données", "Automatiser mon travail"];
const interestOptions = ["Programmation", "Intelligence artificielle", "Data & statistiques", "Études", "Entrepreneuriat", "Communication"];

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") || "/";
  const onboardingRequested = params.get("onboarding") === "1";
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [profile, setProfile] = useState<LearningProfile>(profileDefaults);

  useEffect(() => {
    if (onboardingRequested && isAuthenticated()) {
      void apiGetMe().then(user => {
        setProfile(current => ({ ...current, ...(user.learning_profile ?? {}) }));
        setOnboardingOpen(true);
      }).catch(() => setError("Impossible de charger ton profil."));
      return;
    }
    if (isAuthenticated() && !params.get("error")) navigate(redirectTo, { replace: true });
    const authError = params.get("error");
    if (authError) {
      clearAuth();
      setError(authError === "google_email_not_verified" ? "Ton adresse Google doit être vérifiée." : "La connexion Google n’a pas abouti. Réessaie.");
    }
  }, [navigate, onboardingRequested, params, redirectTo]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      let result;
      if (mode === "register") {
        if (!fullName.trim()) throw new Error("Indique ton nom pour créer ton espace.");
        if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        if (password !== confirmPassword) throw new Error("Les deux mots de passe ne correspondent pas.");
        // Register already creates the first session and returns its tokens.
        // Do not immediately log in a second time.
        result = await apiRegister(normalizedEmail, fullName.trim(), password);
      } else {
        result = await apiLogin(normalizedEmail, password);
      }
      setToken(result.access_token);
      localStorage.setItem("tess-ai-session", JSON.stringify({ email: normalizedEmail, signedInAt: new Date().toISOString() }));
      window.dispatchEvent(new Event("auth-state-changed"));
      // Personalisation is optional. A new account reaches TESS directly;
      // the profile can be completed later from account settings.
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de te connecter pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = () => {
    setGoogleLoading(true);
    setError(null);
    markOAuthSession();
    setToken("__cookie_session__");
    window.location.href = getGoogleLoginUrl();
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      await apiUpdateMe({ learning_profile: { ...profile, updated_at: new Date().toISOString() }, onboarding_completed: true });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’enregistrer tes préférences.");
    } finally { setLoading(false); }
  };

  const nextOnboardingStep = () => {
    if (onboardingStep === 0 && profile.goals.length === 0) { setError("Choisis au moins un objectif."); return; }
    if (onboardingStep === 2 && profile.interests.length === 0) { setError("Choisis au moins un sujet."); return; }
    setError(null);
    if (onboardingStep === onboardingSteps.length - 1) void finishOnboarding();
    else setOnboardingStep(step => step + 1);
  };

  if (onboardingOpen) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-8 dark:bg-[#0b0d10]">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-white/10 dark:bg-[#15181d] sm:p-10">
          <div className="mb-8 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Ton espace, à ton image</p><h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Bienvenue dans TESS</h1></div><Sparkles className="h-6 w-6 text-blue-600" /></div>
          <div className="mb-7 flex gap-1.5">{onboardingSteps.map((step, index) => <div key={step} className={`h-1.5 flex-1 rounded-full ${index <= onboardingStep ? "bg-blue-600" : "bg-slate-200 dark:bg-white/10"}`} />)}</div>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Étape {onboardingStep + 1} sur {onboardingSteps.length} · Ces préférences peuvent être modifiées plus tard.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {onboardingStep === 0 && goalOptions.map(goal => <button key={goal} type="button" onClick={() => setProfile(p => ({ ...p, goals: p.goals.includes(goal) ? p.goals.filter(v => v !== goal) : [...p.goals, goal] }))} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${profile.goals.includes(goal) ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 text-slate-700 hover:border-blue-300 dark:border-white/10 dark:text-slate-200"}`}>{goal}{profile.goals.includes(goal) && <Check className="h-4 w-4" />}</button>)}
            {onboardingStep === 1 && (["beginner", "intermediate", "advanced", "expert"] as const).map(level => <button key={level} type="button" onClick={() => setProfile(p => ({ ...p, level }))} className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${profile.level === level ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 text-slate-700 hover:border-blue-300 dark:border-white/10 dark:text-slate-200"}`}>{level === "beginner" ? "Débutant" : level === "intermediate" ? "Intermédiaire" : level === "advanced" ? "Avancé" : "Expert"}</button>)}
            {onboardingStep === 2 && interestOptions.map(topic => <button key={topic} type="button" onClick={() => setProfile(p => ({ ...p, interests: p.interests.includes(topic) ? p.interests.filter(v => v !== topic) : [...p.interests, topic] }))} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${profile.interests.includes(topic) ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 text-slate-700 hover:border-blue-300 dark:border-white/10 dark:text-slate-200"}`}>{topic}{profile.interests.includes(topic) && <Check className="h-4 w-4" />}</button>)}
            {onboardingStep === 3 && (["15", "30", "60", "120"] as const).map(time => <button key={time} type="button" onClick={() => setProfile(p => ({ ...p, weekly_time: time }))} className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${profile.weekly_time === time ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 text-slate-700 hover:border-blue-300 dark:border-white/10 dark:text-slate-200"}`}>{time} minutes par semaine</button>)}
          </div>
          {error && <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
          <div className="mt-8 flex gap-3"><button type="button" onClick={() => onboardingStep === 0 ? navigate(redirectTo, { replace: true }) : setOnboardingStep(step => step - 1)} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300">{onboardingStep === 0 ? "Plus tard" : "Retour"}</button><button type="button" onClick={nextOnboardingStep} disabled={loading} className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-[#111827] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : onboardingStep === onboardingSteps.length - 1 ? "Accéder à mon espace" : "Continuer"}<ArrowRight className="h-4 w-4" /></button></div>
        </section>
      </main>
    );
  }

  const passwordScore = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-8 text-slate-900 dark:bg-[#0b0d10] dark:text-white sm:px-6">
      <section className="w-full max-w-[460px]">
        <div className="mb-6 flex items-center justify-between px-1"><Link to="/" className="flex items-center gap-2 text-sm font-bold tracking-[0.18em]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"><Sparkles className="h-4 w-4" /></span>TESS AI</Link><Link to="/" className="text-sm text-slate-500 transition hover:text-slate-900 dark:hover:text-white">Retour au chat</Link></div>
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-9 dark:border-white/10 dark:bg-[#15181d] dark:shadow-black/30">
            <div><p className="text-sm font-medium text-blue-600">Bienvenue dans ton espace</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">{mode === "login" ? "Connecte-toi à TESS" : "Crée ton espace IA"}</h2><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{mode === "login" ? "Retrouve tes conversations et reprends là où tu t’es arrêté." : "Quelques secondes suffisent pour commencer."}</p></div>
            <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 dark:bg-white/10">{(["login", "register"] as Mode[]).map(item => <button key={item} type="button" onClick={() => { setMode(item); setError(null); }} className={`rounded-lg py-2.5 text-sm font-semibold transition ${mode === item ? "bg-white text-slate-900 shadow-sm dark:bg-[#252a33] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{item === "login" ? "Connexion" : "Inscription"}</button>)}</div>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "register" && <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nom complet</span><div className="relative"><UserRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" placeholder="Ton nom" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-[#15181d]" /></div></label>}
              <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">Adresse e-mail</span><div className="relative"><Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input value={email} onChange={e => setEmail(e.target.value)} required type="email" autoComplete="email" placeholder="toi@exemple.com" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-[#15181d]" /></div></label>
              <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">Mot de passe</span><div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input value={password} onChange={e => setPassword(e.target.value)} required minLength={8} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-[#15181d]" /><button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{mode === "register" && <><p className="mt-2 text-[11px] text-slate-400">8 caractères minimum avec une majuscule, un chiffre et un symbole.</p>{password && <div className="mt-2 flex gap-1">{[1,2,3,4].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= passwordScore ? "bg-blue-500" : "bg-slate-200 dark:bg-white/10"}`} />)}</div>}</>}</label>
              {mode === "register" && <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">Confirmer le mot de passe</span><div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" className={`h-12 w-full rounded-xl border bg-white pl-10 pr-4 text-sm outline-none transition focus:ring-4 focus:ring-blue-500/10 dark:bg-[#15181d] ${confirmPassword && confirmPassword !== password ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-blue-500 dark:border-white/10"}`} />{confirmPassword && confirmPassword === password && <Check className="absolute right-3.5 top-3.5 h-4 w-4 text-emerald-500" />}</div></label>}
              {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
              <button disabled={loading || googleLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111827] text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Se connecter" : "Créer mon compte"}<ArrowRight className="h-4 w-4" /></button>
            </form>
            <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />ou<span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /></div>
            <button type="button" onClick={continueWithGoogle} disabled={loading || googleLoading} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-[#15181d] dark:text-slate-200 dark:hover:bg-[#1d2128]">{googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <img src="/google-logo.png" alt="" className="h-4 w-4" />}Continuer avec Google</button>
            <p className="mt-7 text-center text-xs leading-5 text-slate-500">En continuant, tu acceptes les conditions d’utilisation et la politique de confidentialité.</p>
          </div>
      </section>
    </main>
  );
}
