// Copie Zentrix Academy : src/pages/RevisionPage.tsx
import { useMemo, useState } from "react";
import {
  Brain,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";

interface Card {
  id: string;
  course: string;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
}

const CARDS: Card[] = [
  {
    id: "card-1",
    course: "Data Science",
    question: "Que retourne df.groupby('cat').size() ?",
    answer:
      "Le nombre de lignes dans chaque groupe défini par la colonne 'cat', sous forme d'une Series indexée par les valeurs uniques de 'cat'.",
    difficulty: "easy",
  },
  {
    id: "card-2",
    course: "React 18",
    question: "Quand utiliser useMemo plutôt que useCallback ?",
    answer:
      "useMemo mémorise une **valeur** dérivée d'un calcul coûteux. useCallback mémorise une **fonction** pour préserver son identité référentielle entre les rendus.",
    difficulty: "medium",
  },
  {
    id: "card-3",
    course: "Cybersécurité",
    question: "Quelle est la différence entre authentification et autorisation ?",
    answer:
      "L'authentification vérifie *qui* vous êtes (login, mot de passe, token). L'autorisation détermine *ce que* vous avez le droit de faire (rôles, permissions, ACL).",
    difficulty: "easy",
  },
  {
    id: "card-4",
    course: "Deep Learning",
    question: "Pourquoi normaliser les données avant d'entraîner un réseau de neurones ?",
    answer:
      "Pour stabiliser et accélérer la descente de gradient. Des entrées sur des échelles très différentes provoquent des oscillations et un apprentissage plus lent voire instable.",
    difficulty: "hard",
  },
  {
    id: "card-5",
    course: "UX Design",
    question: "Cite trois heuristiques de Nielsen.",
    answer:
      "1) Visibilité de l'état du système, 2) Cohérence et standards, 3) Reconnaissance plutôt que mémorisation. (Plus 7 autres au total).",
    difficulty: "medium",
  },
];

const DIFFICULTY_BADGE: Record<Card["difficulty"], string> = {
  easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const DIFFICULTY_LABEL: Record<Card["difficulty"], string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

export default function RevisionPage({ onOpenAI }: { onOpenAI: () => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [easyCount, setEasyCount] = useState(0);

  const card = CARDS[index % CARDS.length];

  const stats = useMemo(
    () => [
      {
        label: "À réviser aujourd'hui",
        value: CARDS.length - reviewed,
        icon: Layers,
        accent: "text-[#FF6B00]",
      },
      {
        label: "Cartes vues",
        value: reviewed,
        icon: Eye,
        accent: "text-blue-600 dark:text-blue-400",
      },
      {
        label: "Marquées « facile »",
        value: easyCount,
        icon: TrendingUp,
        accent: "text-emerald-600 dark:text-emerald-400",
      },
    ],
    [reviewed, easyCount],
  );

  const next = (markedEasy: boolean) => {
    setReviewed((r) => Math.min(r + 1, CARDS.length));
    if (markedEasy) setEasyCount((c) => c + 1);
    setRevealed(false);
    setIndex((i) => (i + 1) % CARDS.length);
  };

  const reset = () => {
    setIndex(0);
    setRevealed(false);
    setReviewed(0);
    setEasyCount(0);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900">
      <PageHero
        eyebrow="Mémorisation"
        title="Révision Espacée"
        subtitle="Un système intelligent qui adapte la fréquence de révision à votre courbe d'oubli personnelle."
        backgroundImage="/page-hero-revision.png"
        icon={<Brain className="h-7 w-7" />}
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border-l-4 border-[#FF6B00] bg-white p-4 shadow-sm dark:border-orange-500/60 dark:bg-slate-950"
            >
              <div className={`flex items-center gap-2 ${stat.accent}`}>
                <stat.icon className="h-4 w-4" />
                <span className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</span>
              </div>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onOpenAI}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FFB347] to-[#FF6B00] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            Générer des cartes IA
          </button>
        </div>

        <article className="border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Carte {(index % CARDS.length) + 1} / {CARDS.length}
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DIFFICULTY_BADGE[card.difficulty]}`}>
              {DIFFICULTY_LABEL[card.difficulty]}
            </span>
          </div>

          <div className="px-6 py-12">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF6B00]">
              {card.course}
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-snug text-slate-900 dark:text-white md:text-3xl">
              {card.question}
            </h2>

            {revealed ? (
              <div className="mt-8 border-l-4 border-emerald-500 bg-emerald-50 p-5 text-sm leading-relaxed text-slate-700 dark:bg-emerald-950/20 dark:text-slate-200">
                {card.answer}
              </div>
            ) : (
              <div className="mt-8 border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <EyeOff className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Réfléchissez à votre réponse avant de la révéler.
                </p>
              </div>
            )}

            {!revealed && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setRevealed(true)}
                  className="inline-flex items-center gap-2 bg-slate-900 px-8 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Eye className="h-4 w-4" />
                  Voir la réponse
                </button>
              </div>
            )}
          </div>

          {revealed && (
            <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => next(false)}
                className="inline-flex items-center justify-center gap-2 border-r border-slate-100 bg-red-50 py-4 text-sm font-bold uppercase tracking-wider text-red-700 hover:bg-red-100 dark:border-slate-800 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                <ThumbsDown className="h-4 w-4" />
                Difficile
              </button>
              <button
                onClick={() => next(true)}
                className="inline-flex items-center justify-center gap-2 bg-emerald-50 py-4 text-sm font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
              >
                <ThumbsUp className="h-4 w-4" />
                Facile
              </button>
            </div>
          )}
        </article>

        <div className="flex justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <RotateCcw className="h-4 w-4" />
            Recommencer la session
          </button>
        </div>
      </div>
    </div>
  );
}

