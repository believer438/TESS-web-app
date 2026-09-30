// Copie Zentrix Academy : src/lib/mock-data.ts
import type {
  Book,
  Chapter,
  Course,
  Lesson,
  LessonBlock,
  Notification,
  Quiz,
} from "./backend-types";

// Free MP4 sample videos (Google's CDN — stable)
const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
];

const COURSE_COVERS = [
  "/zentrix.avif",
  "/zentrix.avif",
  "/zentrix.avif",
  "/zentrix.avif",
  "/zentrix.avif",
  "/zentrix.avif",
  "/zentrix.avif",
  "/zentrix.avif",
];

export const mockCourses: Course[] = [
  {
    id: "c-data-science",
    title: "Introduction à la Data Science",
    description:
      "Apprenez les fondamentaux de la data science : Python, statistiques, visualisation et premiers modèles de machine learning.",
    coverImage: COURSE_COVERS[0],
    categoryId: "cat-data",
    categoryName: "Data Science",
    professor: "Dr. Amina Diallo",
    difficulty: "beginner",
    estimatedDuration: 24,
    chaptersCount: 6,
    lessonsCount: 24,
    enrolledCount: 1284,
    progress: 35,
    isEnrolled: true,
    isFeatured: true,
    tags: ["Python", "Pandas", "Statistiques", "Visualisation"],
  },
  {
    id: "c-react-pro",
    title: "React 18 — De zéro à expert",
    description:
      "Maîtrisez React, les hooks, le state management et les meilleures pratiques pour construire des applications professionnelles.",
    coverImage: COURSE_COVERS[1],
    categoryId: "cat-dev",
    categoryName: "Développement Web",
    professor: "Karim El Amrani",
    difficulty: "intermediate",
    estimatedDuration: 32,
    chaptersCount: 8,
    lessonsCount: 32,
    enrolledCount: 2540,
    progress: 12,
    isEnrolled: true,
    isFeatured: true,
    tags: ["React", "Hooks", "TypeScript", "Vite"],
  },
  {
    id: "c-ml-deep",
    title: "Deep Learning avec PyTorch",
    description:
      "Plongez dans les réseaux de neurones profonds : CNN, RNN, Transformers et applications réelles en vision et NLP.",
    coverImage: COURSE_COVERS[2],
    categoryId: "cat-data",
    categoryName: "Intelligence Artificielle",
    professor: "Pr. Sofia Ferrari",
    difficulty: "advanced",
    estimatedDuration: 48,
    chaptersCount: 10,
    lessonsCount: 40,
    enrolledCount: 876,
    progress: 0,
    isEnrolled: false,
    isFeatured: true,
    tags: ["PyTorch", "Deep Learning", "Transformers", "NLP"],
  },
  {
    id: "c-ux-design",
    title: "UX/UI Design — Principes et pratique",
    description:
      "Concevez des interfaces utiles, utilisables et désirables. De la recherche utilisateur au prototype interactif Figma.",
    coverImage: COURSE_COVERS[3],
    categoryId: "cat-design",
    categoryName: "Design",
    professor: "Léa Moreau",
    difficulty: "beginner",
    estimatedDuration: 20,
    chaptersCount: 5,
    lessonsCount: 18,
    enrolledCount: 1654,
    progress: 78,
    isEnrolled: true,
    isFeatured: true,
    tags: ["Figma", "Design System", "Prototypage", "User Research"],
  },
  {
    id: "c-cyber-sec",
    title: "Cybersécurité — Fondamentaux",
    description:
      "Comprenez les menaces actuelles, le chiffrement, la sécurité réseau et apprenez à protéger vos systèmes.",
    coverImage: COURSE_COVERS[4],
    categoryId: "cat-cyber",
    categoryName: "Cybersécurité",
    professor: "Yasin Bouchard",
    difficulty: "intermediate",
    estimatedDuration: 28,
    chaptersCount: 7,
    lessonsCount: 26,
    enrolledCount: 980,
    progress: 0,
    isEnrolled: false,
    isFeatured: false,
    tags: ["Chiffrement", "Réseaux", "OWASP", "Pentest"],
  },
  {
    id: "c-cloud-aws",
    title: "AWS Cloud Practitioner",
    description:
      "Préparez la certification AWS Cloud Practitioner avec des cours clairs, des labs pratiques et des quiz de révision.",
    coverImage: COURSE_COVERS[5],
    categoryId: "cat-cloud",
    categoryName: "Cloud",
    professor: "Mohamed Saidi",
    difficulty: "beginner",
    estimatedDuration: 22,
    chaptersCount: 6,
    lessonsCount: 22,
    enrolledCount: 2210,
    progress: 0,
    isEnrolled: false,
    isFeatured: false,
    tags: ["AWS", "Cloud", "Certification", "DevOps"],
  },
  {
    id: "c-marketing",
    title: "Marketing Digital — Stratégie 360°",
    description:
      "Du SEO au social media en passant par l'emailing, construisez une stratégie digitale qui convertit.",
    coverImage: COURSE_COVERS[6],
    categoryId: "cat-business",
    categoryName: "Business",
    professor: "Nadia Berrada",
    difficulty: "beginner",
    estimatedDuration: 18,
    chaptersCount: 5,
    lessonsCount: 20,
    enrolledCount: 1430,
    progress: 0,
    isEnrolled: false,
    isFeatured: false,
    tags: ["SEO", "Social Media", "Analytics", "Conversion"],
  },
  {
    id: "c-mathfin",
    title: "Mathématiques financières appliquées",
    description:
      "Taux d'intérêt, actualisation, obligations, options : les outils mathématiques essentiels de la finance moderne.",
    coverImage: COURSE_COVERS[7],
    categoryId: "cat-finance",
    categoryName: "Finance",
    professor: "Pr. Olivier Lambert",
    difficulty: "advanced",
    estimatedDuration: 30,
    chaptersCount: 8,
    lessonsCount: 28,
    enrolledCount: 642,
    progress: 0,
    isEnrolled: false,
    isFeatured: false,
    tags: ["Finance", "Mathématiques", "Options", "Obligations"],
  },
];

