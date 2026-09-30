// Copie Zentrix Academy : src/pages/QuestionnairePage.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSetPageContext } from "@/hooks/usePageContext";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  Plus,
  Save,
  Settings2,
  Share2,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  apiArchiveQuestionnaire,
  apiCloseQuestionnaire,
  apiQuestionnaireCreatorAi,
  apiCreateQuestionnaire,
  apiDeleteQuestionnaire,
  apiDuplicateQuestionnaire,
  apiGetQuestionnaire,
  apiGetQuestionnaireStats,
  apiPublishQuestionnaire,
  apiQuestionnaireExportUrl,
  apiReopenQuestionnaire,
  apiSearchQuestionnaires,
  apiUpdateQuestionnaire,
  apiUpdateQuestionnaireFeedback,
  type Questionnaire,
  type QuestionnaireAiMode,
  type RespondentField,
  type QuestionnairePayload,
  type QuestionnaireQuestion,
  type QuestionnaireQuestionKind,
} from "@/lib/api-client";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff8a3d] focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-[#0b1424] dark:text-white";
const questionKinds: { value: QuestionnaireQuestionKind; label: string }[] = [
  ["short_text", "Réponse courte"],
  ["long_text", "Texte long"],
  ["single_choice", "Choix unique"],
  ["multiple_choice", "Choix multiples"],
  ["yes_no", "Oui / Non"],
  ["true_false", "Vrai / Faux"],
  ["select", "Liste déroulante"],
  ["scale", "Échelle"],
  ["rating", "Note / étoiles"],
  ["date", "Date"],
  ["time", "Heure"],
  ["number", "Nombre"],
  ["percentage", "Pourcentage"],
  ["email", "Email"],
  ["phone", "Téléphone"],
  ["ranking", "Classement"],
  ["matrix", "Matrice"],
].map(([value, label]) => ({
  value: value as QuestionnaireQuestionKind,
  label,
}));
const optionKinds = new Set<QuestionnaireQuestionKind>([
  "single_choice",
  "multiple_choice",
  "select",
  "scale",
  "rating",
  "ranking",
]);
const aiModes: { value: QuestionnaireAiMode; label: string; detail: string }[] =
  [
    {
      value: "disabled",
      label: "Désactivée",
      detail: "Aucun assistant dans le questionnaire.",
    },
    {
      value: "guide_only",
      label: "Guide uniquement",
      detail: "L’IA peut expliquer les consignes, sans répondre.",
    },
    {
      value: "ask_to_answer",
      label: "Proposer une réponse",
      detail: "Le répondant peut demander une aide ponctuelle.",
    },
    {
      value: "allowed",
      label: "Réponse assistée",
      detail: "L’IA peut formuler une réponse à la demande.",
    },
  ];

type Section = { id: string; title: string; description?: string };
type LogicRule = {
  question_id: number;
  target_question_ids: number[];
  operator: string;
  value: string;
  action: "show" | "hide";
};

const emptyQuestion = (order_index: number): QuestionnaireQuestion => ({
  // Client-only negative identifiers make rules usable before the first save.
  id: -(order_index + 1),
  prompt: "Nouvelle question",
  description: "",
  kind: "short_text",
  options: [],
  required: false,
  note: "",
  correct_answer: null,
  points: 1,
  order_index,
  settings: {},
});

const presetRespondentFields: RespondentField[] = [
  { key: "name", label: "Nom", type: "text", required: true },
  { key: "post_name", label: "Post-nom", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "phone", label: "Téléphone", type: "tel", required: false },
];

function normaliseRespondentFields(
  fields: Questionnaire["respondent_fields"],
): RespondentField[] {
  return fields.flatMap((field) => {
    if (typeof field !== "string") return [field];
    const preset = presetRespondentFields.find((item) => item.key === field);
    return [
      preset ?? {
        key: field,
        label: field.replace(/_/g, " "),
        type: "text",
        required: false,
      },
    ];
  });
}

function basePayload(
  overrides: Partial<QuestionnairePayload> = {},
): QuestionnairePayload {
  return {
    title: "Questionnaire sans titre",
    description: "",
    author_name: "",
    visibility: "public",
    ai_mode: "disabled",
    anonymous_responses: true,
    allow_multiple: false,
    show_confirmation: true,
    confirmation_message: "Merci pour votre réponse.",
    progressive: false,
    allow_back: true,
    shuffle_questions: false,
    max_responses: null,
    open_at: null,
    expires_at: null,
    mode: "form",
    intro_message: "",
    footer_note: "",
    sections: [],
    logic_rules: [],
    respondent_fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "post_name", label: "Post-nom", type: "text", required: true },
    ],
    appearance: {},
    ai_settings: {},
    quiz_pass_threshold: 0,
    questions: [emptyQuestion(0)],
    ...overrides,
  };
}

