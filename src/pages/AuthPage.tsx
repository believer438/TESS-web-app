// Copie Zentrix Academy : src/pages/AuthPage.tsx
import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, BookOpen, Check, Users, TrendingUp, Shield } from "lucide-react";
import { apiGetMe, apiLogin, apiRegister, apiUpdateMe, setToken, clearAuth, markOAuthSession, isAuthenticated, getGoogleLoginUrl, needsLearningProfile, type LearningProfile } from "@/lib/api-client";
import { useLanguage, type Lang } from "@/lib/i18n";

type Mode = "login" | "register";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

const testimonials = [
  { name: "Sarah M.", role: "Étudiante en Data Science", avatar: "SM", text: "Zentrix a transformé ma façon d'apprendre. L'IA m'aide à progresser deux fois plus vite." },
  { name: "Karim B.", role: "Développeur Web", avatar: "KB", text: "Les cours sont structurés, clairs et l'assistant IA répond à toutes mes questions en temps réel." },
  { name: "Amina T.", role: "Marketing Digital", avatar: "AT", text: "La meilleure plateforme d'apprentissage que j'ai utilisée. Simple, professionnelle et efficace." },
];

const stats = [
  { icon: BookOpen, value: "20+", label: "Parcours" },
  { icon: Users, value: "5 000+", label: "Apprenants" },
  { icon: TrendingUp, value: "95%", label: "Satisfaction" },
  { icon: Shield, value: "100%", label: "Gratuit" },
];

const onboardingSections = [
  { title: "Votre objectif", description: "Qu’aimeriez-vous accomplir avec Zentrix ?" },
  { title: "Votre niveau", description: "TESS adaptera le rythme et la difficulté." },
  { title: "Vos sujets", description: "Choisissez les domaines qui vous intéressent." },
  { title: "Votre rythme", description: "Nous construirons un parcours réaliste pour vous." },
  { title: "Votre échéance", description: "Avez-vous un objectif à atteindre dans un délai précis ?" },
];

const goalOptions = ["Réussir mes études", "Préparer un métier", "Développer mes compétences", "Obtenir une certification"];
const interestOptions = ["Programmation", "Réseaux & systèmes", "Intelligence artificielle", "Data & mathématiques", "Gestion de projet", "Communication"];