const CHAPTER_TEMPLATES: Record<string, { title: string; lessons: string[] }[]> = {
  "c-data-science": [
    {
      title: "Introduction à la Data Science",
      lessons: [
        "Qu'est-ce que la data science ?",
        "Le cycle de vie d'un projet data",
        "Outils et environnement de travail",
        "Première analyse exploratoire",
      ],
    },
    {
      title: "Python pour les données",
      lessons: [
        "Bases de Python pour la data",
        "Manipulation avec Pandas",
        "Calcul scientifique avec NumPy",
        "Lecture de fichiers CSV et JSON",
      ],
    },
    {
      title: "Statistiques descriptives",
      lessons: [
        "Moyennes, médianes, écart-type",
        "Distribution et histogrammes",
        "Corrélation et causalité",
      ],
    },
    {
      title: "Visualisation de données",
      lessons: [
        "Matplotlib en pratique",
        "Seaborn pour les visualisations statistiques",
        "Construire un dashboard simple",
      ],
    },
    {
      title: "Machine Learning — Premiers pas",
      lessons: [
        "Comprendre apprentissage supervisé / non-supervisé",
        "Régression linéaire avec scikit-learn",
        "Classification : k-NN et arbre de décision",
      ],
    },
    {
      title: "Projet de fin de cours",
      lessons: [
        "Choix d'un dataset réel",
        "Pipeline complet : nettoyage → modèle",
        "Restitution et soutenance",
      ],
    },
  ],
};

function genericChapters(course: Course): { title: string; lessons: string[] }[] {
  const chapters: { title: string; lessons: string[] }[] = [];
  for (let i = 0; i < course.chaptersCount; i++) {
    const tag = course.tags[i % Math.max(course.tags.length, 1)] ?? "Concept";
    chapters.push({
      title: `Chapitre ${i + 1} — ${tag}`,
      lessons: [
        `Introduction à ${tag}`,
        `Mise en pratique de ${tag}`,
        `Cas d'usage avancés de ${tag}`,
      ],
    });
  }
  return chapters;
}

