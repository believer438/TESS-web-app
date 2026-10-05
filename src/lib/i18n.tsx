// Copie Zentrix Academy : src/lib/i18n.tsx
/**
 * Zentrix i18n — Système de traduction léger sans dépendances externes.
 * Supporte FR / EN / SW. Le changement de langue s'applique instantanément
 * via React context (pas de rechargement de page).
 *
 * Usage:
 *   const { t, lang, setLang } = useLanguage();
 *   <p>{t("nav.dashboard")}</p>
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "fr" | "en" | "sw";

// ── Translation dictionaries ───────────────────────────────────────────────────

const FR = {
  // ── Common ───────────────────────────────────────────────────────────────────
  common: {
    save:       "Enregistrer",
    saving:     "Enregistrement…",
    cancel:     "Annuler",
    error:      "Erreur",
    loading:    "Chargement…",
    logout:     "Se déconnecter",
    confirm:    "Confirmer",
    delete:     "Supprimer",
    edit:       "Modifier",
    close:      "Fermer",
    back:       "Retour",
    yes:        "Oui",
    no:         "Non",
    search:     "Rechercher",
    actions:    "Actions",
    optional:   "Optionnel",
    required:   "Requis",
  },

  // ── Navigation ───────────────────────────────────────────────────────────────
  nav: {
    dashboard:       "Tableau de bord",
    courses:         "Tous les cours",
    documentAI:      "Document IA",
    library:         "Bibliothèque",
    quizzes:         "Quiz & Examens",
    notes:           "Mes Notes",
    analytics:       "Statistiques",
    operations:      "Opérations TESS",
    notifications:   "Notifications",
    settings:        "Paramètres",
    revision:        "Révision",
    certificates:    "Certificats",
    calendar:        "Calendrier",
    newCourse:       "Nouveau cours",
    users:           "Utilisateurs",
    quizStats:       "Stats Quiz",
    courseDetail:    "Détail du cours",
    questionnaires:  "Questionnaires",
    createCourse:    "Créer un cours",
    editCourse:      "Modifier le cours",
  },

  // ── Roles ────────────────────────────────────────────────────────────────────
  roles: {
    admin:     "Administrateur",
    professor: "Professeur",
    student:   "Étudiant",
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  settings: {
    title:    "Paramètres",
    eyebrow:  "Mon compte",
    subtitle: "Gérez votre profil, l'apparence, la sécurité et vos préférences.",

    // Tabs
    tab_profil:    "Profil",
    tab_apparence: "Apparence",
    tab_securite:  "Sécurité",
    tab_notif:     "Notifications",
    tab_ia:        "Préférences IA",

    // Profile
    profil_title:         "Profil public",
    profil_desc:          "Ces informations sont visibles sur la plateforme.",
    profil_name:          "Nom complet",
    profil_email:         "Adresse email",
    profil_email_hint:    "L'email ne peut pas être modifié.",
    profil_role:          "Rôle",
    profil_lang:          "Langue de l'interface",
    profil_save:          "Enregistrer le profil",
    profil_lang_applying: "La langue a été modifiée et s'applique maintenant à tout le site.",
    profil_saved:         "Profil mis à jour",
    profil_saved_desc:    "Vos informations ont été enregistrées.",
    lang_fr:              "Français",
    lang_en:              "English",
    lang_sw:              "Kiswahili",

    // Appearance
    apparence_title:      "Apparence",
    apparence_desc:       "Choisissez le thème qui correspond à vos préférences.",
    apparence_theme:      "Thème de l'interface",
    apparence_theme_hint: "Le thème s'applique instantanément et est sauvegardé automatiquement.",
    apparence_active:     "Mode actif",
    theme_light:          "Clair",
    theme_dark:           "Sombre",
    theme_system:         "Automatique",
    theme_light_desc:     "Interface lumineuse",
    theme_dark_desc:      "Protège les yeux la nuit",
    theme_system_desc:    "Suit les réglages de l'OS",

    // Security
    securite_title:      "Sécurité du compte",
    securite_desc:       "Modifiez votre mot de passe pour protéger votre compte.",
    securite_new_pwd:    "Nouveau mot de passe",
    securite_confirm:    "Confirmer le mot de passe",
    securite_pwd_min:    "Min. 8 caractères",
    securite_pwd_repeat: "Répétez le mot de passe",
    securite_pwd_match:  "Les mots de passe ne correspondent pas.",
    securite_pwd_ok:     "Correspondance confirmée",
    securite_tips_title: "Conseils pour un mot de passe sécurisé :",
    securite_tip_8:      "Au moins 8 caractères",
    securite_tip_upper:  "Une lettre majuscule",
    securite_tip_num:    "Un chiffre",
    securite_tip_spec:   "Un caractère spécial (!@#$%…)",
    securite_save_pwd:   "Changer le mot de passe",
    securite_pwd_ok_toast:"Mot de passe modifié",
    securite_pwd_ok_desc: "Votre mot de passe a bien été mis à jour.",
    danger_title:        "Zone de danger",
    danger_desc:         "Ces actions sont irréversibles. Agissez avec précaution.",
    danger_delete_title: "Supprimer mon compte",
    danger_delete_desc:  "Supprime définitivement votre compte et toutes vos données.",
    danger_delete_btn:   "Supprimer",
    strength_1:          "Très faible",
    strength_2:          "Faible",
    strength_3:          "Moyen",
    strength_4:          "Fort",
    strength_5:          "Très fort",

    // Delete modal
    delete_title:        "Supprimer mon compte",
    delete_body:         "Cette action est irréversible. Toutes vos données (cours, notes, progrès, historique IA) seront définitivement supprimées.",
    delete_label:        "Tapez",
    delete_word:         "SUPPRIMER",
    delete_placeholder:  "SUPPRIMER",
    delete_confirm:      "Supprimer définitivement",

    // Notifications
    notif_title:         "Notifications",
    notif_desc:          "Gérez comment et quand vous recevez des alertes.",
    notif_email_title:   "Notifications par email",
    notif_email_desc:    "Annonces importantes et mises à jour de cours.",
    notif_revision_title:"Rappels de révision",
    notif_revision_desc: "Notification quand une révision est due (fiches).",
    notif_courses_title: "Nouveaux cours disponibles",
    notif_courses_desc:  "Soyez averti dès qu'un nouveau cours est publié.",
    notif_weekly_title:  "Rapport hebdomadaire",
    notif_weekly_desc:   "Récapitulatif de votre semaine d'apprentissage chaque dimanche.",
    notif_save:          "Enregistrer les préférences",
    notif_saved:         "Notifications enregistrées",

    // AI Prefs
    ia_title:            "Préférences IA",
    ia_desc:             "Personnalisez le comportement de votre assistant Zentrix.",
    ia_level_title:      "Niveau pédagogique par défaut",
    ia_level_hint:       "L'IA s'adapte automatiquement à votre progression, mais vous pouvez forcer un niveau de départ.",
    ia_lang_title:       "Langue de réponse de l'IA",
    ia_behavior_title:   "Comportement",
    ia_hints_title:      "Conseils proactifs",
    ia_hints_desc:       "L'IA vous suggère de l'aide si vous restez bloqué sur un chapitre.",
    ia_save:             "Enregistrer les préférences IA",
    ia_saved:            "Préférences IA enregistrées",
    level_debutant:      "Débutant",
    level_debutant_desc: "Explications simples et pas à pas",
    level_inter:         "Intermédiaire",
    level_inter_desc:    "Équilibre clarté et profondeur",
    level_avance:        "Avancé",
    level_avance_desc:   "Réponses techniques et détaillées",

    // AI Permissions
    perms_title:         "Contrôle contextuel de l'IA",
    perms_desc:          "Choisissez quelles pages l'IA peut observer pour personnaliser ses réponses.",
    perms_dashboard:     "Tableau de bord",
    perms_dashboard_d:   "Cours inscrits, progression globale, jours actifs.",
    perms_catalogue:     "Contenu de cours",
    perms_catalogue_d:   "Chapitre en cours, progression et texte visible.",
    perms_quizzes:       "Quiz & Examens",
    perms_quizzes_d:     "Scores, tentatives et quiz en cours.",
    perms_analytics:     "Statistiques & Analytiques",
    perms_analytics_d:   "Niveau, sujets difficiles, heures d'étude.",
    perms_certificates:  "Certificats",
    perms_certificates_d:"Nombre et liste de certificats obtenus.",
    perms_library:       "Bibliothèque de ressources",
    perms_library_d:     "Ressources consultées dans la bibliothèque.",
    perms_sensitive:     "Données personnelles — désactivé par défaut",
    perms_notes:         "Mes Notes",
    perms_notes_d:       "L'IA peut lire vos notes personnelles pour contextualiser ses réponses.",
    perms_documents:     "Documents uploadés",
    perms_documents_d:   "L'IA connaît vos documents PDF personnels en dehors du mode Document IA.",
    perms_hint:          "Les modifications sont enregistrées automatiquement. Désactiver une page empêche l'IA d'accéder à son contexte, sans affecter votre historique de conversation.",
  },

  // ── Logout dialog ────────────────────────────────────────────────────────────
  logout: {
    title:   "Se déconnecter ?",
    body:    "Vous serez redirigé vers la page d'accueil.",
    confirm: "Se déconnecter",
    cancel:  "Rester",
  },

  // ── AI Panel ─────────────────────────────────────────────────────────────────
  ai: {
    panel_title: "TESS AI",
    panel_hint:  "Posez une question sur votre cours ou votre apprentissage.",
  },
  app: {
    home: "Accueil",
    dashboard: "Tableau de bord",
    about: "À propos",
    login: "Connexion",
    signup: "S'inscrire",
    account: "Compte",
    user: "Utilisateur",
    language: "Langue",
    allCourses: "Tous les cours",
    settings: "Paramètres",
    logout: "Se déconnecter",
    dashboardMine: "Mon tableau de bord",
    loginOrSignup: "Connexion / Inscription",
  },
  footer: {
    news: "Actualités apprenants",
    newsDesc: "Restez informé des dernières nouveautés de la communauté d'apprenants Zentrix.",
    calendar: "Calendrier de formation",
    calendarDesc: "Prochains lancements de cohortes, sessions en direct et dates importantes.",
    events: "Événements & Webinaires",
    eventsDesc: "Ateliers gratuits, masterclasses et rencontres en réseau.",
    discover: "Découvrir",
    institute: "Institut technologique",
    aboutText: "Zentrix est une plateforme d'apprentissage continue qui aide les professionnels et les apprenants à développer leurs compétences, avancer dans leur carrière et s'épanouir dans l'économie numérique.",
    writeUs: "Écrire à Zentrix",
    quickLinks: "Liens rapides",
    resources: "Ressources",
    careers: "Carrières",
    contact: "Contactez-nous",
    contactInfo: "Coordonnées",
    onlineCampus: "Campus en ligne",
    rights: "Tous droits réservés.",
    privacy: "Politique de confidentialité",
    terms: "Conditions d'utilisation",
    community: "Communauté",
  },
  catalogue: {
    title: "Catalogue des cours",
    adminEyebrow: "Administration",
    adminSubtitle: "Mode administration — tous les cours (publiés et brouillons). Créez, modifiez et gérez le contenu pédagogique.",
    publicSubtitle: "Découvrez les cours créés par notre équipe pédagogique. Inscrivez-vous et commencez à apprendre.",
    adminMode: "Mode admin",
    totalCourses: "cours au total",
    myCourses: "Mes cours",
    popularCourses: "Tous les cours",
    levelBeginner: "Débutant",
    levelIntermediate: "Intermédiaire",
    levelAdvanced: "Avancé",
    searchPlaceholder: "Rechercher un cours, instructeur, catégorie…",
    search: "Rechercher",
    filters: "Filtres",
    newCourse: "Nouveau cours",
    level: "Niveau",
    category: "Catégories",
    status: "Statut",
    access: "Accès",
    enrolledOnly: "Uniquement mes cours inscrits",
    clear: "Tout effacer",
    applyFilters: "Voir les résultats",
    noCourses: "Aucun cours disponible",
    noCoursesAdmin: "Aucun cours créé",
    noMatches: "Aucun cours ne correspond à vos filtres",
    noMatchesHint: "Essayez d'élargir votre recherche.",
    noCoursesAdminHint: "Créez votre premier cours avec le bouton ci-dessus.",
    noCoursesHint: "Un administrateur doit créer des cours.",
    noEnrolled: "Vous n'êtes inscrit à aucun cours",
    explore: "Explorez le catalogue et inscrivez-vous à votre premier cours.",
    enroll: "S'inscrire",
    enrolled: "Inscrit",
    published: "Publié",
    draft: "Brouillon",
    instructor: "Instructeur",
    general: "Général",
    admin: "Administration",
    courseCount: "cours affichés",
    deleteCourse: "Supprimer ce cours ?",
    signInRequired: "Connexion requise",
    signInToEnroll: "Connectez-vous pour vous inscrire à ce cours.",
    viewCourse: "Voir le cours",
    liveFilterHint: "Les résultats se mettent à jour immédiatement",
    filtersCount: "filter",
    networkError: "Erreur réseau",
    saveError: "Erreur lors de la sauvegarde",
  },
  landing: {
    slides: [
      { tag: "Plateforme d'apprentissage continu", title: "Montez en\ncompétences.", subtitle: "Des parcours structurés, un assistant IA et un espace cours personnalisé — tout en un." },
      { tag: "Apprentissage tout au long de la vie", title: "Continuez\nd'apprendre.", subtitle: "Bibliothèque active, outils IA intégrés et programmes conçus pour rester en progression." },
      { tag: "Pratique. Transformateur.", title: "Vraies\ncompétences.", subtitle: "Une méthode basée sur des projets concrets — conçue pour progresser rapidement." },
      { tag: "Un espace pour apprendre", title: "Trouvez votre\nprochaine idée.", subtitle: "Un cadre calme pour lire, pratiquer et faire grandir votre curiosité." },
      { tag: "Compétences pour demain", title: "Apprenez à\nvous protéger.", subtitle: "Découvrez la cybersécurité avec des notions simples et des exercices concrets." },
      { tag: "Apprendre partout", title: "Le savoir\nà portée de main.", subtitle: "Avancez à votre rythme, où que vous soyez, depuis n’importe quel écran." },
      { tag: "Votre parcours, dans vos mains", title: "Construisez votre\navenir.", subtitle: "Retrouvez vos cours, vos ressources et TESS dans un seul espace." },
    ],
    viewCourses: "Voir les cours",
    space: "L’espace Zentrix",
    aboutTitle: "À propos de\nZentrix Academy",
    aboutLead: "Nous nous consacrons à révolutionner l'éducation en Afrique et au-delà.",
    aboutText: "En tant qu'institut en ligne de premier plan, nous développons les compétences et proposons une formation de qualité. Notre mission : combler le fossé des connaissances et former une main-d'œuvre prête pour l'avenir.",
    locationIsNoLimit: "La localisation géographique n'est jamais une limite.",
    learnMore: "En savoir plus",
    advancedPaths: "Parcours avancés",
    trustedPaths: "Des parcours qui inspirent confiance",
    nextStep: "Votre prochaine étape commence ici",
    findProgram: "Trouvez le programme qui vous fait avancer.",
    programLead: "Des parcours concrets pour développer vos compétences et atteindre vos objectifs professionnels.",
    findProgramPlaceholder: "Trouvez votre programme…",
    explore: "Explorer :",
    explorer: "Explorer",
    nextPath: "Votre prochain parcours",
    admissions: "Pour toute demande d'admission",
    contactUs: "Contactez-nous",
    viaPlatform: "via la plateforme",
    ready: "Prêt à faire évoluer vos compétences ?",
    exploreTraining: "Explorez les formations et trouvez le parcours qui correspond à vos objectifs.",
    faq: "Questions fréquentes",
    faqAnswer: "Connectez-vous à votre espace apprenant pour accéder à l'ensemble de vos ressources, cours et outils. Notre équipe de support est disponible pour vous accompagner dans votre parcours.",
    browseTraining: "Explorer les cours",
    viewAllCourses: "Voir tous les cours",
    faqTabs: ["Étudiants actuels", "Cours professionnels", "Partenaires & donateurs", "Étudiants internationaux"],
    faqs: {
      students: ["Comment accéder à mes cours ?", "Quel accompagnement est disponible si j'ai besoin d'aide ?", "Comment suivre ma progression ?", "Y a-t-il des sessions en direct, ou tout est pré-enregistré ?", "Que se passe-t-il si je prends du retard ?", "Puis-je changer de cours ou de programme ?"],
      professional: ["Les programmes sont-ils reconnus par les entreprises ?", "Peut-on suivre les cours en dehors des heures de travail ?", "Y a-t-il des certifications à la fin du parcours ?", "Comment obtenir une facture pour mon employeur ?"],
      partners: ["Comment devenir partenaire de Zentrix Academy ?", "Quels sont les avantages pour les entreprises partenaires ?", "Comment faire un don ou sponsoriser un apprenant ?"],
      international: ["Les cours sont-ils disponibles en dehors de l'Afrique ?", "Les contenus sont-ils disponibles en anglais ?", "Comment s'inscrire depuis l'étranger ?"],
    },
  },
  auth: {
    brandTagline: "Plateforme d'apprentissage IA",
    headline: "Apprenez plus vite.",
    headlineAccent: "Progressez plus loin.",
    intro: "Des parcours structurés, un assistant IA disponible 24/7 et un tableau de bord personnalisé pour suivre votre progression.",
    stats: ["Parcours", "Apprenants", "Satisfaction", "Gratuit"],
    testimonialRoles: ["Étudiante en Data Science", "Développeur Web", "Marketing Digital"],
    testimonialTexts: ["Zentrix a transformé ma façon d'apprendre. L'IA m'aide à progresser deux fois plus vite.", "Les cours sont structurés, clairs et l'assistant IA répond à toutes mes questions en temps réel.", "La meilleure plateforme d'apprentissage que j'ai utilisée. Simple, professionnelle et efficace."],
    back: "Retour",
    backToSite: "Retour au site",
    welcome: "Bon retour",
    createAccountTitle: "Créez votre compte",
    loginDescription: "Connectez-vous pour accéder à votre espace d'apprentissage.",
    registerDescription: "Rejoignez Zentrix Academy et commencez à apprendre aujourd'hui.",
    loginTab: "Connexion",
    registerTab: "Inscription",
    fullName: "Nom complet",
    email: "Adresse e-mail",
    password: "Mot de passe",
    namePlaceholder: "Ex. : Marie Dupont",
    emailPlaceholder: "you@example.com",
    minPassword: "8 caractères minimum",
    passwordPlaceholder: "Votre mot de passe",
    login: "Se connecter",
    register: "Créer mon compte",
    googleLoading: "Connexion à Google…",
    googleContinue: "Continuer avec Google",
    noAccount: "Pas encore de compte ?",
    hasAccount: "Déjà un compte ?",
    signupFree: "S'inscrire gratuitement",
    requiredName: "Le nom complet est requis.",
    passwordMinError: "Le mot de passe doit faire au moins 8 caractères.",
    genericError: "Une erreur est survenue",
    googleNotVerified: "Votre adresse Google n'est pas vérifiée.",
    googleUnavailable: "Le service de comptes est temporairement indisponible. Réessayez dans quelques instants.",
    googleError: "Connexion Google impossible. Veuillez réessayer.",
  },
};

// ── English ───────────────────────────────────────────────────────────────────

const EN: typeof FR = {
  common: {
    save:    "Save",
    saving:  "Saving…",
    cancel:  "Cancel",
    error:   "Error",
    loading: "Loading…",
    logout:  "Log out",
    confirm: "Confirm",
    delete:  "Delete",
    edit:    "Edit",
    close:   "Close",
    back:    "Back",
    yes:     "Yes",
    no:      "No",
    search:  "Search",
    actions: "Actions",
    optional:"Optional",
    required:"Required",
  },

  nav: {
    dashboard:    "Dashboard",
    courses:      "All Courses",
    documentAI:   "AI Documents",
    library:      "Library",
    quizzes:      "Quizzes",
    notes:        "My Notes",
    analytics:    "Statistics",
    operations:   "TESS Operations",
    notifications:"Notifications",
    settings:     "Settings",
    revision:     "Revision",
    certificates: "Certificates",
    calendar:     "Calendar",
    newCourse:    "New Course",
    users:        "Users",
    quizStats:    "Quiz Stats",
    courseDetail: "Course Detail",
    questionnaires: "Questionnaires",
    createCourse: "Create Course",
    editCourse:   "Edit Course",
  },

  roles: {
    admin:     "Administrator",
    professor: "Professor",
    student:   "Student",
  },

  settings: {
    title:    "Settings",
    eyebrow:  "My Account",
    subtitle: "Manage your profile, appearance, security and learning preferences.",

    tab_profil:    "Profile",
    tab_apparence: "Appearance",
    tab_securite:  "Security",
    tab_notif:     "Notifications",
    tab_ia:        "AI Preferences",

    profil_title:         "Public Profile",
    profil_desc:          "This information is visible on the platform.",
    profil_name:          "Full Name",
    profil_email:         "Email Address",
    profil_email_hint:    "Email cannot be changed.",
    profil_role:          "Role",
    profil_lang:          "Interface Language",
    profil_save:          "Save Profile",
    profil_lang_applying: "The language has been changed and now applies across the whole site.",
    profil_saved:         "Profile updated",
    profil_saved_desc:    "Your information has been saved.",
    lang_fr:              "Français",
    lang_en:              "English",
    lang_sw:              "Kiswahili",

    apparence_title:      "Appearance",
    apparence_desc:       "Choose the theme that fits your preferences.",
    apparence_theme:      "Interface Theme",
    apparence_theme_hint: "The theme applies instantly and is saved automatically.",
    apparence_active:     "Active mode",
    theme_light:          "Light",
    theme_dark:           "Dark",
    theme_system:         "Automatic",
    theme_light_desc:     "Bright interface",
    theme_dark_desc:      "Easier on your eyes at night",
    theme_system_desc:    "Follows OS settings",

    securite_title:      "Account Security",
    securite_desc:       "Change your password to keep your account safe.",
    securite_new_pwd:    "New Password",
    securite_confirm:    "Confirm Password",
    securite_pwd_min:    "Min. 8 characters",
    securite_pwd_repeat: "Repeat your password",
    securite_pwd_match:  "Passwords do not match.",
    securite_pwd_ok:     "Passwords match",
    securite_tips_title: "Tips for a secure password:",
    securite_tip_8:      "At least 8 characters",
    securite_tip_upper:  "One uppercase letter",
    securite_tip_num:    "One number",
    securite_tip_spec:   "One special character (!@#$%…)",
    securite_save_pwd:   "Change Password",
    securite_pwd_ok_toast:"Password changed",
    securite_pwd_ok_desc: "Your password has been updated.",
    danger_title:        "Danger Zone",
    danger_desc:         "These actions are irreversible. Proceed with caution.",
    danger_delete_title: "Delete my account",
    danger_delete_desc:  "Permanently deletes your account and all your data.",
    danger_delete_btn:   "Delete",
    strength_1:          "Very weak",
    strength_2:          "Weak",
    strength_3:          "Fair",
    strength_4:          "Strong",
    strength_5:          "Very strong",

    delete_title:        "Delete my account",
    delete_body:         "This action is irreversible. All your data (courses, notes, progress, AI history) will be permanently deleted.",
    delete_label:        "Type",
    delete_word:         "DELETE",
    delete_placeholder:  "DELETE",
    delete_confirm:      "Delete permanently",

    notif_title:          "Notifications",
    notif_desc:           "Manage how and when you receive alerts.",
    notif_email_title:    "Email Notifications",
    notif_email_desc:     "Important announcements and course updates.",
    notif_revision_title: "Revision Reminders",
    notif_revision_desc:  "Notification when a review is due (flashcards).",
    notif_courses_title:  "New Courses Available",
    notif_courses_desc:   "Be notified as soon as a new course is published.",
    notif_weekly_title:   "Weekly Report",
    notif_weekly_desc:    "Summary of your learning week every Sunday.",
    notif_save:           "Save Preferences",
    notif_saved:          "Notifications saved",

    ia_title:            "AI Preferences",
    ia_desc:             "Customize the behavior of your Zentrix assistant.",
    ia_level_title:      "Default Teaching Level",
    ia_level_hint:       "The AI adapts automatically to your progress, but you can force a starting level.",
    ia_lang_title:       "AI Response Language",
    ia_behavior_title:   "Behavior",
    ia_hints_title:      "Proactive Tips",
    ia_hints_desc:       "The AI suggests help if you're stuck on a chapter.",
    ia_save:             "Save AI Preferences",
    ia_saved:            "AI preferences saved",
    level_debutant:      "Beginner",
    level_debutant_desc: "Simple, step-by-step explanations",
    level_inter:         "Intermediate",
    level_inter_desc:    "Balance between clarity and depth",
    level_avance:        "Advanced",
    level_avance_desc:   "Technical and detailed answers",

    perms_title:         "AI Context Control",
    perms_desc:          "Choose which pages the AI can observe to personalize its responses.",
    perms_dashboard:     "Dashboard",
    perms_dashboard_d:   "Enrolled courses, overall progress, active days.",
    perms_catalogue:     "Course Content",
    perms_catalogue_d:   "Current chapter, progress and visible text.",
    perms_quizzes:       "Quizzes & Exams",
    perms_quizzes_d:     "Scores, attempts and current quizzes.",
    perms_analytics:     "Statistics & Analytics",
    perms_analytics_d:   "Level, difficult topics, study hours.",
    perms_certificates:  "Certificates",
    perms_certificates_d:"Number and list of earned certificates.",
    perms_library:       "Resource Library",
    perms_library_d:     "Resources browsed in the library.",
    perms_sensitive:     "Personal data — disabled by default",
    perms_notes:         "My Notes",
    perms_notes_d:       "The AI can read your personal notes to contextualize its answers.",
    perms_documents:     "Uploaded Documents",
    perms_documents_d:   "The AI knows your personal PDFs outside of AI Document mode.",
    perms_hint:          "Changes are saved automatically. Disabling a page prevents the AI from accessing its context, without affecting your conversation history.",
  },

  logout: {
    title:   "Log out?",
    body:    "You will be redirected to the home page.",
    confirm: "Log out",
    cancel:  "Stay",
  },

  ai: {
    panel_title: "AI Assistant",
    panel_hint:  "Ask a question about your course or your learning.",
  },
  app: {
    home: "Home",
    dashboard: "Dashboard",
    about: "About",
    login: "Log in",
    signup: "Sign up",
    account: "Account",
    user: "User",
    language: "Language",
    allCourses: "All courses",
    settings: "Settings",
    logout: "Log out",
    dashboardMine: "My dashboard",
    loginOrSignup: "Log in / Sign up",
  },
  footer: {
    news: "Learner news",
    newsDesc: "Stay up to date with the latest news from the Zentrix learner community.",
    calendar: "Training calendar",
    calendarDesc: "Upcoming cohorts, live sessions and important dates.",
    events: "Events & Webinars",
    eventsDesc: "Free workshops, masterclasses and networking events.",
    discover: "Explore",
    institute: "Technology Institute",
    aboutText: "Zentrix is a continuous learning platform that helps professionals and learners develop their skills, advance their careers and thrive in the digital economy.",
    writeUs: "Email Zentrix",
    quickLinks: "Quick links",
    resources: "Resources",
    careers: "Careers",
    contact: "Contact us",
    contactInfo: "Contact information",
    onlineCampus: "Online campus",
    rights: "All rights reserved.",
    privacy: "Privacy policy",
    terms: "Terms of use",
    community: "Community",
  },
  catalogue: {
    title: "Course catalog",
    adminEyebrow: "Administration",
    adminSubtitle: "Admin mode — all courses, published and drafts. Create, edit and manage learning content.",
    publicSubtitle: "Explore courses created by our teaching team. Enroll and start learning.",
    adminMode: "Admin mode",
    totalCourses: "courses in total",
    myCourses: "My courses",
    popularCourses: "All courses",
    levelBeginner: "Beginner",
    levelIntermediate: "Intermediate",
    levelAdvanced: "Advanced",
    searchPlaceholder: "Search by course, instructor or category…",
    search: "Search",
    filters: "Filters",
    newCourse: "New course",
    level: "Level",
    category: "Categories",
    status: "Status",
    access: "Access",
    enrolledOnly: "Only my enrolled courses",
    clear: "Clear all",
    applyFilters: "Show results",
    noCourses: "No courses available",
    noCoursesAdmin: "No courses created",
    noMatches: "No courses match your filters",
    noMatchesHint: "Try broadening your search.",
    noCoursesAdminHint: "Create your first course using the button above.",
    noCoursesHint: "An administrator needs to create courses.",
    noEnrolled: "You are not enrolled in any courses",
    explore: "Explore the catalog and enroll in your first course.",
    enroll: "Enroll",
    enrolled: "Enrolled",
    published: "Published",
    draft: "Draft",
    instructor: "Instructor",
    general: "General",
    admin: "Administration",
    courseCount: "courses shown",
    deleteCourse: "Delete this course?",
    signInRequired: "Sign-in required",
    signInToEnroll: "Sign in to enroll in this course.",
    viewCourse: "View course",
    liveFilterHint: "Results update immediately",
    filtersCount: "filter",
    networkError: "Network error",
    saveError: "Error while saving",
  },
  landing: {
    slides: [
      { tag: "Lifelong learning platform", title: "Build your\nskills.", subtitle: "Structured learning paths, an AI assistant and a personalized learning space — all in one." },
      { tag: "Learning throughout life", title: "Keep\nlearning.", subtitle: "An active library, built-in AI tools and programs designed to keep you moving forward." },
      { tag: "Practical. Transformative.", title: "Real-world\nskills.", subtitle: "A hands-on, project-based approach designed to help you progress faster." },
      { tag: "A space to learn", title: "Find your\nnext idea.", subtitle: "A calm place to read, practise and turn curiosity into progress." },
      { tag: "Skills for tomorrow", title: "Learn how to\nstay secure.", subtitle: "Explore cybersecurity through clear lessons and practical exercises." },
      { tag: "Learn anywhere", title: "Knowledge\nat hand.", subtitle: "Move at your own pace, wherever you are, from any screen." },
      { tag: "Your journey, in your hands", title: "Build your\nfuture.", subtitle: "Keep your courses, resources and TESS together in one place." },
    ],
    viewCourses: "Browse courses",
    space: "The Zentrix experience",
    aboutTitle: "About\nZentrix Academy",
    aboutLead: "We are committed to transforming education in Africa and beyond.",
    aboutText: "As a leading online institute, we build skills and deliver quality training. Our mission is to close the knowledge gap and prepare a workforce ready for the future.",
    locationIsNoLimit: "Geography is never a limit.",
    learnMore: "Learn more",
    advancedPaths: "Advanced learning paths",
    trustedPaths: "Learning paths you can trust",
    nextStep: "Your next step starts here",
    findProgram: "Find a program that moves you forward.",
    programLead: "Practical learning paths to build your skills and reach your career goals.",
    findProgramPlaceholder: "Find a program…",
    explore: "Explore:",
    explorer: "Explore",
    nextPath: "Your next learning path",
    admissions: "For admissions inquiries",
    contactUs: "Contact us",
    viaPlatform: "through the platform",
    ready: "Ready to grow your skills?",
    exploreTraining: "Explore our courses and find the path that matches your goals.",
    faq: "Frequently asked questions",
    faqAnswer: "Sign in to your learning space to access all your resources, courses and tools. Our support team is here to guide you throughout your learning journey.",
    browseTraining: "Explore courses",
    viewAllCourses: "Browse all courses",
    faqTabs: ["Current students", "Professional courses", "Partners & donors", "International students"],
    faqs: {
      students: ["How do I access my courses?", "What support is available if I need help?", "How can I track my progress?", "Are there live sessions, or is everything pre-recorded?", "What happens if I fall behind?", "Can I change courses or programs?"],
      professional: ["Are the programs recognized by employers?", "Can I take courses outside working hours?", "Will I receive a certificate at the end?", "How can I get an invoice for my employer?"],
      partners: ["How can I become a Zentrix Academy partner?", "What benefits are available to partner organizations?", "How can I donate or sponsor a learner?"],
      international: ["Are the courses available outside Africa?", "Is the content available in English?", "How can I enroll from abroad?"],
    },
  },
  auth: {
    brandTagline: "AI-powered learning platform",
    headline: "Learn faster.",
    headlineAccent: "Go further.",
    intro: "Structured learning paths, a 24/7 AI assistant and a personalized dashboard to track your progress.",
    stats: ["Learning paths", "Learners", "Satisfaction", "Free"],
    testimonialRoles: ["Data Science Student", "Web Developer", "Digital Marketing"],
    testimonialTexts: ["Zentrix transformed the way I learn. AI helps me make progress twice as fast.", "The courses are structured and clear, and the AI assistant answers my questions in real time.", "The best learning platform I have used. Simple, professional and effective."],
    back: "Back",
    backToSite: "Back to site",
    welcome: "Welcome back",
    createAccountTitle: "Create your account",
    loginDescription: "Sign in to access your learning space.",
    registerDescription: "Join Zentrix Academy and start learning today.",
    loginTab: "Log in",
    registerTab: "Sign up",
    fullName: "Full name",
    email: "Email address",
    password: "Password",
    namePlaceholder: "e.g. Marie Dupont",
    emailPlaceholder: "you@example.com",
    minPassword: "At least 8 characters",
    passwordPlaceholder: "Your password",
    login: "Log in",
    register: "Create my account",
    googleLoading: "Signing in with Google…",
    googleContinue: "Continue with Google",
    noAccount: "Don't have an account yet?",
    hasAccount: "Already have an account?",
    signupFree: "Sign up for free",
    requiredName: "Full name is required.",
    passwordMinError: "Password must be at least 8 characters long.",
    genericError: "Something went wrong",
    googleNotVerified: "Your Google email address has not been verified.",
    googleUnavailable: "The account service is temporarily unavailable. Please try again shortly.",
    googleError: "Google sign-in failed. Please try again.",
  },
};

// Kiswahili — core interface strings are translated here; less common labels
// inherit the English dictionary so no Arabic or French text leaks into SW UI.
const SW: typeof FR = {
  ...EN,
  common: {
    ...EN.common,
    save: "Hifadhi", saving: "Inahifadhi…", cancel: "Ghairi", error: "Hitilafu",
    loading: "Inapakia…", logout: "Ondoka", confirm: "Thibitisha", delete: "Futa",
    edit: "Hariri", close: "Funga", back: "Rudi", yes: "Ndiyo", no: "Hapana",
    search: "Tafuta", actions: "Vitendo", optional: "Si lazima", required: "Inahitajika",
  },
  nav: {
    ...EN.nav, dashboard: "Dashibodi", courses: "Kozi zote", documentAI: "Nyaraka za AI",
  library: "Maktaba", quizzes: "Maswali", notes: "Vidokezo vyangu", analytics: "Takwimu", operations: "Operesheni za TESS",
    notifications: "Arifa", settings: "Mipangilio", revision: "Marudio", certificates: "Vyeti",
    calendar: "Kalenda", newCourse: "Kozi mpya", users: "Watumiaji", quizStats: "Takwimu za maswali",
    courseDetail: "Maelezo ya kozi", questionnaires: "Hojaji", createCourse: "Unda kozi", editCourse: "Hariri kozi",
  },
  roles: { admin: "Msimamizi", professor: "Mwalimu", student: "Mwanafunzi" },
  settings: {
    ...EN.settings, title: "Mipangilio", eyebrow: "Akaunti yangu", subtitle: "Dhibiti wasifu, mwonekano, usalama na mapendeleo yako.",
    tab_profil: "Wasifu", tab_apparence: "Mwonekano", tab_securite: "Usalama", tab_notif: "Arifa", tab_ia: "Mapendeleo ya AI",
    profil_title: "Wasifu wa umma", profil_name: "Jina kamili", profil_email: "Barua pepe", profil_role: "Jukumu",
    profil_lang: "Lugha ya kiolesura", profil_save: "Hifadhi wasifu", lang_fr: "Français", lang_en: "English", lang_sw: "Kiswahili",
    ia_title: "Mapendeleo ya AI", ia_lang_title: "Lugha ya majibu ya AI", ia_save: "Hifadhi mapendeleo ya AI",
  },
  app: { ...EN.app, home: "Nyumbani", dashboard: "Dashibodi", about: "Kuhusu", login: "Ingia", signup: "Jisajili", account: "Akaunti", user: "Mtumiaji", language: "Lugha", allCourses: "Kozi zote", settings: "Mipangilio", logout: "Ondoka", dashboardMine: "Dashibodi yangu", loginOrSignup: "Ingia / Jisajili" },
  ai: { ...EN.ai, panel_title: "Msaidizi wa AI", panel_hint: "Uliza swali kuhusu kozi au kujifunza kwako." },
  landing: {
    ...EN.landing,
    slides: [
      { tag: "Jukwaa la kujifunza daima", title: "Jenga\nujuzi wako.", subtitle: "Njia zilizopangwa, msaidizi wa AI na nafasi yako ya kujifunza — yote pamoja." },
      { tag: "Kujifunza maisha yote", title: "Endelea\nkujifunza.", subtitle: "Maktaba hai na programu zilizoundwa kukusaidia kusonga mbele." },
      { tag: "Vitendo. Vinavyobadilisha.", title: "Ujuzi wa\nkweli.", subtitle: "Jifunze kwa miradi halisi na uendelee haraka." },
      { tag: "Nafasi ya kujifunza", title: "Pata wazo lako\nlinayofuata.", subtitle: "Soma, fanya mazoezi na geuza udadisi wako kuwa maendeleo." },
      { tag: "Ujuzi wa kesho", title: "Jifunze kujilinda\nmtandaoni.", subtitle: "Gundua usalama wa mtandao kwa masomo rahisi na mazoezi ya vitendo." },
      { tag: "Jifunze popote", title: "Maarifa\nkaribu nawe.", subtitle: "Songa kwa kasi yako, kutoka kwenye kifaa chochote." },
      { tag: "Safari yako, mikononi mwako", title: "Jenga\nkesho yako.", subtitle: "Kozi, rasilimali na TESS pamoja katika nafasi moja." },
    ],
    viewCourses: "Tazama kozi", learnMore: "Jifunze zaidi", explore: "Gundua:", explorer: "Gundua",
    ready: "Uko tayari kukuza ujuzi wako?", exploreTraining: "Gundua kozi zetu na upate njia inayolingana na malengo yako.",
    faq: "Maswali yanayoulizwa mara kwa mara", browseTraining: "Gundua kozi", viewAllCourses: "Tazama kozi zote",
  },
};

// ── Type helpers ──────────────────────────────────────────────────────────────

type Translations = typeof FR;
type DeepKeys<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends object
    ? DeepKeys<T[K], `${Prefix}${string & K}.`>
    : `${Prefix}${string & K}`;
}[keyof T];
type TKey = DeepKeys<Translations>;

function lookup(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur === null || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === "string" ? cur : path;
}

// ── Context ───────────────────────────────────────────────────────────────────

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey | string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "fr",
  setLang: () => {},
  t: (k) => String(k),
});

const DICTIONARIES: Record<Lang, Translations> = { fr: FR, en: EN, sw: SW };
const LANG_STORAGE_KEY = "zentrix-lang";

export function getStoredLanguage(): Lang | null {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "fr" || stored === "en" || stored === "sw" ? stored : null;
  } catch {
    return null;
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = getStoredLanguage();
      if (stored) return stored;
      return navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";
    } catch {
      return "fr";
    }
  });

  // Apply html lang attribute
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir  = "ltr";
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => {
    if (!(newLang in DICTIONARIES)) return;
    try { localStorage.setItem(LANG_STORAGE_KEY, newLang); } catch { /* private browsing */ }
    setLangState(newLang);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANG_STORAGE_KEY && event.newValue && event.newValue in DICTIONARIES) {
        setLangState(event.newValue as Lang);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const t = useCallback(
    (key: string) => lookup(DICTIONARIES[lang] as unknown as Record<string, unknown>, key),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