export default function AuthPage() {
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const authError = searchParams.get("error");
  const onboardingRequested = searchParams.get("onboarding") === "1";

  const [mode, setMode] = useState<Mode>(
    (searchParams.get("mode") as Mode) ?? "login"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [learningProfile, setLearningProfile] = useState<LearningProfile>({
    goals: [], level: "beginner", interests: [], weekly_time: "30", preferred_style: "mixed", target_date: "none",
  });

  useEffect(() => {
    if (authError) {
      clearAuth();
      setError(
        authError === "google_email_not_verified"
          ? t("auth.googleNotVerified")
          : authError === "google_account_unavailable"
            ? t("auth.googleUnavailable")
            : t("auth.googleError")
      );
      return;
    }
    if (onboardingRequested && isAuthenticated()) {
      apiGetMe().then(profile => {
        if (!needsLearningProfile(profile)) {
          navigate(redirectTo, { replace: true });
          return;
        }
        setLearningProfile(current => ({ ...current, ...(profile.learning_profile ?? {}) }));
        setOnboardingOpen(true);
      }).catch(() => setError("Impossible de charger votre profil d’apprentissage."));
      return;
    }
    if (isAuthenticated()) navigate(redirectTo, { replace: true });
  }, [authError, navigate, onboardingRequested, redirectTo, t]);

  useEffect(() => {
    const id = setInterval(() => setTestimonialIdx((i) => (i + 1) % testimonials.length), 4000);
    return () => clearInterval(id);
  }, []);

  const switchMode = (m: Mode) => { setMode(m); setError(null); };

  const toggleProfileValue = (key: "goals" | "interests", value: string) => {
    setLearningProfile(current => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value],
    }));
  };

  const finishOnboarding = async () => {
    setOnboardingSaving(true);
    setError(null);
    try {
      await apiUpdateMe({ learning_profile: { ...learningProfile, updated_at: new Date().toISOString() }, onboarding_completed: true });
      setOnboardingOpen(false);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’enregistrer votre profil d’apprentissage.");
    } finally {
      setOnboardingSaving(false);
    }
  };

  const nextOnboardingStep = () => {
    if (onboardingStep === 0 && learningProfile.goals.length === 0) { setError("Choisissez au moins un objectif pour continuer."); return; }
    if (onboardingStep === 2 && learningProfile.interests.length === 0) { setError("Choisissez au moins un sujet pour continuer."); return; }
    setError(null);
    if (onboardingStep === onboardingSections.length - 1) void finishOnboarding();
    else setOnboardingStep(step => step + 1);
  };

  const handleGoogleLogin = () => {
    setError(null);
    setGoogleLoading(true);
    markOAuthSession();
    setToken("__cookie_session__");
    window.location.href = getGoogleLoginUrl();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "register") {
        if (!fullName.trim()) { setError(t("auth.requiredName")); setLoading(false); return; }
        if (password.length < 8) { setError(t("auth.passwordMinError")); setLoading(false); return; }
        await apiRegister(normalizedEmail, fullName.trim(), password);
        const res = await apiLogin(normalizedEmail, password);
        setToken(res.access_token);
        localStorage.setItem("zentrix-academy_session", JSON.stringify({ email: normalizedEmail, fullName: fullName.trim(), createdAt: new Date().toISOString() }));
        setOnboardingStep(0);
        setOnboardingOpen(true);
        setLoading(false);
        return;
      } else {
        const res = await apiLogin(normalizedEmail, password);
        setToken(res.access_token);
        const profile = await apiGetMe();
        if (needsLearningProfile(profile)) {
          setLearningProfile(current => ({ ...current, ...(profile.learning_profile ?? {}) }));
          setOnboardingStep(0);
          setOnboardingOpen(true);
          setLoading(false);
          return;
        }
      }
      localStorage.setItem("zentrix-academy_session", JSON.stringify({ email: normalizedEmail, createdAt: new Date().toISOString() }));
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const testimonial = testimonials[testimonialIdx];

  if (onboardingOpen) {
    const section = onboardingSections[onboardingStep];
    return (
      <div className="tess-auth flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B00]">Votre parcours Zentrix</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{section.title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{section.description}</p></div>
            <span className="shrink-0 text-sm font-semibold text-slate-500">{onboardingStep + 1}/{onboardingSections.length}</span>
          </div>
          <div className="mt-6 flex gap-1.5">{onboardingSections.map((item, index) => <div key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= onboardingStep ? "bg-[#FF6B00]" : "bg-slate-200 dark:bg-slate-700"}`} />)}</div>
          <div className="mt-8">
            {onboardingStep === 0 && <div className="grid gap-3 sm:grid-cols-2">{goalOptions.map(option => <button key={option} type="button" onClick={() => toggleProfileValue("goals", option)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${learningProfile.goals.includes(option) ? "border-[#FF6B00] bg-orange-50 text-orange-800 dark:bg-orange-400/10 dark:text-orange-200" : "border-slate-200 text-slate-700 hover:border-orange-300 dark:border-slate-700 dark:text-slate-200"}`}>{option}{learningProfile.goals.includes(option) && <Check className="h-4 w-4" />}</button>)}</div>}
            {onboardingStep === 1 && <div className="grid gap-3 sm:grid-cols-2">{(["beginner", "intermediate", "advanced", "expert"] as const).map(level => <button key={level} type="button" onClick={() => setLearningProfile(current => ({ ...current, level }))} className={`rounded-2xl border px-4 py-5 text-left transition ${learningProfile.level === level ? "border-[#FF6B00] bg-orange-50 dark:bg-orange-400/10" : "border-slate-200 hover:border-orange-300 dark:border-slate-700"}`}><span className="block text-sm font-bold capitalize text-slate-900 dark:text-white">{level === "beginner" ? "Débutant" : level === "intermediate" ? "Intermédiaire" : level === "advanced" ? "Avancé" : "Expert"}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{level === "beginner" ? "Je découvre encore les bases" : level === "intermediate" ? "Je connais les fondamentaux" : level === "advanced" ? "Je résous déjà des problèmes complexes" : "Je veux approfondir et transmettre"}</span></button>)}</div>}
            {onboardingStep === 2 && <div className="grid gap-3 sm:grid-cols-2">{interestOptions.map(option => <button key={option} type="button" onClick={() => toggleProfileValue("interests", option)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${learningProfile.interests.includes(option) ? "border-[#FF6B00] bg-orange-50 text-orange-800 dark:bg-orange-400/10 dark:text-orange-200" : "border-slate-200 text-slate-700 hover:border-orange-300 dark:border-slate-700 dark:text-slate-200"}`}>{option}{learningProfile.interests.includes(option) && <Check className="h-4 w-4" />}</button>)}</div>}
            {onboardingStep === 3 && <div className="space-y-6"><div><p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Temps disponible par semaine</p><div className="grid gap-3 sm:grid-cols-3">{(["15", "30", "60", "120", "more"] as const).map(time => <button key={time} type="button" onClick={() => setLearningProfile(current => ({ ...current, weekly_time: time }))} className={`rounded-2xl border px-3 py-3 text-sm font-semibold ${learningProfile.weekly_time === time ? "border-[#FF6B00] bg-orange-50 text-orange-800 dark:bg-orange-400/10 dark:text-orange-200" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}>{time === "more" ? "Plus de 2 h" : `${time} min`}</button>)}</div></div><div><p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Comment apprenez-vous le mieux ?</p><div className="grid gap-3 sm:grid-cols-3">{(["practice", "theory", "mixed"] as const).map(style => <button key={style} type="button" onClick={() => setLearningProfile(current => ({ ...current, preferred_style: style }))} className={`rounded-2xl border px-3 py-3 text-sm font-semibold ${learningProfile.preferred_style === style ? "border-[#FF6B00] bg-orange-50 text-orange-800 dark:bg-orange-400/10 dark:text-orange-200" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}>{style === "practice" ? "Pratique" : style === "theory" ? "Théorie" : "Un mélange des deux"}</button>)}</div></div></div>}
            {onboardingStep === 4 && <div><p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Quand souhaitez-vous voir des progrès concrets ?</p><div className="grid gap-3 sm:grid-cols-2">{(["none", "30", "90", "180"] as const).map(target => <button key={target} type="button" onClick={() => setLearningProfile(current => ({ ...current, target_date: target }))} className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${learningProfile.target_date === target ? "border-[#FF6B00] bg-orange-50 text-orange-800 dark:bg-orange-400/10 dark:text-orange-200" : "border-slate-200 text-slate-700 hover:border-orange-300 dark:border-slate-700 dark:text-slate-200"}`}>{target === "none" ? "Je n’ai pas d’échéance précise" : `Dans environ ${target} jours`}</button>)}</div><p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Cette information sert à ajuster le rythme proposé, pas à vous imposer un calendrier.</p></div>}
          </div>
          {error && <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
          <div className="mt-8 flex items-center justify-between gap-3"><button type="button" onClick={() => onboardingStep === 0 ? setOnboardingOpen(false) : setOnboardingStep(step => step - 1)} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" />Retour</button><button type="button" disabled={onboardingSaving} onClick={nextOnboardingStep} className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white hover:bg-[#e56000] disabled:opacity-60">{onboardingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : onboardingStep === onboardingSections.length - 1 ? "Terminer mon profil" : "Continuer"}{!onboardingSaving && <ArrowRight className="h-4 w-4" />}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="tess-auth relative flex min-h-screen bg-white dark:bg-slate-950">
      <label className="sr-only" htmlFor="auth-language">{t("app.language")}</label>
      <select id="auth-language" aria-label={t("app.language")} value={lang} onChange={(event) => setLang(event.target.value as Lang)} className="absolute right-5 top-5 z-20 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
         <option value="fr">FR · Français</option><option value="en">EN · English</option><option value="sw">SW · Kiswahili</option>
      </select>
      {/* ── Left panel (branding) ── */}
      <div className="tess-auth-visual relative hidden lg:flex lg:w-[52%] flex-col overflow-hidden">
        <div className="tess-auth-orbit tess-auth-orbit-one" aria-hidden="true" />
        <div className="tess-auth-orbit tess-auth-orbit-two" aria-hidden="true" />

        {/* top */}
        <div className="relative z-10 p-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/zentrix.avif" alt="Zentrix" className="h-10 w-10 object-contain" />
            <span className="text-sm font-bold uppercase tracking-[0.22em] text-white/70">Zentrix Academy</span>
          </Link>
        </div>

        {/* center content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 pb-10">
          <p className="tess-auth-eyebrow mb-4 text-xs font-bold uppercase tracking-[0.2em]">
            {t("auth.brandTagline")}
          </p>
          <h1 className="tess-display mb-6 text-4xl font-semibold leading-[1.13] text-white xl:text-5xl">
            {t("auth.headline")}<br />
            <span className="tess-auth-accent">{t("auth.headlineAccent")}</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            {t("auth.intro")}
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-4 gap-4">
            {stats.map(({ icon: Icon, value }, index) => (
              <div key={value} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <Icon className="tess-auth-accent mx-auto mb-2 h-5 w-5" />
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{t(`auth.stats.${index}`)}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6 transition-all duration-500">
            <p className="text-sm text-slate-300 italic leading-relaxed">"{t(`auth.testimonialTexts.${testimonialIdx}`)}"</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="tess-auth-avatar flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">
                {initials(testimonial.name)}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{testimonial.name}</p>
                <p className="text-xs text-slate-500">{t(`auth.testimonialRoles.${testimonialIdx}`)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* dots */}
        <div className="relative z-10 flex justify-center gap-2 pb-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setTestimonialIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === testimonialIdx ? "w-6 bg-[#FF6B00]" : "w-1.5 bg-white/20"}`}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 lg:hidden dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <img src="/zentrix.avif" alt="Zentrix" className="h-8 w-8 object-contain" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Zentrix Academy</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <ArrowLeft className="h-4 w-4" />
            {t("auth.back")}
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            {/* Back link (desktop) */}
            <Link to="/" className="mb-8 hidden lg:inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <ArrowLeft className="h-4 w-4" />
              {t("auth.backToSite")}
            </Link>

            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                 {mode === "login" ? t("auth.welcome") : t("auth.createAccountTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {mode === "login"
                  ? t("auth.loginDescription")
                  : t("auth.registerDescription")}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="mt-8 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    mode === m
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {m === "login" ? t("auth.loginTab") : t("auth.registerTab")}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("auth.fullName")}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("auth.namePlaceholder")}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? t("auth.minPassword") : t("auth.passwordPlaceholder")}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "register" && password && (
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map((i) => {
                      let score = 0;
                      if (password.length >= 8) score++;
                      if (/[A-Z]/.test(password)) score++;
                      if (/[0-9]/.test(password)) score++;
                      if (/[^A-Za-z0-9]/.test(password)) score++;
                      const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-400"];
                      return (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score - 1] : "bg-slate-200 dark:bg-slate-700"}`} />
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="tess-auth-submit flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}</>
                ) : mode === "login" ? t("auth.login") : t("auth.register")}
              </button>

              {/* Google OAuth placeholder */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2.5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <img src="/google-logo.png" alt="" className="h-5 w-5 object-contain" />
                )}
                {googleLoading ? t("auth.googleLoading") : t("auth.googleContinue")}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {mode === "login" ? `${t("auth.noAccount")} ` : `${t("auth.hasAccount")} `}
              <button
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="font-bold text-[#FF6B00] hover:underline"
              >
                {mode === "login" ? t("auth.signupFree") : t("auth.login")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