export function buildChaptersForCourse(course: Course): Chapter[] {
  const template = CHAPTER_TEMPLATES[course.id] ?? genericChapters(course);
  return template.map((chap, chapterIndex) => {
    const chapterId = `${course.id}-ch-${chapterIndex}`;
    return {
      id: chapterId,
      courseId: course.id,
      title: chap.title,
      description: `Chapitre ${chapterIndex + 1} du cours ${course.title}.`,
      orderIndex: chapterIndex,
      lessons: chap.lessons.map((lessonTitle, lessonIndex) => {
        const isCompleted = chapterIndex === 0 && lessonIndex < 2;
        return {
          id: `${chapterId}-l-${lessonIndex}`,
          chapterId,
          title: lessonTitle,
          orderIndex: lessonIndex,
          isCompleted,
          isLocked: chapterIndex > 1 && course.progress < 50,
          estimatedDuration: 12 + (lessonIndex % 4) * 4,
          blocks: [],
        } satisfies Lesson;
      }),
    } satisfies Chapter;
  });
}

interface LessonSegmentSeed {
  heading: string;
  paragraphs: string[];
  videoTitle: string;
  videoDescription: string;
  videoDuration: string;
}

const COURSE_SEGMENTS: Record<string, LessonSegmentSeed[]> = {
  "c-data-science": [
    {
      heading: "Partie 1 — Pourquoi la data science change tout",
      paragraphs: [
        "La data science combine statistiques, programmation et expertise métier pour transformer les données brutes en décisions utiles. Aujourd'hui, presque chaque industrie — santé, finance, éducation, sport — utilise ces approches pour gagner en performance.",
        "Dans cette première partie, nous posons les bases : le vocabulaire essentiel, les étapes typiques d'un projet et les rôles que vous serez amené à incarner (analyste, data engineer, data scientist, ML engineer).",
      ],
      videoTitle: "Vidéo introductive — Le rôle d'un Data Scientist",
      videoDescription:
        "Une présentation visuelle des grandes étapes d'un projet data, de la collecte au déploiement.",
      videoDuration: "6 min",
    },
    {
      heading: "Partie 2 — L'environnement Python et Jupyter",
      paragraphs: [
        "Avant d'écrire la moindre ligne d'analyse, il faut maîtriser son environnement. Python est devenu le langage de référence grâce à un écosystème riche : Pandas, NumPy, scikit-learn, Matplotlib.",
        "Nous installons ensemble l'environnement, nous créons votre premier notebook Jupyter et nous explorons un petit dataset de démonstration.",
      ],
      videoTitle: "Démo — Premiers pas dans Jupyter Notebook",
      videoDescription:
        "Pas-à-pas guidé : créer un notebook, importer Pandas, lire un CSV et afficher les premières lignes.",
      videoDuration: "9 min",
    },
    {
      heading: "Partie 3 — Manipuler des données avec Pandas",
      paragraphs: [
        "Pandas est l'outil central pour manipuler des tables. Nous voyons comment filtrer, trier, regrouper et joindre des DataFrames en quelques lignes.",
        "Tout le reste du cours s'appuiera sur cette boîte à outils, alors prenez le temps de vous familiariser avec ces opérations fondamentales.",
      ],
      videoTitle: "Tutoriel — Filtrer et agréger un DataFrame",
      videoDescription:
        "Démonstration concrète sur un dataset de ventes : groupby, agg et création de colonnes calculées.",
      videoDuration: "12 min",
    },
    {
      heading: "Partie 4 — Statistiques pour comprendre vos données",
      paragraphs: [
        "Avant de modéliser, il faut comprendre. Moyenne, médiane, variance, distribution, corrélation : ces concepts permettent de cerner ce que disent vraiment les données.",
        "Nous prenons un cas concret et nous calculons ensemble ces indicateurs en Python, puis nous les interprétons pour orienter la suite du projet.",
      ],
      videoTitle: "Vidéo — Statistiques descriptives en pratique",
      videoDescription:
        "Comment lire un histogramme, repérer une valeur aberrante et choisir la bonne mesure de tendance centrale.",
      videoDuration: "8 min",
    },
    {
      heading: "Partie 5 — Visualiser pour convaincre",
      paragraphs: [
        "Une bonne visualisation vaut mille tableaux. Nous comparons Matplotlib et Seaborn, nous voyons quand utiliser un boxplot, un scatter ou un heatmap, et nous construisons une fiche-restitution claire.",
        "Cette partie se termine par un mini-projet : transformer un dataset brut en une page de visualisations propres et lisibles.",
      ],
      videoTitle: "Atelier — Construire un mini-dashboard visuel",
      videoDescription:
        "Mise en page, choix des couleurs, hiérarchie de l'information : les règles d'or de la dataviz.",
      videoDuration: "11 min",
    },
  ],
};

