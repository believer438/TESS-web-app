// Copie Zentrix Academy : src/pages/Dashboard.tsx
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, BookOpen, ChevronDown, Clock3, Cloud, Code2,
  Database, GraduationCap, Globe, Monitor, Phone, Search,
  Shield, TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface DashboardProps {
  onNavigate: (page: string, data?: unknown) => void;
  onOpenAI?:  () => void;
}

// ─── IntersectionObserver hook — triggers ONCE when element enters view ────────
function useInView(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Rolling-window reveal: photo slides in from its side within overflow-hidden ─
function PhotoReveal({
  from, delay = 0, children,
}: { from: "left" | "right"; delay?: number; children: React.ReactNode }) {
  const { ref, inView } = useInView(0.05);
  return (
    <div ref={ref} className="overflow-hidden">
      <div style={{
        transform: inView ? "translateX(0)" : from === "left" ? "translateX(-110%)" : "translateX(110%)",
        transition: `transform 1s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: "transform",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Smooth fade-in wrapper (opacity + tiny translateY only) ─────────────────
function Fade({
  children,
  className = "",
  delay = 0,
  from = "bottom",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right" | "none";
}) {
  const { ref, inView } = useInView();
  const off =
    from === "bottom" ? "translateY(24px)" :
    from === "left"   ? "translateX(-28px)" :
    from === "right"  ? "translateX(28px)" : "none";
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.85s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.85s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        opacity:   inView ? 1 : 0,
        transform: inView ? "none" : off,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// ─── Typewriter heading — writes text letter by letter on entry ───────────────
function Typewriter({
  text,
  as: Tag = "h2",
  className = "",
  speed = 36,
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  speed?: number;
  delay?: number;
}) {
  const { ref, inView } = useInView(0.12);
  const [shown, setShown]   = useState("");
  const [done, setDone]     = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text);
      setDone(true);
      return;
    }
    if (!inView) return;
    setShown("");
    setDone(false);
    let i = 0;
    let timer = 0;
    const step = () => {
      i += 1;
      setShown(text.slice(0, i));
      if (i < text.length) timer = window.setTimeout(step, speed);
      else setDone(true);
    };
    timer = window.setTimeout(step, delay * 1000 + speed);
    return () => window.clearTimeout(timer);
  }, [inView, text, speed, delay]);

  return (
    <div ref={ref}>
      <Tag className={className} style={{ whiteSpace: "pre-line" }}>
        {shown}
        {!done && inView && (
          <span style={{ animation: "blink .7s step-end infinite" }} className="ml-px">|</span>
        )}
      </Tag>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    tag: "Plateforme d'apprentissage continu",
    title: "Montez en\ncompétences.",
    subtitle: "Des parcours structurés, un assistant IA et un espace cours personnalisé — tout en un.",
    img: "/generated-landing/01-hero-learning.webp",
  },
  {
    tag: "Apprentissage tout au long de la vie",
    title: "Continuez\nd'apprendre.",
    subtitle: "Bibliothèque active, outils IA intégrés et programmes conçus pour rester en progression.",
    img: "/generated-landing/02-hero-collaboration.webp",
  },
  {
    tag: "Pratique. Transformateur.",
    title: "Vraies\ncompétences.",
    subtitle: "Une méthode basée sur des projets concrets — conçue pour progresser rapidement.",
    img: "/generated-landing/03-hero-library.webp",
  },
  {
    tag: "Un espace pour apprendre",
    title: "Trouvez votre\nprochaine idée.",
    subtitle: "Un environnement calme et inspirant pour lire, pratiquer et transformer votre curiosité en progrès.",
    img: "/generated-landing/04-hero-library-realistic.png",
  },
  {
    tag: "Compétences pour demain",
    title: "Comprenez la\ncybersécurité.",
    subtitle: "Explorez les réseaux, les outils et les bons réflexes avec des apprentissages concrets et progressifs.",
    img: "/generated-landing/05-hero-cybersecurity-realistic.png",
  },
  {
    tag: "Apprendre partout",
    title: "Votre savoir\nà portée de main.",
    subtitle: "Avancez à votre rythme depuis n'importe où, avec des contenus pensés pour votre quotidien.",
    img: "/generated-landing/06-hero-tablet-realistic.png",
  },
  {
    tag: "Votre parcours, dans vos mains",
    title: "Construisez votre\navenir avec Zentrix.",
    subtitle: "Retrouvez vos cours, vos ressources et votre assistant pédagogique dans un seul espace.",
    img: "/generated-landing/07-hero-zentrix-back-view.png",
  },
];

const FAQ_TABS = [
  { id: "students",      label: "Étudiants actuels" },
  { id: "professional",  label: "Cours professionnels" },
  { id: "partners",      label: "Partenaires & donateurs" },
  { id: "international", label: "Étudiants internationaux" },
];

const FAQS: Record<string, string[]> = {
  students: [
    "Comment accéder à mes cours ?",
    "Quel accompagnement est disponible si j'ai besoin d'aide ?",
    "Comment suivre ma progression ?",
    "Y a-t-il des sessions en direct, ou tout est pré-enregistré ?",
    "Que se passe-t-il si je prends du retard ?",
    "Puis-je changer de cours ou de programme ?",
  ],
  professional: [
    "Les programmes sont-ils reconnus par les entreprises ?",
    "Peut-on suivre les cours en dehors des heures de travail ?",
    "Y a-t-il des certifications à la fin du parcours ?",
    "Comment obtenir une facture pour mon employeur ?",
  ],
  partners: [
    "Comment devenir partenaire de Zentrix Academy ?",
    "Quels sont les avantages pour les entreprises partenaires ?",
    "Comment faire un don ou sponsoriser un apprenant ?",
  ],
  international: [
    "Les cours sont-ils disponibles en dehors de l'Afrique ?",
    "Les contenus sont-ils disponibles en anglais ?",
    "Comment s'inscrire depuis l'étranger ?",
  ],
};

const PROGRAMS = [
  { title: "Diplôme en Cybersécurité",          badge: "Programme populaire" },
  { title: "Bootcamp Cloud Computing",            badge: "Nouveau" },
  { title: "Data Science & Machine Learning",     badge: "Populaire" },
];

const TAGS = ["Intelligence Artificielle", "Science des Données", "Tech Bootcamp", "Full Stack", "MERN Stack"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate, onOpenAI }: DashboardProps) {
  const { t } = useLanguage();
  const [slide, setSlide]       = useState(() => Math.floor(Math.random() * SLIDES.length));
  const [faqTab, setFaqTab]     = useState("students");
  const [openFaq, setOpenFaq]   = useState<number | null>(0);
  const [query, setQuery]       = useState("");

  // Hero auto-advance
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setSlide(s => (s + 1) % SLIDES.length), 10000);
    return () => clearTimeout(t);
  }, [slide]);

  const s = SLIDES[slide];

  return (
    <>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      <div className="bg-white text-[#0f0f1a]">

        {/* ══════════════════════ 1 · HERO ══════════════════════════════════ */}
        <section
          className="relative flex min-h-[680px] flex-col overflow-hidden bg-[#151515] text-white sm:min-h-[720px] sm:h-[calc(100svh-85px)]"
        >
          {/* Background image — clean crossfade, no parallax */}
          {SLIDES.map((sl, i) => (
            <div
              key={sl.img}
              className="absolute inset-0"
              style={{
                opacity: i === slide ? 1 : 0,
                transition: "opacity 1.1s cubic-bezier(0.4,0,0.2,1)",
                willChange: "opacity",
              }}
            >
              <img src={sl.img} alt="" fetchPriority={i === slide ? "high" : "auto"} loading={i === slide ? "eager" : "lazy"} className="h-full w-full object-cover object-center" />
            </div>
          ))}

          {/* Fixed gradient overlay — does NOT move */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#101112]/78 via-[#151515]/55 to-[#151515]/12" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101112]/42 via-transparent to-[#101112]/8" />

          {/* Orange left accent */}
          <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[#d28a60] via-[#d28a60]/40 to-transparent" />

          {/* Content — the active slide stays in the layout so controls never overlap it. */}
          <div className="relative mx-auto flex w-full flex-col px-6 pb-8 pt-14 sm:flex-1 sm:px-10 sm:pb-10 sm:pt-20 lg:max-w-7xl lg:justify-center lg:px-12 lg:pb-14 lg:pt-14">

            {/* Per-slide text: each element animates independently */}
            {SLIDES.map((sl, i) => {
              const active = i === slide;
              return (
                <div
                  key={sl.title}
                  className={active
                    ? "relative flex w-full flex-col lg:w-[48%]"
                    : "absolute left-14 right-6 top-0 hidden flex-col lg:left-12 lg:right-[52%] sm:flex"}
                  style={{ pointerEvents: active ? "auto" : "none" }}
                >
                  {/* Tag line */}
                  <div
                    className="flex items-center gap-3"
                    style={{
                      opacity:    active ? 1 : 0,
                      transform:  active ? "none" : "translateY(8px)",
                      transition: active
                        ? "opacity 0.65s 0.04s ease, transform 0.65s 0.04s ease"
                        : "opacity 0.28s ease, transform 0.28s ease",
                    }}
                  >
                  <span className="h-px w-8 bg-[#d28a60]" />
                    <span data-brand-eyebrow className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e0a27c] sm:tracking-[0.28em]">{t(`landing.slides.${i}.tag`)}</span>
                  </div>

                  {/* Title */}
                  <h1
                    className="mt-5 max-w-[14ch] whitespace-pre-line text-[2.6rem] font-black leading-[1.02] tracking-[-0.04em] sm:text-[3.4rem] lg:text-[4.4rem]"
                    style={{
                      opacity:    active ? 1 : 0,
                      transform:  active ? "none" : "translateY(16px)",
                      transition: active
                        ? "opacity 0.78s 0.16s ease, transform 0.78s 0.16s ease"
                        : "opacity 0.28s ease, transform 0.28s ease",
                    }}
                  >
                    {t(`landing.slides.${i}.title`)}
                  </h1>

                  {/* Subtitle */}
                  <p
                    className="mt-4 max-w-[46ch] text-[15px] leading-7 text-slate-300 sm:text-base"
                    style={{
                      opacity:    active ? 1 : 0,
                      transform:  active ? "none" : "translateY(16px)",
                      transition: active
                        ? "opacity 0.78s 0.30s ease, transform 0.78s 0.30s ease"
                        : "opacity 0.28s ease, transform 0.28s ease",
                    }}
                  >
                    {t(`landing.slides.${i}.subtitle`)}
                  </p>
                </div>
              );
            })}

            {/* Static bottom area — buttons + dots, NO slide transition */}
            <div className="relative mt-8 w-full px-0 sm:mt-8 lg:w-[48%]">
              {/* Action buttons — always visible, never fade or move */}
              <div className="mb-5 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate("courses")}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-[#181818] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#f3eee9] hover:gap-3 active:scale-95"
                >
                  {t("landing.viewCourses")} <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onOpenAI ? onOpenAI() : onNavigate("document-ai")}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/35 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition-all hover:border-white/70 hover:bg-white/10"
                >
                  TESS AI
                </button>
              </div>

              {/* Slide dots */}
              <div className="flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Afficher la présentation ${i + 1}`}
                    aria-current={i === slide ? "true" : undefined}
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width:      i === slide ? 28 : 10,
                      background: i === slide ? "#e0a27c" : "rgba(255,255,255,0.35)",
                    }}
                  />
                ))}
                <span className="ml-3 font-mono text-[11px] text-white/35">
                  {String(slide + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

        </section>

        {/* ══════════════════════ 2 · À PROPOS ══════════════════════════════ */}
        <section
          className="flex sm:min-h-[calc(100vh-85px)] items-center bg-white py-16 sm:py-20"
        >
          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-6 sm:px-10 lg:grid-cols-2">

            {/* Photos — 2 photos empilées avec badge et labels */}
            <div className="relative hidden w-[420px] flex-shrink-0 lg:block">

              {/* ── "Zentrix" en haut à gauche ─────────────────────────── */}
              <span className="mb-3 block text-[1.65rem] font-black tracking-tight text-[#0f0f1a]">
                Zentrix
              </span>

              <div className="flex flex-col gap-4">
                {/* Photo principale — grande */}
                <PhotoReveal from="left" delay={0}>
                  <div className="h-[260px] w-full overflow-hidden rounded-2xl shadow-2xl">
                    <img
                      src="/generated-landing/04-about-online-class.webp"
                      alt="Cours en ligne"
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                </PhotoReveal>

                {/* Photo secondaire — plus petite, décalée à droite */}
                <PhotoReveal from="right" delay={0.18}>
                  <div className="ml-auto h-[180px] w-[300px] overflow-hidden rounded-2xl shadow-xl">
                    <img
                      src="/generated-landing/05-about-books.webp"
                      alt="Bibliothèque Zentrix"
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                </PhotoReveal>
              </div>

              {/* ── Badge GraduationCap sur le coin bas-gauche de la 1ère photo ── */}
              <div className="absolute left-4 top-[calc(3rem+260px-28px)] z-20 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#FF6B00] shadow-xl">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>

              {/* ── "Academy" en bas à droite ────────────────────────────── */}
              <span className="mt-3 block text-right text-[1.65rem] font-black tracking-tight text-[#FF6B00]">
                Academy
              </span>
            </div>

            {/* Mobile single photo */}
            <div className="block overflow-hidden rounded-xl lg:hidden">
              <img src="/generated-landing/06-about-mobile-access.webp" alt="Zentrix et son assistant pédagogique" className="h-56 w-full object-cover" />
            </div>

            {/* Text — right */}
            <Fade from="right" delay={0.08}>
              <div className="mb-5 flex items-center gap-2">
                <img src="/zentrix.avif" alt="Zentrix" className="h-8 w-8 object-contain" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-800">Zentrix Academy</p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-400">Technology Institute</p>
                </div>
              </div>

              <Typewriter
                text={t("landing.aboutTitle")}
                className="text-[2.3rem] font-black leading-tight text-[#0f0f1a]"
                speed={36}
              />

              <div className="mt-3 h-[3px] w-12 rounded bg-[#FF6B00]" />

              <p className="mt-5 text-sm font-semibold leading-7 text-slate-700">
                {t("landing.aboutLead")}
              </p>
              <p className="mt-3 max-w-[52ch] text-sm leading-7 text-slate-500">
                {t("landing.aboutText")} <strong className="text-slate-700">{t("landing.locationIsNoLimit")}</strong>
              </p>

              <button
                onClick={() => onNavigate("courses")}
                className="mt-7 inline-flex items-center gap-2 border-b-2 border-[#FF6B00] pb-0.5 text-sm font-bold text-[#FF6B00] transition-all hover:gap-3"
              >
                {t("landing.learnMore")} <ArrowRight className="h-4 w-4" />
              </button>
            </Fade>
          </div>
        </section>

        {/* ══════════════════════ 2.5 · PARCOURS ════════════════════════════ */}
        <section className="bg-white py-20">
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">

            {/* En-tête */}
            <Fade from="bottom" className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px w-8 bg-[#FF6B00]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#FF6B00]">{t("landing.advancedPaths")}</span>
                </div>
                <h2 className="text-[2rem] font-black leading-tight text-[#0f0f1a]">
                  {t("landing.trustedPaths")}
                </h2>
              </div>
              <button
                onClick={() => onNavigate("courses")}
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 transition-colors hover:text-[#FF6B00]"
              >
                {t("landing.viewAllCourses")} <ArrowRight className="h-4 w-4" />
              </button>
            </Fade>

            {/* Grille 4×2 */}
            <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { Icon: Globe,    dur: "30 Jours",    n: "01", title: "Création de contenu digital & monétisation",     desc: "Programme pratique basé sur des projets réels et une application immédiate dans la carrière." },
                { Icon: Cloud,    dur: "12 Semaines", n: "02", title: "Bootcamp cloud computing",                        desc: "Programme pratique basé sur des projets réels et une application immédiate dans la carrière." },
                { Icon: Code2,    dur: "16 Semaines", n: "03", title: "Développement backend avec Node.js",              desc: "Programme pratique basé sur des projets réels et une application immédiate dans la carrière." },
                { Icon: Monitor,  dur: "16 Semaines", n: "04", title: "Maîtrise du développement frontend",             desc: "Programme pratique basé sur des projets réels et une application immédiate dans la carrière." },
                { Icon: Database, dur: "16 Semaines", n: "05", title: "Ingénierie backend avec Python",                  desc: "Programme pratique basé sur des projets réels et une application immédiate dans la carrière." },
                { Icon: TrendingUp,dur:"20 Semaines", n: "06", title: "Data science & machine learning",                desc: "Programme pratique basé sur des projets réels et une application immédiate dans la carrière." },
                { Icon: Shield,   dur: "12 Semaines", n: "07", title: "Hacking éthique & bug bounty",                   desc: "Programme pratique basé sur des projets réels et une application immédiate dans la carrière." },
                { Icon: Globe,    dur: "24 Semaines", n: "08", title: "Développement full stack",                        desc: "Programme pratique basé sur des projets réels et une application immédiate dans la carrière." },
              ].map(({ Icon, dur, n, title, desc }, i) => (
                <Fade key={n} from="bottom" delay={i * 0.04}>
                    <button
                    type="button"
                    className="group relative flex h-full min-h-[270px] w-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#a65321]/30 hover:shadow-xl"
                    onClick={() => onNavigate("courses", title)}
                  >
                    {/* Icône */}
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#a65321]/15 bg-gradient-to-br from-white to-[#f1e4d9] text-[#9b552c] shadow-[0_3px_0_#ddcabc,0_7px_12px_rgba(85,52,31,.1)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_5px_0_#ddcabc,0_10px_15px_rgba(85,52,31,.16)]">
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Durée */}
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#9b552c]">
                      {dur}
                    </p>

                    {/* Titre */}
                    <h3 className="mb-3 text-[15px] font-black leading-snug text-[#171717]">
                      {title}
                    </h3>

                    {/* Description */}
                    <p className="mb-6 text-[12px] leading-6 text-slate-500">
                      {desc}
                    </p>

                    {/* Explorer */}
                    <div className="mt-auto flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#9b552c] transition-all duration-300 group-hover:gap-2.5">
                      Explorer <ArrowRight className="h-3.5 w-3.5" />
                    </div>

                    {/* Numéro décoratif */}
                    <span aria-hidden="true" className="absolute bottom-4 right-5 text-[3.2rem] font-black leading-none text-slate-100 select-none transition-colors duration-300 group-hover:text-[#f1e6de]">
                      {n}
                    </span>
                    </button>
                </Fade>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════ 3 · PROGRAMME ═════════════════════════════ */}
        <section
          className="relative flex sm:min-h-[calc(100vh-85px)] items-center overflow-hidden bg-[#f7f7f5] py-16 sm:py-20"
        >
          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-6 sm:px-10 lg:grid-cols-2">

            {/* Left — search + programs */}
            <Fade from="left">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#a65321]">{t("landing.nextStep")}</p>
              <h2 className="max-w-xl text-4xl font-black leading-[1.08] tracking-tight text-[#151515] sm:text-5xl">
                {t("landing.findProgram")}
              </h2>
              <p className="mt-4 max-w-[46ch] text-sm leading-7 text-slate-500">
                {t("landing.programLead")}
              </p>

              <div className="mt-7 flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-[#a65321] focus-within:ring-4 focus-within:ring-[#a65321]/10">
                <div className="flex items-center px-4 text-[#8b6b58]">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && onNavigate("courses", query)}
                  aria-label={t("catalogue.searchPlaceholder")}
                  placeholder={t("landing.findProgramPlaceholder")}
                  className="h-12 flex-1 bg-transparent pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-medium text-slate-500">{t("landing.explore")}</span>
                {TAGS.map(t => (
                  <button key={t} onClick={() => { setQuery(t); onNavigate("courses", t); }} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#a65321]/40 hover:bg-[#a65321]/5 hover:text-[#8b431b] focus-visible:ring-2 focus-visible:ring-[#a65321]">
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-7 space-y-2.5">
                {PROGRAMS.map(p => (
                  <button
                    key={p.title}
                    onClick={() => onNavigate("courses", p.title)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-200/90 bg-white px-4 py-4 text-left shadow-[0_2px_8px_rgba(20,20,20,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a65321]/40 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#a65321]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4eee8] transition-colors group-hover:bg-[#eee1d5]">
                      <BookOpen className="h-5 w-5 text-[#9b552c]" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="mb-1 inline-block rounded-full bg-[#f5eee8] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#88502f]">
                        {p.badge}
                      </span>
                      <p className="text-sm font-bold text-slate-800">{p.title}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-[#9b552c]" />
                  </button>
                ))}
              </div>
            </Fade>

            {/* Right — photo collage */}
            <Fade from="right" delay={0.1} className="relative mx-auto mt-2 grid h-[330px] w-full max-w-xl grid-cols-2 gap-4 sm:h-[390px] lg:mt-0 lg:h-[510px] lg:max-w-[540px] lg:block">
              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/80 bg-white shadow-[0_18px_45px_rgba(30,30,30,.12)] lg:absolute lg:left-0 lg:top-0 lg:h-[250px] lg:w-[245px] lg:rounded-[1.5rem]">
                <img src="/generated-landing/07-program-coding.webp" alt="Apprenant en formation sur ordinateur" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                <div className="absolute inset-x-3 bottom-3 rounded-lg bg-black/60 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur-sm">Apprendre avec les bons outils</div>
              </div>
              <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/80 bg-white shadow-[0_18px_45px_rgba(30,30,30,.12)] lg:absolute lg:bottom-0 lg:right-0 lg:h-[410px] lg:w-[300px] lg:rounded-[1.5rem]">
                <img src="/generated-landing/08-program-books.webp" alt="Étudiante concentrée sur son apprentissage" className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105" />
                <div className="absolute inset-x-3 bottom-3 rounded-lg bg-black/60 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur-sm">Un parcours qui vous ressemble</div>
              </div>
              <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-white/15 bg-[#171717]/95 px-5 py-3 text-center shadow-2xl sm:bottom-8 lg:bottom-[154px] lg:left-[205px] lg:translate-x-0 lg:px-6 lg:py-4">
                <p className="text-sm font-bold text-white">À vous de choisir</p>
                <p className="mt-0.5 whitespace-nowrap text-[11px] font-medium text-white/75">{t("landing.nextPath")}</p>
              </div>
            </Fade>
          </div>
        </section>

        {/* ══════════════════════ 4 · CAMPUS STORY ═════════════════════════ */}
        <section
          className="flex min-h-[calc(100vh-85px)] flex-col bg-[#171717] text-white"
        >
          {/* Photos */}
          <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
              {[
              { src: "/generated-landing/09-campus-lab.webp",     label: "Nos cours" },
              { src: "/generated-landing/10-campus-mentor.webp", label: "Data Science" },
            ].map(({ src, label }) => (
              <div key={src} className="group relative overflow-hidden" style={{ minHeight: "45vh" }}>
                <img
                  src={src}
                  alt={label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/85 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 flex w-full items-center justify-between p-6">
                  <Typewriter text={label} as="h3" className="text-base font-black uppercase tracking-wide" speed={55} />
                  <button
                    onClick={() => onNavigate("courses")}
                    className="flex h-9 w-9 items-center justify-center bg-[#FF6B00] transition hover:bg-[#e56000]"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <Fade from="bottom" className="border-t border-white/10">
            <div className="mx-auto grid max-w-7xl grid-cols-2 px-6 py-8 sm:px-10 md:grid-cols-4">
              {[
                { Icon: BookOpen,   l: "Cours et parcours" },
                { Icon: GraduationCap, l: "Apprentissage guidé" },
                { Icon: TrendingUp, l: "Progression personnelle" },
                { Icon: Clock3,     l: "À votre rythme" },
              ].map(({ Icon, l }) => (
                <div key={l} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,.12),0_4px_10px_rgba(0,0,0,.2)]"><Icon className="h-5 w-5 flex-shrink-0 text-[#d28a60]" /></span>
                  <div>
                    <p className="text-xs font-semibold text-white sm:text-sm">{l}</p>
                  </div>
                </div>
              ))}
            </div>
          </Fade>
        </section>

        {/* ══════════════════════ 5 · BARRIÈRES ════════════════════════════ */}
        <section
          className="flex sm:min-h-[calc(100vh-85px)] flex-col items-stretch lg:flex-row"
        >
          {/* Orange side */}
              <div className="relative hidden w-[45%] flex-col justify-center overflow-hidden bg-[#8d4c2a] p-12 text-white lg:flex">
            <Fade from="left">
              <Typewriter
                text={"Briser les barrières\nà l'éducation"}
                className="text-[2rem] font-black leading-tight text-white"
                speed={30}
              />
              <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="group relative overflow-hidden rounded-2xl border border-white/25 shadow-xl">
                  <img src="/generated-landing/11-barrier-access.webp" alt="Apprenant étudiant avec un ordinateur" className="h-40 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/50 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">Se former partout</span>
                </div>
                  <div className="group relative overflow-hidden rounded-2xl border border-white/25 shadow-xl">
                  <img src="/generated-landing/12-barrier-laptop.webp" alt="Espace numérique de formation" className="h-40 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/50 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">Avancer à son rythme</span>
                </div>
              </div>
            </Fade>
          </div>

          {/* White side */}
          <div className="flex flex-1 flex-col justify-center bg-white p-8 lg:p-16">
            <Fade from="right">
              {/* Mobile heading — only visible when orange panel is hidden */}
              <h2 className="mb-6 text-[1.9rem] font-black leading-tight text-[#0f0f1a] lg:hidden">
                Briser les barrières<br />à l'éducation
              </h2>
              <p className="max-w-[54ch] text-sm leading-7 text-slate-600">
                Chez Zentrix Academy, nous nous engageons à supprimer les barrières financières
                et à rendre l'éducation accessible à tous.
              </p>
              <p className="mt-4 max-w-[54ch] text-sm leading-7 text-slate-600">
                En tant qu'institut en ligne, nous permettons aux apprenants d'étudier depuis
                n'importe où.{" "}
                <strong className="text-slate-800">La localisation géographique n'est jamais une limite.</strong>{" "}
                Notre plateforme flexible propose des horaires adaptés et soutient des forums
                interactifs où{" "}
                <strong className="text-slate-800">les apprenants peuvent collaborer et progresser ensemble.</strong>
              </p>

              <button
                onClick={() => onNavigate("courses")}
                className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#FF6B00] transition-all hover:gap-3"
              >
                Voir comment s'inscrire <ArrowRight className="h-4 w-4" />
              </button>

              <div className="mt-10 flex items-center gap-4 border-t border-slate-100 pt-8">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-[#a65321]/15 bg-gradient-to-br from-white to-[#f1e4d9] text-[#9b552c] shadow-[0_4px_0_#ddcabc,0_8px_12px_rgba(85,52,31,.12)]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                <p className="text-sm text-slate-500">{t("landing.admissions")}</p>
                  <p className="font-black text-slate-900">
                    {t("landing.contactUs")} <span className="text-[#FF6B00]">{t("landing.viaPlatform")}</span>
                  </p>
                </div>
                <div className="ml-auto hidden items-center gap-2 sm:flex">
                  <img src="/zentrix.avif" alt="Zentrix" className="h-8 w-8 object-contain" />
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Zentrix</p>
                    <p className="text-[9px] text-slate-400">Academy</p>
                  </div>
                </div>
              </div>
            </Fade>
          </div>
        </section>

        {/* Closing CTA — reuses the existing course navigation. */}
        <section className="bg-[#f5f2ee] px-6 py-16 sm:px-10 sm:py-20">
          <Fade from="bottom" className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#181818] px-7 py-12 text-center text-white shadow-xl sm:px-14 sm:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-[#a65321]/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.24em] text-[#e0a27c]">Zentrix Academy</p>
            <h2 className="relative mx-auto mt-4 max-w-[20ch] text-3xl font-black leading-tight tracking-tight sm:text-4xl">{t("landing.ready")}</h2>
            <p className="relative mx-auto mt-4 max-w-[52ch] text-sm leading-7 text-white/70">{t("landing.exploreTraining")}</p>
            <button onClick={() => onNavigate("courses")} className="relative mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#181818] transition-all hover:-translate-y-0.5 hover:bg-[#f3eee9] hover:gap-3 focus-visible:outline-white">
              {t("landing.browseTraining")} <ArrowRight className="h-4 w-4" />
            </button>
          </Fade>
        </section>

        {/* ══════════════════════ 6 · FAQ ═══════════════════════════════════ */}
        <section
          className="flex sm:min-h-[calc(100vh-85px)] items-center bg-white py-16 sm:py-20"
        >
          <div className="mx-auto grid w-full max-w-7xl items-start gap-14 px-6 sm:px-10 lg:grid-cols-[1.15fr_0.85fr]">

            {/* Left */}
            <Fade from="left">
              <Typewriter
                text={t("landing.faq")}
                className="text-[2.3rem] font-black leading-tight text-[#0f0f1a]"
                speed={38}
              />

              <div className="mt-6 flex flex-wrap gap-2">
                {FAQ_TABS.map((tab, tabIndex) => (
                  <button
                    key={tab.id}
                    aria-pressed={faqTab === tab.id}
                    onClick={() => { setFaqTab(tab.id); setOpenFaq(null); }}
                    className={`rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all ${
                      faqTab === tab.id
                        ? "border-[#FF6B00] bg-[#FF6B00] text-white"
                        : "border-slate-200 text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00]"
                    }`}
                  >
                    {t(`landing.faqTabs.${tabIndex}`)}
                  </button>
                ))}
              </div>

              <div className="mt-6 divide-y divide-slate-100">
                {(FAQS[faqTab] ?? []).map((_, i) => {
                  const q = t(`landing.faqs.${faqTab}.${i}`);
                  return (
                  <div key={i}>
                    <button
                      aria-expanded={openFaq === i}
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex w-full items-center justify-between py-4 text-left"
                    >
                      <span className={`text-sm font-semibold transition-colors ${openFaq === i ? "text-[#FF6B00]" : "text-slate-800 hover:text-[#FF6B00]"}`}>
                        {q}
                      </span>
                      <span className={`ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all ${openFaq === i ? "border-[#FF6B00] bg-[#FF6B00] text-white" : "border-slate-200 text-slate-400"}`}>
                        {openFaq === i
                          ? <ChevronDown className="h-3.5 w-3.5" style={{ transform: "rotate(180deg)" }} />
                          : <ArrowRight className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                    {openFaq === i && (
                      <p className="pb-4 text-sm leading-7 text-slate-500">
                        {t("landing.faqAnswer")}
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>

              <button
                onClick={() => onNavigate("courses")}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#FF6B00] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#e56000]"
              >
                {t("landing.viewAllCourses")} <ArrowRight className="h-4 w-4" />
              </button>
            </Fade>

            {/* Right — photo */}
            <Fade from="right" delay={0.1} className="hidden lg:block">
              <div className="overflow-hidden shadow-2xl">
                <img
                  src="/generated-landing/13-faq-study.webp"
                  alt="Assistant pédagogique Zentrix"
                  className="h-[570px] w-full object-cover object-top transition-transform duration-700 ease-out hover:scale-105"
                />
              </div>
            </Fade>
          </div>
        </section>

      </div>
    </>
  );
}

