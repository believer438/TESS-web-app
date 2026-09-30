// Copie Zentrix Academy : src/pages/AboutPage.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, Clock3,
  GraduationCap, Globe, Heart, Lightbulb, Medal, Shield,
  Sparkles, Target, TrendingUp, Users, Zap,
} from "lucide-react";

// ─── Reusable animation hooks ────────────────────────────────────────────────
function useInView(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Fade({
  children, className = "", delay = 0,
  from = "bottom",
}: {
  children: React.ReactNode; className?: string; delay?: number;
  from?: "bottom" | "left" | "right" | "none";
}) {
  const { ref, inView } = useInView();
  const off = from === "bottom" ? "translateY(24px)" : from === "left" ? "translateX(-28px)" : from === "right" ? "translateX(28px)" : "none";
  return (
    <div ref={ref} className={className}
      style={{
        transition: `opacity 0.85s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.85s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        opacity: inView ? 1 : 0, transform: inView ? "none" : off, willChange: "opacity, transform",
      }}
    >{children}</div>
  );
}

function Typewriter({ text, as: Tag = "h2", className = "", speed = 36, delay = 0 }: {
  text: string; as?: "h1" | "h2" | "h3"; className?: string; speed?: number; delay?: number;
}) {
  const { ref, inView } = useInView(0.12);
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    let i = 0;
    const step = () => { i += 1; setShown(text.slice(0, i)); if (i < text.length) window.setTimeout(step, speed); else setDone(true); };
    window.setTimeout(step, delay * 1000 + speed);
  }, [inView, text, speed, delay]);
  return (
    <div ref={ref}>
      <Tag className={className} style={{ whiteSpace: "pre-line" }}>
        {shown}{!done && inView && <span style={{ animation: "blink .7s step-end infinite" }} className="ml-px">|</span>}
      </Tag>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const TEAM = [
  {
    name: "Dr. Amara Diallo",
    role: "Fondateur & Directeur pédagogique",
    bio: "Docteur en Informatique, 12 ans d'expérience dans l'éducation en ligne. Ancien enseignant à l'UCAD.",
    initials: "AD",
    color: "from-[#FFB347] to-[#FF6B00]",
  },
  {
    name: "Fatoumata Koné",
    role: "Directrice de l'expérience apprenant",
    bio: "Spécialiste en ingénierie pédagogique et design de l'apprentissage. Passionnée par l'accessibilité.",
    initials: "FK",
    color: "from-blue-400 to-indigo-600",
  },
  {
    name: "Ibrahima Sow",
    role: "Responsable Technologie & IA",
    bio: "Ingénieur full-stack et chercheur en IA appliquée à l'éducation. 8 ans en développement produit.",
    initials: "IS",
    color: "from-emerald-400 to-teal-600",
  },
  {
    name: "Aïssatou Ndiaye",
    role: "Responsable Partenariats & Entreprises",
    bio: "Ancienne consultante RH. Développe des ponts entre les apprenants et les entreprises du secteur tech.",
    initials: "AN",
    color: "from-purple-400 to-violet-600",
  },
];

const VALUES = [
  {
    Icon: Globe,
    title: "Accessibilité universelle",
    desc: "L'éducation de qualité n'a pas de frontières. Chaque apprenant, où qu'il soit en Afrique ou dans le monde, mérite d'accéder aux meilleurs contenus.",
  },
  {
    Icon: Medal,
    title: "Excellence pédagogique",
    desc: "Nos contenus sont conçus par des experts, validés par l'industrie et constamment mis à jour pour rester au niveau des dernières évolutions technologiques.",
  },
  {
    Icon: Heart,
    title: "Bienveillance & communauté",
    desc: "Nous croyons en un apprentissage humain. Chaque apprenant est soutenu, encouragé et accompagné par une communauté de pairs et de mentors engagés.",
  },
  {
    Icon: Zap,
    title: "Innovation continue",
    desc: "L'intégration de l'IA dans nos outils pédagogiques n'est pas un gadget — c'est notre façon de personnaliser chaque parcours pour maximiser la progression.",
  },
];

const METHOD_STEPS = [
  {
    n: "01",
    Icon: Target,
    title: "Évaluation initiale",
    desc: "Un bilan de compétences personnalisé pour identifier votre niveau de départ et définir le parcours le plus adapté à vos objectifs.",
  },
  {
    n: "02",
    Icon: BookOpen,
    title: "Contenu structuré",
    desc: "Des modules progressifs, des vidéos courtes et percutantes, des exercices pratiques — conçus pour apprendre efficacement sans se perdre.",
  },
  {
    n: "03",
    Icon: Brain,
    title: "Pratique & projets réels",
    desc: "Chaque compétence est ancrée dans un projet concret. Vous ne mémorisez pas — vous faites, vous construisez, vous comprenez.",
  },
  {
    n: "04",
    Icon: Sparkles,
    title: "IA & accompagnement",
    desc: "Votre assistant IA personnel répond à vos questions 24h/7j. Il connaît votre progression et s'adapte en temps réel à vos lacunes.",
  },
];

const CURRENT_YEAR = new Date().getFullYear();

const STATS = [
  { v: String(CURRENT_YEAR), l: "Depuis notre lancement", Icon: GraduationCap },
  { v: "5 000+", l: "Apprenants formés",  Icon: Users },
  { v: "20+",  l: "Parcours disponibles", Icon: BookOpen },
  { v: "95%",  l: "Taux de satisfaction", Icon: TrendingUp },
];

const PARTNERS = [
  "Microsoft Africa", "Orange Digital Center", "Sonatel Academy",
  "USAID EdTech", "AFD Formation", "Google for Education",
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      <div className="bg-white text-[#0f0f1a]">

        {/* ══ 1 · HERO ═══════════════════════════════════════════════════════ */}
        <section
          className="relative flex sm:min-h-[calc(100vh-85px)] flex-col overflow-hidden bg-[#0a0c15] text-white"
        >
          <img src="/bibliotheque.jpeg" alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060910]/95 via-[#060910]/75 to-transparent" />
          <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[#FF6B00] via-[#FF6B00]/40 to-transparent" />

          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(255,107,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,0,1) 1px,transparent 1px)", backgroundSize: "60px 60px" }}
          />

          <div className="relative mx-auto flex flex-1 flex-col justify-center w-full max-w-7xl px-6 py-14 sm:px-10 sm:py-24">
            <Fade from="bottom">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#FF6B00]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#FF6B00]">À propos de Zentrix Academy</span>
              </div>

              <h1 className="mt-6 max-w-[18ch] text-[2.8rem] font-black leading-[1.05] tracking-tight sm:text-[3.8rem] lg:text-[4.8rem]">
                Former les talents<br />
                <span className="text-[#FF6B00]">de demain.</span>
              </h1>

              <p className="mt-6 max-w-[54ch] text-[15px] leading-8 text-slate-300">
                Zentrix Academy est une plateforme d'apprentissage en ligne africaine,
                fondée sur une conviction simple : <strong className="text-white">la qualité de l'éducation ne devrait
                jamais dépendre de la géographie ou des ressources financières.</strong>
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/courses")}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FF6B00] px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#e56000] hover:gap-3"
                >
                  Voir les cours <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/login?mode=register")}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-7 py-3.5 text-sm font-bold text-white transition-all hover:border-[#FF6B00] hover:text-[#FF6B00]"
                >
                  Rejoindre gratuitement
                </button>
              </div>
            </Fade>

          </div>

          {/* Stats strip */}
          <div className="relative border-t border-white/10">
            <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-10 md:grid-cols-4">
              {STATS.map(({ v, l, Icon }) => (
                <div key={l} className="flex items-center gap-2 py-4 pr-3 sm:gap-3 sm:py-5 sm:pr-6">
                  <Icon className="h-4 w-4 flex-shrink-0 text-[#FF6B00] sm:h-5 sm:w-5" />
                  <div>
                    <p className="text-base font-black text-white sm:text-xl">{v}</p>
                    <p className="text-[10px] text-slate-400 sm:text-[11px]">{l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ 2 · NOTRE HISTOIRE ══════════════════════════════════════════════ */}
        <section
          className="flex sm:min-h-[calc(100vh-85px)] items-center bg-white py-16"
        >
          <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-6 sm:px-10 lg:grid-cols-2">
            {/* Left */}
            <Fade from="left">
              <div className="flex items-center gap-2 mb-5">
                <img src="/zentrix.avif" alt="Zentrix" className="h-8 w-8 object-contain" />
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Notre histoire</p>
              </div>

              <Typewriter text={"D'une idée à une\ncommunauté d'apprenants"} className="text-[2.2rem] font-black leading-tight text-[#0f0f1a]" speed={32} />
              <div className="mt-3 h-[3px] w-12 rounded bg-[#FF6B00]" />

              <p className="mt-6 text-sm leading-8 text-slate-600">
                Zentrix Academy est née en <strong>{CURRENT_YEAR}</strong> de la frustration d'un groupe d'enseignants
                et de professionnels tech africains : pourquoi les apprenants du continent
                devaient-ils se contenter de contenus non adaptés à leurs réalités, en devises
                inaccessibles, sans accompagnement local ?
              </p>
              <p className="mt-4 text-sm leading-8 text-slate-600">
                La réponse : construire une plateforme <strong>pensée pour l'Afrique</strong>,
                avec des instructeurs locaux, des cas pratiques ancrés dans le contexte africain,
                et des prix adaptés aux réalités économiques de notre continent.
              </p>
              <p className="mt-4 text-sm leading-8 text-slate-600">
                Aujourd'hui, plus de <strong>5 000 apprenants</strong> — du Sénégal au Kenya,
                du Maroc à la Côte d'Ivoire — apprennent, progressent et accèdent à de
                meilleures opportunités professionnelles grâce à Zentrix.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {["Dakar", "Abidjan", "Nairobi", "Casablanca", "Lagos", "Accra"].map(city => (
                  <span key={city} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]" /> {city}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/5 px-3 py-1 text-xs font-semibold text-[#FF6B00]">
                  + 20 villes
                </span>
              </div>
            </Fade>

            {/* Right — photo collage 2×2 */}
            <Fade from="right" delay={0.1} className="relative hidden lg:block">
              <div className="flex gap-3">

                {/* ── Left column ─────────────────────────────────────────── */}
                <div className="flex flex-col gap-3">
                  {/* "Zentrix" label above left photos */}
                  <span className="text-[1.55rem] font-black tracking-tight text-[#0f0f1a]">
                    Zentrix
                  </span>
                  {/* Top-left photo */}
                  <div className="h-[210px] w-[215px] overflow-hidden shadow-xl">
                    <img src="/etudiant ordinateur.avif" alt="Étudiant" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                  </div>
                  {/* Bottom-left photo (new) */}
                  <div className="h-[195px] w-[215px] overflow-hidden shadow-xl">
                    <img src="/etudiant-data-science.webp" alt="Data science" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                  </div>
                </div>

                {/* ── Right column — offset down ───────────────────────────── */}
                <div className="flex flex-col gap-3 mt-14">
                  {/* Top-right photo (new) */}
                  <div className="h-[195px] w-[215px] overflow-hidden shadow-xl">
                    <img src="/cours.jpg" alt="Cours" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                  </div>
                  {/* Bottom-right photo */}
                  <div className="h-[210px] w-[215px] overflow-hidden shadow-xl">
                    <img src="/etudiante.jpg" alt="Étudiante" className="h-full w-full object-cover object-top transition-transform duration-700 hover:scale-105" />
                  </div>
                  {/* "Academy" label below right photos */}
                  <span className="text-[1.55rem] font-black tracking-tight text-[#FF6B00]">
                    Academy
                  </span>
                </div>
              </div>

              {/* Orange badge — floats between the two columns */}
              <div className="absolute left-[204px] top-[228px] z-10 bg-[#FF6B00] px-4 py-3 shadow-xl">
                <p className="text-xl font-black text-white">{CURRENT_YEAR}</p>
                <p className="text-[10px] font-semibold text-white/80">Fondée à Dakar</p>
              </div>
            </Fade>
          </div>
        </section>

        {/* ══ 3 · NOTRE MÉTHODE ══════════════════════════════════════════════ */}
        <section
          className="flex sm:min-h-[calc(100vh-85px)] items-center bg-[#f6f7f9] py-16"
        >
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
            <Fade from="bottom" className="mb-12 text-center">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Notre approche</p>
              <Typewriter text="Une méthode qui fait vraiment progresser" className="text-[2.2rem] font-black leading-tight text-[#0f0f1a]" speed={30} />
              <p className="mx-auto mt-4 max-w-[56ch] text-sm leading-7 text-slate-500">
                Nous avons conçu notre méthode pédagogique en partenariat avec des experts
                de l'industrie et des neurosciences de l'apprentissage.
              </p>
            </Fade>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {METHOD_STEPS.map(({ n, Icon, title, desc }, i) => (
                <Fade key={n} from="bottom" delay={i * 0.08}>
                  <div className="group relative flex h-full flex-col bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-[2.5rem] font-black leading-none text-slate-100 select-none">{n}</span>
                      <div className="flex h-10 w-10 items-center justify-center bg-[#FF6B00]/10 text-[#FF6B00] transition-colors group-hover:bg-[#FF6B00] group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-sm font-black text-slate-900">{title}</h3>
                    <p className="text-xs leading-6 text-slate-500">{desc}</p>
                    <div className="mt-4 h-0.5 w-0 bg-[#FF6B00] transition-all duration-500 group-hover:w-full" />
                  </div>
                </Fade>
              ))}
            </div>

            <Fade from="bottom" delay={0.3} className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {[
                "Vidéos courtes",
                "Projets pratiques",
                "Quiz adaptatifs",
                "Assistance IA 24/7",
                "Certificats reconnus",
                "Forums communautaires",
              ].map(tag => (
                <div key={tag} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#FF6B00]" />
                  {tag}
                </div>
              ))}
            </Fade>
          </div>
        </section>

        {/* ══ 4 · NOS VALEURS ════════════════════════════════════════════════ */}
        <section
          className="flex sm:min-h-[calc(100vh-85px)] flex-col bg-[#0f0f1a] py-16 text-white"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 sm:px-10">
            <Fade from="bottom" className="mb-12">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Ce qui nous guide</p>
              <Typewriter text="Nos valeurs fondamentales" className="text-[2.2rem] font-black leading-tight text-white" speed={34} />
            </Fade>

            <div className="grid flex-1 gap-0 sm:grid-cols-2">
              {VALUES.map(({ Icon, title, desc }, i) => (
                <Fade key={title} from={i % 2 === 0 ? "left" : "right"} delay={i * 0.07}>
                  <div className={`group flex h-full flex-col border-[#FF6B00]/10 p-8 transition-colors hover:bg-white/5 ${
                    i === 0 ? "border-r border-b" : i === 1 ? "border-b" : i === 2 ? "border-r" : ""
                  }`}>
                    <div className="mb-5 flex h-12 w-12 items-center justify-center border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF6B00] transition-colors group-hover:bg-[#FF6B00] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-3 text-base font-black text-white">{title}</h3>
                    <p className="text-sm leading-7 text-slate-400">{desc}</p>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </section>

        {/* ══ 5 · ÉQUIPE ════════════════════════════════════════════════════ */}
        <section
          className="flex sm:min-h-[calc(100vh-85px)] items-center bg-white py-16"
        >
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
            <Fade from="bottom" className="mb-12 text-center">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Ceux qui construisent Zentrix</p>
              <Typewriter text="Notre équipe fondatrice" className="text-[2.2rem] font-black leading-tight text-[#0f0f1a]" speed={32} />
              <p className="mx-auto mt-4 max-w-[52ch] text-sm leading-7 text-slate-500">
                Une équipe multidisciplinaire d'enseignants, d'ingénieurs et de professionnels
                de l'éducation, tous animés par la même passion : démocratiser le savoir.
              </p>
            </Fade>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {TEAM.map(({ name, role, bio, initials, color }, i) => (
                <Fade key={name} from="bottom" delay={i * 0.07}>
                  <div className="group flex flex-col bg-[#f6f7f9] p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${color} text-xl font-black text-white shadow-lg`}>
                      {initials}
                    </div>
                    <h3 className="text-sm font-black text-slate-900">{name}</h3>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#FF6B00]">{role}</p>
                    <p className="mt-3 text-xs leading-6 text-slate-500">{bio}</p>
                  </div>
                </Fade>
              ))}
            </div>

            {/* Partners strip */}
            <Fade from="bottom" delay={0.3} className="mt-14">
              <p className="mb-6 text-center text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Partenaires & soutiens institutionnels
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {PARTNERS.map(p => (
                  <div key={p} className="rounded-full border border-slate-200 px-5 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00]">
                    {p}
                  </div>
                ))}
              </div>
            </Fade>
          </div>
        </section>

        {/* ══ 6 · CTA FINAL ═══════════════════════════════════════════════════ */}
        <section
          className="relative flex sm:min-h-[calc(100vh-85px)] items-center overflow-hidden"
        >
          {/* Orange left half — desktop bleed only */}
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[#FF6B00] hidden lg:block" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[#0f0f1a] hidden lg:block" />

          <div className="relative mx-auto grid w-full max-w-7xl items-stretch lg:grid-cols-2">
            {/* Left — CTA orange */}
            <Fade from="left" className="flex flex-col justify-center bg-[#FF6B00] px-8 py-16 sm:px-12 lg:bg-transparent">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-white/70">Rejoindre Zentrix</p>
              <Typewriter text={"Commencez\nvotre parcours\naujourd'hui."} className="text-[2.4rem] font-black leading-tight text-white" as="h2" speed={28} />
              <p className="mt-5 max-w-[42ch] text-sm leading-7 text-white/80">
                Inscription gratuite. Accès immédiat aux cours d'introduction.
                Pas de carte de crédit requise. Commencez à apprendre en 2 minutes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate("/login?mode=register")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-4 text-sm font-black text-[#FF6B00] transition-all hover:bg-slate-50 hover:gap-3"
                >
                  Créer un compte gratuit <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/courses")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-7 py-4 text-sm font-bold text-white transition-all hover:border-white hover:bg-white/10"
                >
                  <BookOpen className="h-4 w-4" /> Explorer les cours
                </button>
              </div>
            </Fade>

            {/* Right — dark proof */}
            <Fade from="right" delay={0.1} className="flex flex-col justify-center bg-[#0f0f1a] px-8 py-16 sm:px-12 lg:bg-transparent">
              <p className="mb-6 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Pourquoi nous choisir</p>
              <div className="space-y-5">
                {[
                  { Icon: Clock3,    text: "Apprenez à votre rythme — 24h/7j, sur mobile et desktop" },
                  { Icon: Shield,    text: "Certificats reconnus par les entreprises partenaires" },
                  { Icon: Brain,     text: "Assistant IA intégré qui s'adapte à votre progression" },
                  { Icon: Users,     text: "Communauté active de plus de 5 000 apprenants africains" },
                  { Icon: Lightbulb, text: "Contenus pratiques conçus avec l'industrie tech africaine" },
                  { Icon: Globe,     text: "Accessible depuis tout le continent, en français et en anglais" },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10">
                      <Icon className="h-4 w-4 text-[#FF6B00]" />
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </Fade>
          </div>
        </section>

      </div>
    </>
  );
}