function genericSegments(course: Course): LessonSegmentSeed[] {
  const tags = course.tags.length > 0 ? course.tags : ["concept"];
  return tags.slice(0, 5).map((tag, index) => ({
    heading: `Partie ${index + 1} — ${tag}`,
    paragraphs: [
      `Dans cette partie, nous abordons ${tag.toLowerCase()} appliqué au cours « ${course.title} ». L'objectif est que vous puissiez à la fin appliquer ces idées sur un cas réel.`,
      `Nous expliquons d'abord la théorie en quelques minutes, puis nous démontrons en vidéo. Vous trouverez à la fin un mini-exercice pour valider votre compréhension.`,
    ],
    videoTitle: `Vidéo — ${tag} en pratique`,
    videoDescription: `Démonstration commentée par ${course.professor} sur ${tag.toLowerCase()}.`,
    videoDuration: `${6 + index * 2} min`,
  }));
}

export interface LessonSegment {
  id: string;
  heading: string;
  paragraphs: string[];
  content?: string;
  videoUrl: string;
  videoPosition: string;
  videoTitle: string;
  videoDescription: string;
  videoDuration: string;
}

export function buildLessonSegments(course: Course): LessonSegment[] {
  const seeds = COURSE_SEGMENTS[course.id] ?? genericSegments(course);
  return seeds.map((seed, index) => ({
    id: `${course.id}-seg-${index}`,
    heading: seed.heading,
    paragraphs: seed.paragraphs,
    videoUrl: SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length],
    videoPosition: "bottom",
    videoTitle: seed.videoTitle,
    videoDescription: seed.videoDescription,
    videoDuration: seed.videoDuration,
  }));
}

export function buildLessonBlocks(course: Course): LessonBlock[] {
  const segments = buildLessonSegments(course);
  const blocks: LessonBlock[] = [];
  segments.forEach((segment, index) => {
    blocks.push({
      id: `${segment.id}-text`,
      lessonId: `${course.id}-current`,
      blockType: "text",
      content: { heading: segment.heading, paragraphs: segment.paragraphs },
      orderIndex: index * 2,
      isRequired: true,
      isCompleted: false,
    });
    blocks.push({
      id: `${segment.id}-video`,
      lessonId: `${course.id}-current`,
      blockType: "video",
      content: {
        url: segment.videoUrl,
        title: segment.videoTitle,
        description: segment.videoDescription,
        duration: segment.videoDuration,
      },
      orderIndex: index * 2 + 1,
      isRequired: true,
      isCompleted: false,
    });
  });
  return blocks;
}