function makePayload(q: Questionnaire): QuestionnairePayload {
  return {
    title: q.title,
    description: q.description,
    author_name: q.author_name,
    visibility: q.visibility,
    ai_mode: q.ai_mode,
    anonymous_responses: q.anonymous_responses,
    allow_multiple: q.allow_multiple,
    show_confirmation: q.show_confirmation,
    confirmation_message: q.confirmation_message,
    progressive: q.progressive,
    allow_back: q.allow_back,
    shuffle_questions: q.shuffle_questions,
    max_responses: q.max_responses,
    open_at: q.open_at,
    expires_at: q.expires_at,
    mode: q.mode,
    intro_message: q.intro_message,
    footer_note: q.footer_note,
    sections: q.sections,
    logic_rules: q.logic_rules,
    respondent_fields: normaliseRespondentFields(q.respondent_fields),
    appearance: q.appearance,
    ai_settings: q.ai_settings,
    quiz_pass_threshold: q.quiz_pass_threshold,
    questions: q.questions,
    status: q.status,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function dateInput(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}
function statusLabel(status: Questionnaire["status"]) {
  return status === "published"
    ? "Publié"
    : status === "closed"
      ? "Fermé"
      : status === "archived"
        ? "Archivé"
        : "Brouillon";
}
function statusClass(status: Questionnaire["status"]) {
  return status === "published"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    : status === "closed"
      ? "border-red-400/25 bg-red-400/10 text-red-300"
      : status === "archived"
        ? "border-slate-500/25 bg-slate-500/10 text-slate-300"
        : "border-orange-400/25 bg-orange-400/10 text-orange-300";
}
function kindLabel(kind: QuestionnaireQuestionKind) {
  return questionKinds.find((item) => item.value === kind)?.label ?? kind;
}

function responseValueLabel(value: unknown): string {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return "Aucune réponse";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${key}: ${String(item)}`).join(" · ");
  return String(value);
}

function responseStatusMeta(status: "new" | "read" | "processed" | undefined) {
  if (status === "processed") return { label: "Traitée", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" };
  if (status === "read") return { label: "Lue · à traiter", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" };
  return { label: "Non lue", className: "border-sky-400/30 bg-sky-400/10 text-sky-200" };
}

function CreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (q: Questionnaire) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Donnez un titre à votre questionnaire.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      onCreated(
        await apiCreateQuestionnaire(
          basePayload({ title: title.trim(), description: description.trim() }),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer le questionnaire.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      className="questionnaire-admin fixed inset-0 z-50 flex items-center justify-center bg-[#050914]/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111a2b] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a3d]">
              Nouveau formulaire
            </p>
            <h2 className="mt-2 font-serif text-2xl text-white">
              Créer un questionnaire
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-400"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Titre
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Bilan de rentrée"
            className={inputClass}
          />
        </label>
        <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-400">
          Description{" "}
          <span className="font-normal normal-case text-slate-500">
            facultatif
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </label>
        {error && (
          <p className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff6b00] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}Créer
          </button>
        </div>
      </form>
    </div>
  );
}

function QuestionnaireCard({
  questionnaire,
  onOpen,
  onRefresh,
  onDelete,
}: {
  questionnaire: Questionnaire;
  onOpen: () => void;
  onRefresh: (q: Questionnaire) => void;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const shareUrl = `${window.location.origin}/questionnaire/${questionnaire.slug}`;
  const run = async (action: () => Promise<Questionnaire>) => {
    setBusy(true);
    try {
      onRefresh(await action());
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(shareUrl);
  };
  return (
    <article className="group relative flex min-h-[205px] flex-col rounded-2xl border border-slate-800 bg-[#151922] p-5 transition hover:border-slate-600">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(questionnaire.status)}`}
          >
            {statusLabel(questionnaire.status)}
          </span>
          {questionnaire.visibility === "public" && (
            <span className="rounded-full bg-sky-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">
              Public
            </span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
            aria-label="Actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-48 overflow-hidden rounded-xl border border-slate-700 bg-[#1b1e26] py-1 shadow-xl">
              <button
                onClick={onOpen}
                className="flex w-full gap-2 px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-white/5"
              >
                <PenLine className="h-3.5 w-3.5" /> Modifier
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  void run(() => apiDuplicateQuestionnaire(questionnaire.id));
                }}
                className="flex w-full gap-2 px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-white/5"
              >
                <Copy className="h-3.5 w-3.5" /> Dupliquer
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (
                    window.confirm(
                      "Supprimer ce questionnaire et ses réponses ?",
                    )
                  )
                    onDelete();
                }}
                className="flex w-full gap-2 px-3 py-2.5 text-left text-xs text-red-300 hover:bg-red-400/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
      <button onClick={onOpen} className="text-left">
        <h2 className="line-clamp-2 font-serif text-xl leading-tight text-white group-hover:text-[#ff9a59]">
          {questionnaire.title}
        </h2>
        <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-400">
          {questionnaire.description || "Aucune description pour le moment."}
        </p>
      </button>
      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span>
            {questionnaire.questions.length} question
            {questionnaire.questions.length > 1 ? "s" : ""}
          </span>
          <span>
            {questionnaire.response_count} réponse
            {questionnaire.response_count > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void copy()}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
            title="Copier le lien"
            aria-label="Copier le lien"
          >
            <Link2 className="h-4 w-4" />
          </button>
          {questionnaire.status === "published" && (
            <button
              disabled={busy}
              onClick={() =>
                void run(() => apiCloseQuestionnaire(questionnaire.id))
              }
              className="rounded-lg p-2 text-slate-500 hover:text-red-300 disabled:opacity-50"
              title="Fermer"
              aria-label="Fermer"
            >
              <Archive className="h-4 w-4" />
            </button>
          )}
          {questionnaire.status === "closed" && (
            <button
              disabled={busy}
              onClick={() =>
                void run(() => apiReopenQuestionnaire(questionnaire.id))
              }
              className="rounded-lg p-2 text-slate-500 hover:text-emerald-300 disabled:opacity-50"
              title="Rouvrir"
              aria-label="Rouvrir"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          {questionnaire.status !== "published" &&
            questionnaire.status !== "closed" && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(() => apiPublishQuestionnaire(questionnaire.id))
                }
                className="rounded-lg p-2 text-slate-500 hover:text-[#ff9a59] disabled:opacity-50"
                title="Publier"
                aria-label="Publier"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
        </div>
      </div>
    </article>
  );
}

