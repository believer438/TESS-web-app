// Copie Zentrix Academy : src/pages/PublicQuestionnairePage.tsx
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Download,
  Eye,
  FileText,
  Loader2,
  Send,
  WandSparkles,
} from "lucide-react";
import {
  apiDownloadQuestionnaireResponseDocument,
  apiGetPublicQuestionnaire,
  apiGetQuestionnaire,
  apiQuestionnaireAi,
  apiSubmitQuestionnaireResponse,
  type Questionnaire,
  type QuestionnaireQuestion,
  type RespondentField,
} from "@/lib/api-client";

const inputClass =
  "mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/10";

function ClarificationReply({ children }: { children: string }) {
  const content = children.replace(/\\+([|*_`])/g, "$1");
  return (
    <div className="mt-2 rounded-lg bg-orange-50 p-3 text-xs leading-5 text-slate-700 [&_p+_p]:mt-2 [&_strong]:font-bold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function ReviewAnswer({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return <span className="italic text-slate-400">Aucune réponse</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {value.map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <dl className="mt-2 space-y-1.5">
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div key={key} className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-slate-600">{key} :</dt>
            <dd>{String(item)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <>{String(value)}</>;
}

function normaliseRespondentFields(
  fields: Questionnaire["respondent_fields"],
): RespondentField[] {
  const defaults: Record<string, RespondentField> = {
    name: { key: "name", label: "Nom", type: "text", required: true },
    post_name: { key: "post_name", label: "Post-nom", type: "text", required: true },
    email: { key: "email", label: "Email", type: "email", required: false },
    phone: { key: "phone", label: "Téléphone", type: "tel", required: false },
  };
  return fields.flatMap((field) =>
    typeof field === "string"
      ? [defaults[field] ?? { key: field, label: field.replace(/_/g, " "), type: "text", required: false }]
      : [field],
  );
}

function matchesRule(
  value: unknown,
  operator: string,
  expected: unknown,
): boolean {
  const values = Array.isArray(value) ? value : [value];
  if (operator === "answered")
    return (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0)
    );
  if (operator === "not_answered")
    return !matchesRule(value, "answered", expected);
  if (operator === "contains")
    return values.some((item) => String(item) === String(expected));
  if (operator === "in")
    return (Array.isArray(expected) ? expected : [expected]).some((item) =>
      values.some((valueItem) => String(valueItem) === String(item)),
    );
  if (["gt", "gte", "lt", "lte"].includes(operator)) {
    const left = Number(value);
    const right = Number(expected);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    return operator === "gt"
      ? left > right
      : operator === "gte"
        ? left >= right
        : operator === "lt"
          ? left < right
          : left <= right;
  }
  return operator === "not_equals"
    ? String(value) !== String(expected)
    : String(value) === String(expected);
}

function isVisible(
  question: QuestionnaireQuestion,
  questionnaire: Questionnaire,
  answers: Record<string, unknown>,
) {
  const rules = questionnaire.logic_rules ?? [];
  const relevant = rules.filter((rule) => {
    const targets = rule.target_question_ids ?? rule.targets ?? [];
    return (Array.isArray(targets) ? targets : [targets]).some(
      (target) => String(target) === String(question.id),
    );
  });
  return relevant.every((rule) => {
    const source = String(rule.question_id ?? rule.source_question_id ?? "");
    const matched = matchesRule(
      answers[source],
      String(rule.operator ?? "equals"),
      rule.value,
    );
    return String(rule.action ?? "show") === "hide" ? !matched : matched;
  });
}

function InputQuestion({
  question,
  value,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const options = question.options.length
    ? question.options
    : question.kind === "yes_no"
      ? ["Oui", "Non"]
      : question.kind === "true_false"
        ? ["Vrai", "Faux"]
        : ["1", "2", "3", "4", "5"];
  if (question.kind === "long_text")
    return (
      <textarea
        rows={5}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y`}
        placeholder="Votre réponse"
      />
    );
  if (["single_choice", "yes_no", "true_false"].includes(question.kind)) {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${value === option ? "border-[#ff6b00] bg-[#fff4ed] text-[#b54700]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 accent-[#ff6b00]"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }
  if (question.kind === "multiple_choice") {
    const settings = question.settings ?? {};
    const minItems = Number(settings.min_items ?? 0);
    const maxItems = Number(settings.max_items ?? 0);
    const selectedValues = Array.isArray(value) ? value : [];
    // A creator can use a multiple-choice question while restricting it to
    // one answer. In that case, present a genuine single-choice control;
    // showing checkboxes made the configured rule unclear to respondents.
    const singleSelection = maxItems === 1;
    return (
      <div className="mt-3">
        {(minItems > 0 || maxItems > 0) && (
          <p className="mb-2 text-xs font-medium text-slate-500">
            {singleSelection
              ? "Choisissez une seule réponse."
              : <>{minItems > 0 ? `Au moins ${minItems}` : ""}{minItems > 0 && maxItems > 0 ? " · " : ""}{maxItems > 0 ? `au plus ${maxItems}` : ""} sélection{maxItems > 1 || minItems > 1 ? "s" : ""}.</>}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const selected = selectedValues.includes(option);
            const limitReached = !singleSelection && !selected && maxItems > 0 && selectedValues.length >= maxItems;
            return (
              <label
                key={option}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${selected ? "cursor-pointer border-[#ff6b00] bg-[#fff4ed] text-[#b54700]" : limitReached ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400" : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
              >
                <input
                  type={singleSelection ? "radio" : "checkbox"}
                  name={singleSelection ? `q-${question.id}` : undefined}
                  disabled={limitReached}
                  checked={selected}
                  onChange={(e) => onChange(singleSelection ? [option] : e.target.checked ? [...selectedValues, option] : selectedValues.filter((item) => item !== option))}
                  className="h-4 w-4 accent-[#ff6b00]"
                />
                {option}
              </label>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.kind === "select")
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">Sélectionner une option</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    );
  if (question.kind === "scale" || question.kind === "rating")
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => onChange(option)}
            className={`flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-bold transition ${String(value) === option ? "border-[#ff6b00] bg-[#ff6b00] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#ff6b00]"}`}
          >
            {question.kind === "rating" ? `${option} ★` : option}
          </button>
        ))}
      </div>
    );
  if (question.kind === "ranking")
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">Choisir un rang</option>
        {options.map((option, index) => (
          <option value={option} key={option}>
            {index + 1}. {option}
          </option>
        ))}
      </select>
    );
  if (question.kind === "matrix") {
    const settings = question.settings ?? {};
    const rows = Array.isArray(settings.rows) ? settings.rows : options;
    const columns = Array.isArray(settings.columns)
      ? settings.columns
      : ["Oui", "Non"];
    const current = (value && typeof value === "object" ? value : {}) as Record<
      string,
      string
    >;
    return (
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="p-3 text-left font-semibold text-slate-600">
                Élément
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  className="p-3 text-center font-semibold text-slate-600"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row} className="border-b border-slate-100 last:border-0">
                <td className="p-3 text-slate-700">{row}</td>
                {columns.map((column) => (
                  <td key={column} className="p-3 text-center">
                    <input
                      type="radio"
                      name={`matrix-${question.id}-${row}`}
                      checked={current[row] === column}
                      onChange={() => onChange({ ...current, [row]: column })}
                      className="h-4 w-4 accent-[#ff6b00]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const type =
    question.kind === "date"
      ? "date"
      : question.kind === "time"
        ? "time"
        : question.kind === "number" || question.kind === "percentage"
          ? "number"
          : question.kind === "email"
            ? "email"
            : question.kind === "phone"
              ? "tel"
              : "text";
  return (
    <input
      type={type}
      min={question.kind === "percentage" ? 0 : undefined}
      max={question.kind === "percentage" ? 100 : undefined}
      value={String(value ?? "")}
      onChange={(e) =>
        onChange(
          type === "number"
            ? e.target.value === ""
              ? ""
              : Number(e.target.value)
            : e.target.value,
        )
      }
      className={inputClass}
      placeholder={question.kind === "percentage" ? "0 à 100" : "Votre réponse"}
    />
  );
}

export default function PublicQuestionnairePage() {
  const { slug = "", id = "" } = useParams();
  const preview = Boolean(id);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [respondent, setRespondent] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submission, setSubmission] = useState<{
    responseId: number;
    documentToken: string;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({});

  useEffect(() => {
    const request = preview
      ? apiGetQuestionnaire(Number(id))
      : apiGetPublicQuestionnaire(slug);
    request
      .then(setQuestionnaire)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Ce questionnaire n’est pas disponible.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id, preview, slug]);

  const visibleQuestions = useMemo(
    () =>
      questionnaire?.questions.filter((question) =>
        isVisible(question, questionnaire, answers),
      ) ?? [],
    [answers, questionnaire],
  );
  // The respondent view is deliberately a complete, scrollable form. It keeps
  // identity fields visible before questions and lets someone review every
  // section before sending their response.
  const progressive = false;
  const keyFor = (question: QuestionnaireQuestion) =>
    String(question.id ?? question.order_index ?? question.prompt);
  const setAnswer = (question: QuestionnaireQuestion, value: unknown) =>
    setAnswers((old) => ({ ...old, [keyFor(question)]: value }));
  const setRespondentField = (field: string, value: string) =>
    setRespondent((old) => ({ ...old, [field]: value }));
  const askAi = async (question: QuestionnaireQuestion) => {
    if (preview || questionnaire?.ai_mode === "disabled") return;
    const key = keyFor(question);
    setAiLoading(key);
    try {
      const result = await apiQuestionnaireAi(slug, {
        question_id: question.id,
        mode: "guide",
        message:
          "Peux-tu m'expliquer clairement cette consigne sans répondre à ma place ?",
      });
      setAiReplies((old) => ({ ...old, [key]: result.reply }));
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "L'assistance IA est indisponible.",
      );
    } finally {
      setAiLoading(null);
    }
  };

  const validateResponse = () => {
    if (!questionnaire || preview) return;
    const identityFields = questionnaire.anonymous_responses
      ? []
      : normaliseRespondentFields(questionnaire.respondent_fields ?? []);
    const missingIdentity = identityFields.find(
      (field) => field.required && !respondent[field.key]?.trim(),
    );
    if (missingIdentity) {
      setSubmitError(`Renseignez le champ obligatoire : ${missingIdentity.label}`);
      return false;
    }
    const current = progressive ? visibleQuestions[currentIndex] : undefined;
    const missing = (current ? [current] : visibleQuestions).find(
      (question) => {
        if (!question.required) return false;
        const value = answers[keyFor(question)];
        return (
          value == null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        );
      },
    );
    if (missing) {
      setSubmitError(`Répondez à la question : ${missing.prompt}`);
      document
        .getElementById(`question-${keyFor(missing)}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    const invalidMultiple = (current ? [current] : visibleQuestions).find((question) => {
      if (question.kind !== "multiple_choice") return false;
      const settings = question.settings ?? {};
      const selection = answers[keyFor(question)];
      const count = Array.isArray(selection) ? selection.length : 0;
      const min = Number(settings.min_items ?? 0);
      const max = Number(settings.max_items ?? 0);
      return (min > 0 && count < min) || (max > 0 && count > max);
    });
    if (invalidMultiple) {
      setSubmitError(`Respectez le nombre de choix demandé pour : ${invalidMultiple.prompt}`);
      return false;
    }
    if (progressive && currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex((index) => index + 1);
      setSubmitError("");
      return false;
    }
    setSubmitError("");
    return true;
  };

  const openReview = (event: FormEvent) => {
    event.preventDefault();
    if (!validateResponse()) return;
    setReviewing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!questionnaire || preview || !validateResponse()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await apiSubmitQuestionnaireResponse(slug, {
        respondent_name: respondent.name ?? "",
        respondent_post_name: respondent.post_name ?? "",
        respondent_email: respondent.email ?? "",
        respondent_phone: respondent.phone ?? "",
        respondent_data: respondent,
        answers,
      });
      setSubmission({
        responseId: result.response_id,
        documentToken: result.document_token,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Votre réponse n’a pas pu être envoyée.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceipt = async () => {
    if (!submission) return;
    setDownloading(true);
    setSubmitError("");
    try {
      await apiDownloadQuestionnaireResponseDocument(
        slug,
        submission.responseId,
        submission.documentToken,
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Le document n’a pas pu être téléchargé.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading)
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f7f4ef] p-6">
        <div className="w-full max-w-2xl animate-pulse space-y-4">
          <div className="h-12 w-2/3 rounded bg-slate-200" />
          <div className="h-5 w-full rounded bg-slate-200" />
          <div className="h-48 rounded-2xl bg-white shadow-sm" />
          <div className="h-48 rounded-2xl bg-white shadow-sm" />
        </div>
      </main>
    );
  if (error || !questionnaire)
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f7f4ef] p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#ff6b00]">
            <CircleAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-serif text-2xl text-[#162238]">
            Questionnaire indisponible
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || "Ce lien n’est plus actif ou n’existe pas."}
          </p>
        </div>
      </main>
    );
  if (submitted)
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f7f4ef] p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#ff6b00]">
            Réponse envoyée
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[#162238]">
            {questionnaire.show_confirmation
              ? questionnaire.confirmation_message
              : "Merci pour votre participation."}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Votre réponse a bien été enregistrée. Votre copie Word est maintenant disponible.
          </p>
          {submission && (
            <button
              type="button"
              onClick={() => void downloadReceipt()}
              disabled={downloading}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff6b00] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/10 transition hover:bg-[#e56000] disabled:opacity-60"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Télécharger ma copie Word
            </button>
          )}
          {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}
        </div>
      </main>
    );

  const fields = questionnaire.anonymous_responses
    ? []
    : normaliseRespondentFields(questionnaire.respondent_fields ?? ["name", "post_name"]);
  const shownQuestions = progressive
    ? visibleQuestions.slice(currentIndex, currentIndex + 1)
    : visibleQuestions;
  const sectionFor = (question: QuestionnaireQuestion) =>
    questionnaire.sections?.find(
      (section) => String(section.id) === String(question.section_id),
    );
  return (
    <main className="min-h-[100dvh] bg-[#f7f4ef] px-4 py-8 text-[#162238] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {preview && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
            <Eye className="h-4 w-4" /> Mode prévisualisation — aucune réponse
            ne sera envoyée.
          </div>
        )}
        <header className="mb-8 border-b border-slate-200 pb-7 sm:mb-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#ff6b00]">
            <span className="h-2 w-2 rounded-full bg-[#ff6b00]" /> Zentrix
            Academy
          </div>
          <h1 className="mt-5 font-serif text-3xl leading-tight sm:text-5xl">
            {questionnaire.title}
          </h1>
          {questionnaire.description && (
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {questionnaire.description}
            </p>
          )}
          {questionnaire.intro_message && (
            <p className="mt-4 rounded-xl bg-white/70 p-4 text-sm leading-6 text-slate-600">
              {questionnaire.intro_message}
            </p>
          )}
          <p className="mt-5 text-xs text-slate-500">
            {visibleQuestions.length} question
            {visibleQuestions.length > 1 ? "s" : ""}
            {questionnaire.author_name ? ` · ${questionnaire.author_name}` : ""}
            {progressive
              ? ` · ${currentIndex + 1}/${visibleQuestions.length}`
              : ""}
          </p>
        </header>
        <form onSubmit={reviewing ? submit : openReview}>
          {reviewing ? (
            <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex items-start gap-3 border-b border-slate-200 pb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e7] text-[#c24d00]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff6b00]">Feuille de réponse</p>
                  <h2 className="mt-1 text-xl font-bold text-[#162238]">Vérifiez avant l’envoi</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Cette copie reprend les informations et réponses qui seront enregistrées. Le document Word sera disponible juste après votre confirmation.</p>
                </div>
              </div>
              {fields.some((field) => respondent[field.key]?.trim()) && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Vos coordonnées</h3>
                  <dl className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {fields.filter((field) => respondent[field.key]?.trim()).map((field) => (
                      <div key={field.key} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                        <dt className="text-sm font-semibold text-slate-600">{field.label}</dt>
                        <dd className="text-sm text-slate-900">{respondent[field.key]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              <div className="mt-7">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Questions et réponses</h3>
                <div className="mt-3 space-y-4">
                  {visibleQuestions.map((question, index) => (
                    <article key={keyFor(question)} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="bg-slate-50 px-4 py-3">
                        <p className="text-sm font-bold leading-6 text-[#162238]">{index + 1}. {question.prompt}</p>
                        {question.description && <p className="mt-1 text-xs leading-5 text-slate-500">{question.description}</p>}
                      </div>
                      <div className="px-4 py-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-900">Réponse : </span><ReviewAnswer value={answers[keyFor(question)]} /></div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <>
          {fields.length > 0 && (
            <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Vos coordonnées
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <label
                    key={field.key}
                    className="text-sm font-semibold text-slate-700"
                  >
                    {field.label}
                    {field.required && <span className="ml-1 text-[#ff6b00]">*</span>}
                    <input
                      type={field.type}
                      required={field.required}
                      value={respondent[field.key] ?? ""}
                      onChange={(e) =>
                        setRespondentField(field.key, e.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/10"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}
          {shownQuestions.map((question, index) => {
            const section = sectionFor(question);
            const questionKey = keyFor(question);
            return (
              <div key={questionKey}>
                {section && (index === 0 || String(shownQuestions[index - 1]?.section_id ?? "") !== String(question.section_id ?? "")) && (
                  <div className="mb-3 mt-6">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff6b00]">
                      {section.title}
                    </p>
                    {section.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {section.description}
                      </p>
                    )}
                  </div>
                )}
                <section
                  id={`question-${questionKey}`}
                  className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fff0e7] text-xs font-bold text-[#c24d00]">
                      {progressive
                        ? currentIndex + 1
                        : visibleQuestions.indexOf(question) + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <label className="block text-base font-bold leading-6 text-[#162238]">
                        {question.prompt}
                        {question.required && (
                          <span
                            className="ml-1 text-[#ff6b00]"
                            title="Obligatoire"
                          >
                            *
                          </span>
                        )}
                      </label>
                      {question.description && (
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {question.description}
                        </p>
                      )}
                      <InputQuestion
                        question={question}
                        value={answers[questionKey]}
                        onChange={(value) => setAnswer(question, value)}
                      />
                      {question.note && (
                        <p className="mt-2 text-xs text-slate-400">
                          {question.note}
                        </p>
                      )}
                      {!preview && questionnaire.ai_mode !== "disabled" && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => void askAi(question)}
                            disabled={aiLoading === questionKey}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-[#c24d00] hover:text-[#ff6b00] disabled:opacity-60"
                          >
                            {aiLoading === questionKey ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <WandSparkles className="h-3.5 w-3.5" />
                            )}{" "}
                            Demander une clarification
                          </button>
                          {aiReplies[questionKey] && <ClarificationReply>{aiReplies[questionKey]}</ClarificationReply>}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            );
          })}
            </>
          )}
          {submitError && (
            <div className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <CircleAlert className="h-5 w-5 shrink-0" />
              {submitError}
            </div>
          )}
          {!preview && (
            <div className="flex flex-col items-stretch justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
              <p className="text-xs leading-5 text-slate-500">
                Les champs marqués d’un astérisque sont obligatoires.
              </p>
              <div className="flex gap-2">
                {reviewing ? (
                  <button
                    type="button"
                    onClick={() => setReviewing(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" /> Modifier mes réponses
                  </button>
                ) : progressive && currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => index - 1)}
                    className="rounded-xl border border-slate-300 px-5 py-3.5 text-sm font-bold text-slate-700"
                  >
                    Retour
                  </button>
                )}
                <button
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff6b00] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/10 transition hover:bg-[#e56000] disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}{" "}
                  {reviewing
                    ? "Confirmer l’envoi"
                    : progressive && currentIndex < visibleQuestions.length - 1
                      ? "Continuer"
                      : "Vérifier mes réponses"}
                </button>
              </div>
            </div>
          )}
        </form>
        {questionnaire.footer_note && (
          <p className="pt-8 text-center text-xs text-slate-400">
            {questionnaire.footer_note}
          </p>
        )}
        <footer className="pt-8 text-center text-xs text-slate-400">
          Propulsé par Zentrix Academy
        </footer>
      </div>
    </main>
  );
}