export const mockBooks: Book[] = [
  {
    id: "b-1",
    title: "Python for Data Analysis",
    author: "Wes McKinney",
    description: "L'ouvrage de référence du créateur de Pandas pour analyser ses données en Python.",
    coverImage: "/zentrix.avif",
    categoryName: "Data Science",
    pageCount: 524,
    language: "Anglais",
  },
  {
    id: "b-2",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    description: "La bible des systèmes data modernes : stockage, distribution et traitement.",
    coverImage: "/zentrix.avif",
    categoryName: "Architecture",
    pageCount: 616,
    language: "Anglais",
  },
  {
    id: "b-3",
    title: "Atomic Habits",
    author: "James Clear",
    description: "Construire des micro-habitudes qui transforment durablement vos résultats.",
    coverImage: "/zentrix.avif",
    categoryName: "Développement personnel",
    pageCount: 320,
    language: "Français",
  },
  {
    id: "b-4",
    title: "Clean Code",
    author: "Robert C. Martin",
    description: "Les bonnes pratiques pour écrire un code propre, lisible et maintenable.",
    coverImage: "/zentrix.avif",
    categoryName: "Développement",
    pageCount: 464,
    language: "Anglais",
  },
  {
    id: "b-5",
    title: "Hands-On Machine Learning",
    author: "Aurélien Géron",
    description: "Maîtrisez scikit-learn, Keras et TensorFlow par des projets pratiques.",
    coverImage: "/zentrix.avif",
    categoryName: "Intelligence Artificielle",
    pageCount: 856,
    language: "Anglais",
  },
  {
    id: "b-6",
    title: "Don't Make Me Think",
    author: "Steve Krug",
    description: "Les principes fondamentaux d'une expérience utilisateur réussie.",
    coverImage: "/zentrix.avif",
    categoryName: "UX Design",
    pageCount: 216,
    language: "Anglais",
  },
];

export const mockQuizzes: Quiz[] = [
  {
    id: "q-1",
    courseId: "c-data-science",
    courseName: "Introduction à la Data Science",
    title: "Bases de Pandas — Quiz éclair",
    description: "10 questions pour valider vos réflexes sur DataFrame, Series et indexation.",
    questionCount: 10,
    timeLimit: 10,
    passingScore: 70,
    bestScore: 80,
    attempts: 2,
    quizType: "practice",
  },
  {
    id: "q-2",
    courseId: "c-react-pro",
    courseName: "React 18",
    title: "Hooks essentiels",
    description: "useState, useEffect, useMemo, useCallback : maîtrisez-vous l'essentiel ?",
    questionCount: 12,
    timeLimit: 15,
    passingScore: 75,
    bestScore: null,
    attempts: 0,
    quizType: "practice",
  },
  {
    id: "q-3",
    courseId: "c-ux-design",
    courseName: "UX/UI Design",
    title: "Examen final UX",
    description: "Évaluation finale couvrant recherche, prototypage et accessibilité.",
    questionCount: 25,
    timeLimit: 45,
    passingScore: 80,
    bestScore: 92,
    attempts: 1,
    quizType: "exam",
  },
  {
    id: "q-4",
    courseId: "c-cyber-sec",
    courseName: "Cybersécurité",
    title: "Révision OWASP Top 10",
    description: "Révisez rapidement les 10 vulnérabilités les plus courantes du web.",
    questionCount: 10,
    timeLimit: 12,
    passingScore: 70,
    bestScore: null,
    attempts: 0,
    quizType: "revision",
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "n-1",
    title: "Nouveau chapitre disponible",
    message: "Le chapitre 4 du cours Data Science vient d'être publié.",
    type: "info",
    isRead: false,
    createdAt: "2026-04-25T10:30:00Z",
  },
  {
    id: "n-2",
    title: "Quiz réussi !",
    message: "Vous avez obtenu 92% au quiz UX Design. Bravo !",
    type: "success",
    isRead: false,
    createdAt: "2026-04-24T16:12:00Z",
  },
  {
    id: "n-3",
    title: "Rappel de révision",
    message: "Il est temps de réviser le chapitre 2 de React 18.",
    type: "reminder",
    isRead: true,
    createdAt: "2026-04-23T08:00:00Z",
  },
  {
    id: "n-4",
    title: "Examen dans 3 jours",
    message: "Préparez-vous : l'examen final de Data Science est planifié.",
    type: "warning",
    isRead: true,
    createdAt: "2026-04-22T09:45:00Z",
  },
];