function QuestionnaireList() {
  const navigate = useNavigate();
  useSetPageContext({
    current_page: "questionnaires",
    page_title: "Questionnaires",
    page_data: { view: "list" },
  });
  const [items, setItems] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | Questionnaire["status"]>("all");
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(
        await apiSearchQuestionnaires(
          search,
          filter === "all" ? undefined : filter,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger vos questionnaires.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter, search]);
  useEffect(() => {
    void load();
  }, [load]);
  const updateItem = (next: Questionnaire) =>
    setItems((old) =>
      old.some((item) => item.id === next.id)
        ? old.map((item) => (item.id === next.id ? next : item))
        : [next, ...old],
    );
  const remove = async (id: number) => {
    try {
      await apiDeleteQuestionnaire(id);
      setItems((old) => old.filter((item) => item.id !== id));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Suppression impossible.",
      );
    }
  };
  return (
    <section className="questionnaire-admin min-h-full bg-[#0f1219] px-4 py-6 text-slate-100 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1380px]">
        <div className="flex flex-col justify-between gap-5 border-b border-slate-800 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff8a3d]">
              Espace de travail
            </p>
            <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">
              Questionnaires
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Créez, partagez et analysez des formulaires réellement connectés à
              vos réponses.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#ff6b00] px-4 py-3 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" /> Nouveau questionnaire
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher…"
            className="min-w-[220px] flex-1 rounded-xl border border-slate-700 bg-[#151922] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#ff8a3d]"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Afficher
          </span>
          {(["all", "draft", "published", "closed", "archived"] as const).map(
            (value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold ${filter === value ? "bg-[#ff6b00] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"}`}
              >
                {value === "all" ? "Tous" : statusLabel(value)}
              </button>
            ),
          )}
        </div>
        <div className="mt-6">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center text-sm text-red-200">
              {error}
              <button onClick={() => void load()} className="ml-3 underline">
                Réessayer
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-[#151922] px-6 py-16 text-center">
              <Clipboard className="mx-auto h-8 w-8 text-[#ff914d]" />
              <h2 className="mt-5 font-serif text-2xl text-white">
                {search || filter !== "all"
                  ? "Aucun résultat"
                  : "Votre espace est prêt"}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Créez votre premier questionnaire pour recueillir des réponses.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <QuestionnaireCard
                  key={item.id}
                  questionnaire={item}
                  onOpen={() =>
                    navigate(`/workspace/questionnaires/${item.id}`)
                  }
                  onRefresh={updateItem}
                  onDelete={() => void remove(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {createOpen && (
        <CreateDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(q) => {
            setCreateOpen(false);
            navigate(`/workspace/questionnaires/${q.id}`);
          }}
        />
      )}
    </section>
  );
}

function QuestionEditor({
  question,
  index,
  total,
  sections,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
}: {
  question: QuestionnaireQuestion;
  index: number;
  total: number;
  sections: Section[];
  onChange: (next: QuestionnaireQuestion) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const patch = (next: Partial<QuestionnaireQuestion>) =>
    onChange({ ...question, ...next });
  const hasOptions = optionKinds.has(question.kind);
  const options = question.options.length
    ? question.options
    : question.kind === "scale" || question.kind === "rating"
      ? ["1", "2", "3", "4", "5"]
      : [];
  const settings = question.settings ?? {};
  return (
    <article className="rounded-2xl border border-slate-800 bg-[#151922] shadow-xl shadow-black/5">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Question {index + 1}
          <span className="font-normal normal-case text-slate-600">
            · {kindLabel(question.kind)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="rounded-lg p-2 text-slate-500 hover:text-white disabled:opacity-25"
            aria-label="Monter"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="rounded-lg p-2 text-slate-500 hover:text-white disabled:opacity-25"
            aria-label="Descendre"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="rounded-lg p-2 text-slate-500 hover:text-white"
            aria-label="Dupliquer"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-slate-500 hover:text-red-300"
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_240px]">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Intitulé
            <input
              value={question.prompt}
              onChange={(e) => patch({ prompt: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Aide{" "}
            <span className="font-normal normal-case text-slate-600">
              facultatif
            </span>
            <textarea
              value={question.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </label>
          {hasOptions && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Options
                </span>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      options: [...options, `Option ${options.length + 1}`],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#ff914d]"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {options.map((option, optionIndex) => (
                  <div className="flex gap-2" key={`${index}-${optionIndex}`}>
                    <input
                      value={option}
                      onChange={(e) => {
                        const next = [...options];
                        next[optionIndex] = e.target.value;
                        patch({ options: next });
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-[#0b1424] px-3 py-2 text-sm text-white outline-none focus:border-[#ff8a3d]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          options: options.filter((_, i) => i !== optionIndex),
                        })
                      }
                      className="rounded-lg p-2 text-slate-500 hover:text-red-300"
                      aria-label="Supprimer l’option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {question.kind === "matrix" && (
            <div className="mt-4 rounded-xl border border-slate-700 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Matrice
              </p>
              <input
                value={
                  Array.isArray(settings.columns)
                    ? settings.columns.join(", ")
                    : "Oui, Non"
                }
                onChange={(e) =>
                  patch({
                    settings: {
                      ...settings,
                      columns: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    },
                  })
                }
                placeholder="Colonnes séparées par des virgules"
                className={inputClass}
              />
            </div>
          )}
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Type
            <select
              value={question.kind}
              onChange={(e) => {
                const kind = e.target.value as QuestionnaireQuestionKind;
                patch({
                  kind,
                  options: optionKinds.has(kind)
                    ? question.options.length
                      ? question.options
                      : ["Option 1", "Option 2"]
                    : [],
                });
              }}
              className={inputClass}
            >
              {questionKinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-[#0b1424] p-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => patch({ required: e.target.checked })}
              className="accent-[#ff6b00]"
            />{" "}
            Réponse obligatoire
          </label>
          {sections.length > 0 && (
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Section
              <select
                value={question.section_id ?? ""}
                onChange={(e) => patch({ section_id: e.target.value || null })}
                className={inputClass}
              >
                <option value="">Sans section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Note
            <input
              type="number"
              min={0}
              value={question.points}
              onChange={(e) => patch({ points: Number(e.target.value) || 0 })}
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Réponse attendue{" "}
            <span className="font-normal normal-case text-slate-600">
              quiz facultatif
            </span>
            <input
              value={question.correct_answer ?? ""}
              onChange={(e) =>
                patch({ correct_answer: e.target.value || null })
              }
              className={inputClass}
            />
          </label>
          {question.kind === "multiple_choice" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-slate-500">
                Min
                <input
                  type="number"
                  min={0}
                  value={String(settings.min_items ?? "")}
                  onChange={(e) =>
                    patch({
                      settings: {
                        ...settings,
                        min_items: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-[11px] text-slate-500">
                Max
                <input
                  type="number"
                  min={0}
                  value={String(settings.max_items ?? "")}
                  onChange={(e) =>
                    patch({
                      settings: {
                        ...settings,
                        max_items: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function QuestionnaireDetail({ id }: { id: number }) {
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(
    null,
  );
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof apiGetQuestionnaireStats>
  > | null>(null);
  const [tab, setTab] = useState<
    "overview" | "questions" | "responses" | "stats" | "share"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [responseFilter, setResponseFilter] = useState<"all" | "new" | "read" | "processed">("all");
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, string>>(
    {},
  );
  const [expandedResponse, setExpandedResponse] = useState<number | null>(null);
  const [creationGuide, setCreationGuide] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  useSetPageContext({
    current_page: "questionnaires",
    page_title: questionnaire?.title ? `Questionnaire : ${questionnaire.title}` : "Questionnaires",
    page_data: {
      questionnaire_id: id,
      questionnaire_title: questionnaire?.title ?? "",
      active_tab: tab,
    },
  });
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const loaded = await apiGetQuestionnaire(id);
      setQuestionnaire({
        ...loaded,
        respondent_fields: normaliseRespondentFields(loaded.respondent_fields),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Questionnaire indisponible.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (tab === "stats")
      apiGetQuestionnaireStats(id)
        .then(setStats)
        .catch(() => setStats(null));
  }, [id, tab]);
  const update = (patch: Partial<Questionnaire>) =>
    setQuestionnaire((old) => (old ? { ...old, ...patch } : old));
  const save = async () => {
    if (!questionnaire) return;
    setSaving(true);
    setNotice("");
    try {
      setQuestionnaire(
        await apiUpdateQuestionnaire(id, makePayload(questionnaire)),
      );
      setNotice("Modifications enregistrées.");
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };
  const editQuestion = (index: number, next: QuestionnaireQuestion) =>
    update({
      questions:
        questionnaire?.questions.map((question, i) =>
          i === index
            ? { ...next, order_index: i }
            : { ...question, order_index: i },
        ) ?? [],
    });
  const addQuestion = () =>
    {
      const nextIndex = questionnaire?.questions.length ?? 0;
      update({
        questions: [
          ...(questionnaire?.questions ?? []),
          emptyQuestion(nextIndex),
        ],
      });
      setEditingQuestionIndex(nextIndex);
    };
  const moveQuestion = (index: number, direction: -1 | 1) => {
    if (!questionnaire) return;
    const next = [...questionnaire.questions];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    update({
      questions: next.map((question, i) => ({ ...question, order_index: i })),
    });
  };
  const copyLink = async () => {
    if (!questionnaire) return;
    await navigator.clipboard?.writeText(
      `${window.location.origin}/questionnaire/${questionnaire.slug}`,
    );
    setNotice("Lien public copié.");
  };
  const runAction = async (
    action: () => Promise<Questionnaire>,
    message: string,
  ) => {
    try {
      setQuestionnaire(await action());
      setNotice(message);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Action impossible.");
    }
  };
  const saveFeedback = async (
    responseId: number,
    processingStatus?: "new" | "read" | "processed",
  ) => {
    try {
      const feedback =
        feedbackDrafts[responseId] ??
        questionnaire?.responses?.find((response) => response.id === responseId)
          ?.feedback ??
        "";
      const result = await apiUpdateQuestionnaireFeedback(
        id,
        responseId,
        feedback,
        processingStatus,
      );
      update({
        responses: questionnaire?.responses?.map((response) =>
          response.id === responseId
            ? {
                ...response,
                feedback: result.feedback,
                processing_status: result.processing_status,
                processed_at: result.processed_at,
              }
            : response,
        ),
      });
      setNotice("Suivi de la réponse enregistré.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  };
  const selectResponse = (responseId: number) => {
    const response = questionnaire?.responses?.find((item) => item.id === responseId);
    setExpandedResponse(responseId);
    // Opening a response is an explicit read action; processing remains a
    // deliberate choice of the questionnaire creator.
    if (response?.processing_status === "new") void saveFeedback(responseId, "read");
  };
  const askCreationGuide = async () => {
    if (!questionnaire) return;
    setGuideLoading(true);
    setCreationGuide("");
    try {
      const result = await apiQuestionnaireCreatorAi(questionnaire.id, {
        mode: "guide",
        message: `Aide-moi à vérifier la qualité de ce questionnaire : « ${questionnaire.title} ». Indique les éléments manquants, les formulations ambiguës, et si l'identité demandée est cohérente avec l'objectif.`,
      });
      setCreationGuide(result.reply);
    } catch (err) {
      setCreationGuide(err instanceof Error ? err.message : "Le guide IA est indisponible.");
    } finally {
      setGuideLoading(false);
    }
  };
  const q = questionnaire;
  const sections = (q?.sections ?? []) as Section[];
  const logicRules = (q?.logic_rules ?? []) as LogicRule[];
  const respondentFields = q
    ? normaliseRespondentFields(q.respondent_fields)
    : [];
  const filteredResponses = (q?.responses ?? []).filter(
    (response) => responseFilter === "all" || (response.processing_status ?? "new") === responseFilter,
  );
  const selectedResponse = (q?.responses ?? []).find(
    (response) => response.id === expandedResponse,
  );
  const tabs = [
    { value: "overview", label: "Vue générale", icon: FileText },
    { value: "questions", label: "Questions", icon: Clipboard },
    { value: "responses", label: "Réponses", icon: MessageSquare },
    { value: "stats", label: "Statistiques", icon: BarChart3 },
    { value: "share", label: "Partager", icon: Share2 },
  ] as const;
  if (loading)
    return (
    <section className="questionnaire-admin min-h-full bg-[#0f1219] p-6 lg:p-10">
        <div className="mx-auto max-w-[1200px] animate-pulse space-y-4">
          <div className="h-7 w-40 rounded bg-slate-800" />
          <div className="h-36 rounded-2xl bg-slate-900" />
        </div>
      </section>
    );
  if (error || !q)
    return (
    <section className="questionnaire-admin min-h-full bg-[#0f1219] p-6 lg:p-10">
        <div className="mx-auto max-w-xl pt-20 text-center text-sm text-red-200">
          {error || "Questionnaire introuvable."}
          <button onClick={() => void load()} className="ml-3 underline">
            Réessayer
          </button>
        </div>
      </section>
    );
  return (
    <section className="questionnaire-admin min-h-full bg-[#0f1219] px-4 py-5 text-slate-100 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1200px]">
        <button
          onClick={() => navigate("/workspace/questionnaires")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Tous les questionnaires
        </button>
        <div className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(q.status)}`}
              >
                {statusLabel(q.status)}
              </span>
              <span className="text-xs text-slate-500">
                Mis à jour le {formatDate(q.updated_at)}
              </span>
            </div>
            <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">
              {q.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {q.description ||
                "Ajoutez une description pour donner du contexte aux répondants."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                window.open(
                  `/questionnaire-preview/${q.id}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3.5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              <ExternalLink className="h-4 w-4" /> Aperçu
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff6b00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}{" "}
              Enregistrer
            </button>
          </div>
        </div>
        <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto py-4">
          {tabs.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${tab === value ? "bg-[#ff6b00]/15 text-[#ff9a59]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        {notice && (
          <div className="mb-4 rounded-xl border border-[#ff6b00]/25 bg-[#ff6b00]/10 px-4 py-3 text-sm text-[#ffbd92]">
            {notice}
          </div>
        )}
        {tab === "overview" && (
          <div className="space-y-4">
            {!overviewEditing && (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
                <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff8a3d]">Vue générale</p>
                      <h2 className="mt-2 font-serif text-2xl text-white">{q.title}</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{q.description || "Aucune description n’a encore été renseignée."}</p>
                    </div>
                  </div>
                  <dl className="mt-7 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Auteur", q.author_name || "Non renseigné"],
                      ["Format", q.mode === "quiz" ? "Quiz noté" : "Formulaire"],
                      ["Ouverture", formatDate(q.open_at)],
                      ["Fermeture", formatDate(q.expires_at)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-slate-800 bg-[#0b1424] px-4 py-3">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                        <dd className="mt-1 text-sm text-slate-200">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {[q.anonymous_responses ? "Réponses anonymes" : "Identité demandée", q.allow_multiple ? "Participations multiples" : "Une participation", q.shuffle_questions ? "Questions mélangées" : "Ordre fixe"].map((item) => (
                      <span key={item} className="rounded-full border border-slate-700 bg-[#0b1424] px-3 py-1.5 text-xs font-semibold text-slate-300">{item}</span>
                    ))}
                  </div>
                  <div className="mt-7 flex justify-end border-t border-slate-800 pt-5">
                    <button onClick={() => setOverviewEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#ff6b00]/40 px-4 py-2.5 text-sm font-bold text-[#ff9a59]">
                      <PenLine className="h-4 w-4" /> Modifier la vue générale
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Activité</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#0b1424] p-4"><p className="font-serif text-3xl text-white">{q.questions.length}</p><p className="mt-1 text-xs text-slate-500">Questions</p></div>
                    <div className="rounded-xl bg-[#0b1424] p-4"><p className="font-serif text-3xl text-white">{q.response_count}</p><p className="mt-1 text-xs text-slate-500">Réponses</p></div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-slate-400">Les réglages sont protégés dans cet aperçu. Utilisez Modifier pour les ajuster, puis conservez le bouton Enregistrer en haut de page.</p>
                </div>
              </div>
            )}
            {overviewEditing && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#ff8a3d]">
                <Settings2 className="h-4 w-4" /> Configuration
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Titre
                  <input
                    value={q.title}
                    onChange={(e) => update({ title: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Auteur
                  <input
                    value={q.author_name}
                    onChange={(e) => update({ author_name: e.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Description
                <textarea
                  rows={3}
                  value={q.description}
                  onChange={(e) => update({ description: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
              </label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mode
                  <select
                    value={q.mode}
                    onChange={(e) =>
                      update({ mode: e.target.value as "form" | "quiz" })
                    }
                    className={inputClass}
                  >
                    <option value="form">Formulaire</option>
                    <option value="quiz">Quiz noté</option>
                  </select>
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Seuil de réussite (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={q.quiz_pass_threshold}
                    onChange={(e) =>
                      update({
                        quiz_pass_threshold: Number(e.target.value) || 0,
                      })
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ouverture
                  <input
                    type="datetime-local"
                    value={dateInput(q.open_at)}
                    onChange={(e) =>
                      update({
                        open_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Fermeture automatique
                  <input
                    type="datetime-local"
                    value={dateInput(q.expires_at)}
                    onChange={(e) =>
                      update({
                        expires_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["anonymous_responses", "Réponses anonymes"],
                  ["allow_multiple", "Plusieurs participations"],
                  ["show_confirmation", "Afficher la confirmation"],
                  ["shuffle_questions", "Mélanger les questions"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-[#0b1424] p-3 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(q[key as keyof Questionnaire])}
                      onChange={(e) =>
                        update({
                          [key]: e.target.checked,
                        } as Partial<Questionnaire>)
                      }
                      className="accent-[#ff6b00]"
                    />{" "}
                    {label}
                  </label>
                ))}
              </div>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Message d’introduction
                <textarea
                  value={q.intro_message}
                  onChange={(e) => update({ intro_message: e.target.value })}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </label>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Message de confirmation
                <textarea
                  value={q.confirmation_message}
                  onChange={(e) =>
                    update({ confirmation_message: e.target.value })
                  }
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </label>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Résumé
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#0b1424] p-4">
                    <p className="font-serif text-2xl text-white">
                      {q.questions.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Questions</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1424] p-4">
                    <p className="font-serif text-2xl text-white">
                      {q.response_count}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Réponses</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Créé le</span>
                    <span className="text-right text-slate-200">
                      {formatDate(q.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Dernière réponse</span>
                    <span className="text-right text-slate-200">
                      {formatDate(q.last_response_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#ff8a3d]">
                  <WandSparkles className="h-4 w-4" /> Mode IA central
                </div>
                <select
                  value={q.ai_mode}
                  onChange={(e) =>
                    update({ ai_mode: e.target.value as QuestionnaireAiMode })
                  }
                  className={inputClass}
                >
                  {aiModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {aiModes.find((mode) => mode.value === q.ai_mode)?.detail}
                </p>
                <button
                  type="button"
                  onClick={() => void askCreationGuide()}
                  disabled={guideLoading}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#ff6b00]/35 px-3 py-2 text-xs font-bold text-[#ff9a59] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <WandSparkles className="h-3.5 w-3.5" />
                  {guideLoading ? "Analyse en cours…" : "Vérifier avec l’IA"}
                </button>
                {q.ai_mode === "disabled" && <p className="mt-2 text-xs text-slate-500">Le guide de création reste privé ; l’IA est désactivée uniquement pour les répondants.</p>}
                {creationGuide && <p className="mt-3 rounded-xl border border-orange-200/30 bg-orange-50/5 p-3 text-xs leading-5 text-slate-300">{creationGuide}</p>}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Identité du répondant
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Désactivez l’anonymat pour demander des coordonnées. Chaque
                  champ peut être affiché sans être obligatoire.
                </p>
                <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={!q.anonymous_responses}
                    onChange={(event) =>
                      update({ anonymous_responses: !event.target.checked })
                    }
                    className="accent-[#ff6b00]"
                  />
                  Demander l’identité du répondant
                </label>
                <div className="mt-4 space-y-3">
                  {respondentFields.map((field, index) => (
                    <div key={field.key} className="rounded-xl border border-slate-700/80 bg-[#0b1424]/70 p-3">
                      <div className="flex gap-2">
                        <input
                          value={field.label}
                          aria-label={`Libellé du champ ${field.key}`}
                          onChange={(event) =>
                            update({ respondent_fields: respondentFields.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#0b1424] px-2.5 py-2 text-sm text-white outline-none focus:border-[#ff8a3d]"
                        />
                        <button
                          type="button"
                          onClick={() => update({ respondent_fields: respondentFields.filter((_, itemIndex) => itemIndex !== index) })}
                          className="rounded-lg px-2 text-slate-500 hover:text-red-300"
                          aria-label={`Retirer ${field.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <select
                          value={field.type}
                          onChange={(event) => update({ respondent_fields: respondentFields.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as RespondentField["type"] } : item) })}
                          className="rounded-lg border border-slate-700 bg-[#0b1424] px-2 py-1.5 text-xs text-white"
                        >
                          <option value="text">Texte</option><option value="email">Email</option><option value="tel">Téléphone</option><option value="number">Nombre</option><option value="date">Date</option>
                        </select>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input type="checkbox" checked={field.required} onChange={(event) => update({ respondent_fields: respondentFields.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item) })} className="accent-[#ff6b00]" />
                          Obligatoire
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => update({ respondent_fields: [...respondentFields, { key: `champ_${Date.now()}`, label: "Champ personnalisé", type: "text", required: false }] })}
                  className="mt-3 text-xs font-semibold text-[#ff9a59]"
                >
                  + Ajouter un champ personnalisé
                </button>
                <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Limite de réponses
                  <input
                    type="number"
                    min={1}
                    value={q.max_responses ?? ""}
                    onChange={(e) =>
                      update({
                        max_responses: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
            </div>
            )}
          </div>
        )}
        {tab === "questions" && (
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-serif text-2xl text-white">
                  Construire le questionnaire
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Types avancés, sections et logique conditionnelle contrôlée
                  côté serveur.
                </p>
              </div>
              <button
                onClick={addQuestion}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#ff6b00]/40 px-3.5 py-2.5 text-sm font-bold text-[#ff9a59]"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Sections</p>
                <button
                  onClick={() =>
                    update({
                      sections: [
                        ...sections,
                        {
                          id: `section-${Date.now()}`,
                          title: `Section ${sections.length + 1}`,
                          description: "",
                        },
                      ],
                    })
                  }
                  className="text-xs font-semibold text-[#ff9a59]"
                >
                  + Ajouter une section
                </button>
              </div>
              {sections.length > 0 && (
                <div className="mt-3 space-y-2">
                  {sections.map((section) => (
                    <div key={section.id} className="flex gap-2">
                      <input
                        value={section.title}
                        onChange={(e) =>
                          update({
                            sections: sections.map((item) =>
                              item.id === section.id
                                ? { ...item, title: e.target.value }
                                : item,
                            ),
                          })
                        }
                        className="flex-1 rounded-lg border border-slate-700 bg-[#0b1424] px-3 py-2 text-sm text-white"
                      />
                      <button
                        onClick={() =>
                          update({
                            sections: sections.filter(
                              (item) => item.id !== section.id,
                            ),
                            questions: q.questions.map((question) =>
                              question.section_id === section.id
                                ? { ...question, section_id: null }
                                : question,
                            ),
                          })
                        }
                        className="rounded-lg p-2 text-slate-500 hover:text-red-300"
                        aria-label="Supprimer la section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
              <div className="space-y-2 rounded-2xl border border-slate-800 bg-[#101a2b] p-3">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Questions · {q.questions.length}</p>
                  {editingQuestionIndex !== null && <button onClick={() => setEditingQuestionIndex(null)} className="text-xs font-semibold text-slate-400 hover:text-white">Fermer</button>}
                </div>
                {q.questions.length ? q.questions.map((question, index) => {
                  const active = editingQuestionIndex === index;
                  return (
                    <article key={`${question.id ?? "new"}-${index}`} className={`rounded-xl border p-3 transition ${active ? "border-[#ff6b00]/60 bg-[#ff6b00]/10" : "border-slate-800 bg-[#0b1424] hover:border-slate-700"}`}>
                      <button onClick={() => setEditingQuestionIndex(index)} className="w-full text-left">
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{question.prompt || "Question sans libellé"}</p>
                            <p className="mt-1 text-xs text-slate-500">{kindLabel(question.kind)} · {question.required ? "Obligatoire" : "Facultative"}</p>
                          </div>
                        </div>
                      </button>
                      <div className="mt-3 flex gap-2 border-t border-slate-800 pt-2">
                        <button onClick={() => setEditingQuestionIndex(index)} className="text-xs font-semibold text-[#ff9a59]">Modifier</button>
                        <button onClick={() => { if (window.confirm("Supprimer cette question ?")) { update({ questions: q.questions.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, order_index: itemIndex })) }); setEditingQuestionIndex(null); } }} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-300"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
                      </div>
                    </article>
                  );
                }) : <p className="px-2 py-8 text-center text-sm text-slate-500">Ajoutez votre première question.</p>}
              </div>
              <div>
                {editingQuestionIndex !== null && q.questions[editingQuestionIndex] ? (
                  <QuestionEditor
                    key={`${q.questions[editingQuestionIndex].id ?? "new"}-${editingQuestionIndex}`}
                    question={q.questions[editingQuestionIndex]}
                    index={editingQuestionIndex}
                    total={q.questions.length}
                    sections={sections}
                    onChange={(next) => editQuestion(editingQuestionIndex, next)}
                    onDelete={() => {
                      update({ questions: q.questions.filter((_, index) => index !== editingQuestionIndex).map((item, index) => ({ ...item, order_index: index })) });
                      setEditingQuestionIndex(null);
                    }}
                    onDuplicate={() => update({ questions: [...q.questions.slice(0, editingQuestionIndex + 1), { ...q.questions[editingQuestionIndex], id: -Date.now(), prompt: `${q.questions[editingQuestionIndex].prompt} — copie` }, ...q.questions.slice(editingQuestionIndex + 1)].map((item, index) => ({ ...item, order_index: index })) })}
                    onMove={(direction) => moveQuestion(editingQuestionIndex, direction)}
                  />
                ) : (
                  <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-[#101a2b] p-8 text-center text-sm leading-6 text-slate-500">Sélectionnez une question à gauche pour modifier son texte, ses options, sa logique ou sa notation.</div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#101a2b] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">Les changements de la question sélectionnée restent locaux jusqu’à l’enregistrement.</p>
              <button onClick={() => void save()} disabled={saving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff6b00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer les questions
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Logique conditionnelle
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Afficher ou masquer une question selon une réponse.
                  </p>
                </div>
                <button
                  onClick={() =>
                    update({
                      logic_rules: [
                        ...logicRules,
                        {
                          question_id: q.questions[0]?.id ?? 0,
                          target_question_ids: [q.questions[1]?.id ?? 0],
                          operator: "equals",
                          value: "",
                          action: "show",
                        },
                      ],
                    })
                  }
                  disabled={q.questions.length < 2}
                  className="text-xs font-semibold text-[#ff9a59] disabled:opacity-40"
                >
                  + Ajouter une règle
                </button>
              </div>
              {logicRules.map((rule, index) => (
                <div
                  key={index}
                  className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_120px_1fr_auto]"
                >
                  <select
                    value={rule.question_id}
                    onChange={(e) =>
                      update({
                        logic_rules: logicRules.map((item, i) =>
                          i === index
                            ? { ...item, question_id: Number(e.target.value) }
                            : item,
                        ),
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-[#0b1424] px-2 py-2 text-xs text-white"
                  >
                    {q.questions
                      .filter((question) => question.id)
                      .map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.prompt}
                        </option>
                      ))}
                  </select>
                  <select
                    value={rule.target_question_ids[0] ?? ""}
                    onChange={(e) =>
                      update({
                        logic_rules: logicRules.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                target_question_ids: [Number(e.target.value)],
                              }
                            : item,
                        ),
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-[#0b1424] px-2 py-2 text-xs text-white"
                  >
                    {q.questions
                      .filter((question) => question.id)
                      .map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.prompt}
                        </option>
                      ))}
                  </select>
                  <select
                    value={rule.action}
                    onChange={(e) =>
                      update({
                        logic_rules: logicRules.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                action: e.target.value as "show" | "hide",
                              }
                            : item,
                        ),
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-[#0b1424] px-2 py-2 text-xs text-white"
                  >
                    <option value="show">Afficher si</option>
                    <option value="hide">Masquer si</option>
                  </select>
                  <input
                    value={rule.value}
                    onChange={(e) =>
                      update({
                        logic_rules: logicRules.map((item, i) =>
                          i === index
                            ? { ...item, value: e.target.value }
                            : item,
                        ),
                      })
                    }
                    placeholder="réponse attendue"
                    className="rounded-lg border border-slate-700 bg-[#0b1424] px-2 py-2 text-xs text-white"
                  />
                  <button
                    onClick={() =>
                      update({
                        logic_rules: logicRules.filter((_, i) => i !== index),
                      })
                    }
                    className="rounded-lg p-2 text-slate-500 hover:text-red-300"
                    aria-label="Supprimer la règle"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "responses" && (
          <div className="rounded-2xl border border-slate-800 bg-[#101a2b]">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-serif text-2xl text-white">Réponses reçues</h2>
                <p className="mt-1 text-sm text-slate-400">{q.response_count} réponse{q.response_count > 1 ? "s" : ""} enregistrée{q.response_count > 1 ? "s" : ""}. Sélectionnez-en une pour la consulter.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "new", "read", "processed"] as const).map((value) => {
                  const labels = { all: "Toutes", new: "Non lues", read: "À traiter", processed: "Traitées" };
                  const count = value === "all" ? q.responses?.length ?? 0 : (q.responses ?? []).filter((item) => (item.processing_status ?? "new") === value).length;
                  return <button key={value} onClick={() => { setResponseFilter(value); setExpandedResponse(null); }} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${responseFilter === value ? "border-[#ff6b00]/60 bg-[#ff6b00]/15 text-[#ff9a59]" : "border-slate-700 text-slate-400 hover:text-white"}`}>{labels[value]} <span className="ml-1 opacity-70">{count}</span></button>;
                })}
              </div>
            </div>
            {q.responses?.length ? (
              <div className="grid min-h-[34rem] lg:grid-cols-[minmax(19rem,.8fr)_minmax(0,1.2fr)]">
                <div className="max-h-[46rem] overflow-y-auto border-b border-slate-800 lg:border-b-0 lg:border-r">
                  {filteredResponses.length ? filteredResponses.map((response) => {
                    const status = responseStatusMeta(response.processing_status);
                    const selected = response.id === expandedResponse;
                    return (
                      <button key={response.id} onClick={() => selectResponse(response.id)} className={`block w-full border-b border-slate-800 px-5 py-4 text-left transition ${selected ? "bg-[#ff6b00]/10" : "hover:bg-white/[.03]"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{response.respondent_name || "Réponse anonyme"} {response.respondent_post_name ? <span className="font-normal text-slate-400">· {response.respondent_post_name}</span> : null}</p><p className="mt-1 truncate text-xs text-slate-500">{formatDate(response.submitted_at)}{response.respondent_email ? ` · ${response.respondent_email}` : ""}</p></div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs"><span className="text-slate-500">{Object.keys(response.answers).length} réponse{Object.keys(response.answers).length > 1 ? "s" : ""}</span><span className="font-semibold text-slate-300">{response.score == null ? "Non notée" : `${response.score} %`}</span></div>
                      </button>
                    );
                  }) : <p className="p-8 text-center text-sm text-slate-500">Aucune réponse ne correspond à ce filtre.</p>}
                </div>
                <div className="bg-[#0b1424]/45 p-5 sm:p-6">
                  {selectedResponse ? (
                    <div className="mx-auto max-w-2xl">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-5"><div><p className="text-xs font-bold uppercase tracking-wider text-[#ff9a59]">Détail de la réponse</p><h3 className="mt-1 text-xl font-semibold text-white">{selectedResponse.respondent_name || "Réponse anonyme"}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(selectedResponse.submitted_at)}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${responseStatusMeta(selectedResponse.processing_status).className}`}>{responseStatusMeta(selectedResponse.processing_status).label}</span></div>
                      <div className="mt-5 space-y-3">{q.questions.map((question, index) => <article key={question.id} className="rounded-xl border border-slate-800 bg-[#101a2b] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Question {index + 1}</p><p className="mt-1 text-sm font-semibold leading-6 text-white">{question.prompt}</p><p className="mt-3 text-sm leading-6 text-slate-300">{responseValueLabel(selectedResponse.answers[String(question.id)])}</p></article>)}</div>
                      <div className="mt-5 border-t border-slate-800 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Suivi créateur</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={selectedResponse.processing_status ?? "new"} onChange={(event) => void saveFeedback(selectedResponse.id, event.target.value as "new" | "read" | "processed")} className="rounded-lg border border-slate-700 bg-[#101a2b] px-3 py-2 text-xs font-semibold text-white outline-none"><option value="new">Non lue</option><option value="read">Lue — à traiter</option><option value="processed">Traitée</option></select><input value={feedbackDrafts[selectedResponse.id] ?? selectedResponse.feedback} onChange={(event) => setFeedbackDrafts((old) => ({ ...old, [selectedResponse.id]: event.target.value }))} placeholder="Note ou feedback interne" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#101a2b] px-3 py-2 text-sm text-white outline-none" /><button onClick={() => void saveFeedback(selectedResponse.id)} className="rounded-lg border border-[#ff6b00]/40 px-3 py-2 text-xs font-bold text-[#ff9a59]">Enregistrer</button></div></div>
                    </div>
                  ) : <div className="flex h-full min-h-72 items-center justify-center text-center text-sm leading-6 text-slate-500">Choisissez une réponse dans la liste pour afficher son détail ici, sans quitter cette page.</div>}
                </div>
              </div>
            ) : <div className="p-12 text-center text-sm text-slate-400">Les réponses apparaîtront ici dès la première participation.</div>}
          </div>
        )}
        {tab === "stats" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Réponses", stats?.total_responses ?? q.response_count],
                [
                  "Score moyen",
                  stats?.average_score == null
                    ? "—"
                    : `${stats.average_score}%`,
                ],
                [
                  "Minimum",
                  stats?.min_score == null ? "—" : `${stats.min_score}%`,
                ],
                [
                  "Maximum",
                  stats?.max_score == null ? "—" : `${stats.max_score}%`,
                ],
                [
                  "À traiter",
                  (q.responses ?? []).filter((response) => (response.processing_status ?? "new") === "read").length,
                ],
                [
                  "Traitées",
                  (q.responses ?? []).filter((response) => response.processing_status === "processed").length,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 font-serif text-3xl text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-sm font-semibold text-white">Suivi des réponses</p><p className="mt-1 text-xs text-slate-500">Le statut est géré par le créateur depuis l’onglet Réponses.</p></div>
                <div className="flex flex-wrap gap-2">
                  {(["new", "read", "processed"] as const).map((status) => {
                    const item = responseStatusMeta(status);
                    const count = (q.responses ?? []).filter((response) => (response.processing_status ?? "new") === status).length;
                    return <span key={status} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${item.className}`}>{item.label} · {count}</span>;
                  })}
                </div>
              </div>
            </div>
            {stats?.breakdown?.length ? (
              stats.breakdown.map((item) => (
                <div
                  key={item.question_id}
                  className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5"
                >
                  <h3 className="text-sm font-semibold text-white">
                    {item.prompt}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.answered} réponse(s)
                    {item.average != null && ` · moyenne ${item.average}`}
                  </p>
                  <div className="mt-4 space-y-3">
                    {Object.entries(item.counts).map(([answer, count]) => (
                      <div key={answer}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-400">{answer}</span>
                          <span className="text-slate-300">{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-[#ff6b00]"
                            style={{
                              width: `${Math.min(100, ((count as number) / Math.max(1, stats.total_responses)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-sm text-slate-400">
                Les statistiques seront disponibles après les premières
                réponses.
              </div>
            )}
          </div>
        )}
        {tab === "share" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
            <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-6">
              <div className="flex items-center gap-2 text-[#ff914d]">
                <Share2 className="h-5 w-5" />
                <h2 className="font-serif text-2xl text-white">Partager</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Le lien public fonctionne uniquement lorsque le questionnaire
                est publié et ouvert.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={`${window.location.origin}/questionnaire/${q.slug}`}
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#0b1424] px-3.5 py-3 text-sm text-slate-300"
                />
                <button
                  onClick={() => void copyLink()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff6b00] px-4 py-3 text-sm font-bold text-white"
                >
                  <Copy className="h-4 w-4" /> Copier
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`Répondez à ce questionnaire : ${q.title} — ${window.location.origin}/questionnaire/${q.slug}`)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="rounded-xl border border-emerald-400/30 px-4 py-3 text-sm font-bold text-emerald-300"
                >
                  Partager sur WhatsApp
                </button>
                <a
                  href={apiQuestionnaireExportUrl(q.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </a>
              </div>
              <div className="mt-6 flex flex-col items-center rounded-xl border border-slate-700 bg-white p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/questionnaire/${q.slug}`)}`}
                  alt="QR code du questionnaire"
                  className="h-44 w-44"
                />
                <p className="mt-2 text-xs text-slate-500">
                  QR code à partager ou imprimer
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Actions de diffusion
              </p>
              <p className="mt-3 text-sm text-slate-300">
                {q.status === "published"
                  ? "Votre questionnaire est accessible à toute personne disposant du lien."
                  : q.status === "closed"
                    ? "Les réponses sont fermées. Vous pouvez le rouvrir."
                    : "Publiez le questionnaire pour activer le lien public."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {q.status === "published" && (
                  <button
                    onClick={() =>
                      void runAction(
                        () => apiCloseQuestionnaire(q.id),
                        "Questionnaire fermé.",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-bold text-red-300"
                  >
                    <Archive className="h-4 w-4" /> Fermer
                  </button>
                )}
                {q.status === "closed" && (
                  <button
                    onClick={() =>
                      void runAction(
                        () => apiReopenQuestionnaire(q.id),
                        "Questionnaire rouvert.",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 px-4 py-2.5 text-sm font-bold text-emerald-300"
                  >
                    <Share2 className="h-4 w-4" /> Rouvrir
                  </button>
                )}
                {q.status !== "published" && q.status !== "closed" && (
                  <button
                    onClick={() =>
                      void runAction(
                        () => apiPublishQuestionnaire(q.id),
                        "Questionnaire publié.",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-[#ff6b00]/40 px-4 py-2.5 text-sm font-bold text-[#ff9a59]"
                  >
                    <Share2 className="h-4 w-4" /> Publier
                  </button>
                )}
                <button
                  onClick={() =>
                    void runAction(
                      () => apiArchiveQuestionnaire(q.id),
                      "Questionnaire archivé.",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300"
                >
                  <Archive className="h-4 w-4" /> Archiver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function QuestionnairePage() {
  const location = useLocation();
  const idMatch = location.pathname.match(
    /\/(?:dashboard|workspace)\/questionnaires\/(\d+)/,
  );
  return idMatch ? (
    <QuestionnaireDetail id={Number(idMatch[1])} />
  ) : (
    <QuestionnaireList />
  );
}
