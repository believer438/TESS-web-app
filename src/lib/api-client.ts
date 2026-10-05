// TESS API client.
import { buildApiUrl, buildTessApiUrl } from "./env";
import type { AIActivitySource, AIActivityStep, CatalogueCourse, BackendChapter } from "./backend-types";
export type { CatalogueCourse, BackendChapter } from "./backend-types";

// Navigation remounts several pages. Keep successful reads briefly in memory
// and share an in-flight request so entering a page never triggers duplicate
// calls (including React development strict-mode effects). Mutations clear the
// cache immediately, therefore newly saved content is never held stale.
const READ_CACHE_TTL_MS = 20_000;
const readCache = new Map<string, { expiresAt: number; response: Response }>();
const inFlightReads = new Map<string, Promise<Response>>();
let readCacheRevision = 0;

function clearReadCache(): void {
  readCacheRevision += 1;
  readCache.clear();
  inFlightReads.clear();
}

const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    clearReadCache();
    return fetch(input, { ...init, credentials: "include" });
  }

  const key = `${String(input)}::${getToken() ?? "cookie-session"}`;
  const cached = readCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.response.clone();
  if (cached) readCache.delete(key);

  const existing = inFlightReads.get(key);
  if (existing) return existing.then((response) => response.clone());

  const requestRevision = readCacheRevision;
  const pending = fetch(input, { ...init, credentials: "include" });
  inFlightReads.set(key, pending);
  try {
    const response = await pending;
    if (response.ok && requestRevision === readCacheRevision) {
      readCache.set(key, { expiresAt: Date.now() + READ_CACHE_TTL_MS, response: response.clone() });
    }
    return response;
  } finally {
    if (inFlightReads.get(key) === pending) inFlightReads.delete(key);
  }
};

const TOKEN_KEY = "tess-ai-token";
const SESSION_KEY = "tess-ai-session";
const OAUTH_SESSION_KEY = "tess-ai-oauth-session";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  clearReadCache();
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("auth-state-changed"));
}
export function markOAuthSession(): void {
  clearReadCache();
  localStorage.setItem(OAUTH_SESSION_KEY, "1");
}
export function clearOAuthSession(): void {
  localStorage.removeItem(OAUTH_SESSION_KEY);
}
export function clearAuth(options: { revokeRemote?: boolean } = {}): void {
  clearReadCache();
  const token = getToken();
  // Revoke only from an explicit user logout while the token is still
  // usable. A 401 handler must clear local state silently: sending an already
  // invalid token to /logout only creates a second, misleading 401.
  if (options.revokeRemote !== false && token && token !== "__cookie_session__") {
    void apiFetch(buildTessApiUrl("/auth/logout"), {
      method: "POST",
      headers: { ...authHeaders() },
    }).catch(() => {});
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(OAUTH_SESSION_KEY);
  window.dispatchEvent(new Event("auth-state-changed"));
}
export function isAuthenticated(): boolean {
  return !!getToken() || localStorage.getItem(OAUTH_SESSION_KEY) === "1";
}

/** Session de conversation, conservée pour rattacher un chat invité après login. */
export function getConversationSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function rememberConversationSessionId(sessionId: string): void {
  if (sessionId.trim()) localStorage.setItem(SESSION_KEY, sessionId.trim());
}

export function clearConversationSessionId(): void {
  localStorage.removeItem(SESSION_KEY);
}
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token && token !== "__cookie_session__"
    ? { Authorization: `Bearer ${token}` }
    : {};
}

export interface ApiError {
  detail?: unknown;
}

export function apiErrorMessage(
  error: unknown,
  fallback = "Une erreur temporaire est survenue.",
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lowered = raw.toLowerCase();
  if (
    lowered.includes("429") ||
    lowered.includes("quota") ||
    lowered.includes("rate limit") ||
    lowered.includes("limite")
  ) {
    return "Le service IA a temporairement atteint sa limite. Réessayez dans quelques instants.";
  }
  if (
    lowered.includes("trop court") ||
    lowered.includes("insuffisant") ||
    lowered.includes("vérifiable")
  ) {
    return raw;
  }
  if (
    lowered.includes("timeout") ||
    lowered.includes("network") ||
    lowered.includes("connexion")
  ) {
    return "La connexion au service a expiré. Vérifiez votre connexion puis réessayez.";
  }
  if (
    lowered.includes("api key") ||
    lowered.includes("authentication") ||
    lowered.includes("unauthorized")
  ) {
    return "Le service IA n'est pas disponible pour le moment. Réessayez plus tard.";
  }
  if (
    lowered.includes("gemini") ||
    lowered.includes("openrouter") ||
    lowered.includes("openai") ||
    lowered.includes("traceback")
  ) {
    return "Le service IA est temporairement indisponible. Réessayez dans quelques instants.";
  }
  return raw || fallback;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur réseau" }));
    if (res.status === 401) clearAuth({ revokeRemote: false });
    const detail = (err as ApiError).detail;
    let message: string;
    if (typeof detail === "string") {
      message = apiErrorMessage(
        detail,
        res.status === 401
          ? "Email ou mot de passe incorrect."
          : "Erreur inconnue",
      );
    } else if (Array.isArray(detail)) {
      // FastAPI validation errors: [{loc, msg, type}]
      message = detail
        .map(
          (d: { msg?: string; loc?: string[] }) => d.msg ?? JSON.stringify(d),
        )
        .join(", ");
    } else if (detail) {
      message = JSON.stringify(detail);
    } else {
      message =
        res.status === 401
          ? "Email ou mot de passe incorrect."
          : "Erreur inconnue";
    }
    throw new Error(apiErrorMessage(message, message));
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  session_id: string;
  user_id: string;
  device_id?: string | null;
}

export async function apiRegister(
  email: string,
  fullName: string,
  password: string,
): Promise<AuthTokenResponse> {
  const res = await apiFetch(buildTessApiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      display_name: fullName.trim(),
      password,
    }),
  });
  return handleResponse(res);
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<AuthTokenResponse> {
  const res = await apiFetch(buildTessApiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return handleResponse(res);
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url?: string | null;
  bio?: string | null;
  preferred_language?: string | null;
  learning_profile?: LearningProfile;
  onboarding_completed?: boolean;
  created_at?: string | null;
  is_active?: boolean;
}

export interface LearningProfile {
  goals: string[];
  level: "beginner" | "intermediate" | "advanced" | "expert";
  interests: string[];
  weekly_time: "15" | "30" | "60" | "120" | "more";
  preferred_style: "practice" | "theory" | "mixed";
  target_date?: string;
  updated_at?: string;
}

/** Les anciens comptes incomplets doivent repasser par tout l'onboarding. */
export function needsLearningProfile(profile: Pick<UserProfile, "learning_profile" | "onboarding_completed">): boolean {
  const learning = profile.learning_profile;
  return profile.onboarding_completed !== true
    || !learning
    || !Array.isArray(learning.goals) || learning.goals.length === 0
    || !Array.isArray(learning.interests) || learning.interests.length === 0
    || !learning.level || !learning.weekly_time || !learning.preferred_style;
}

export async function apiGetMe(): Promise<UserProfile> {
  const res = await apiFetch(buildTessApiUrl("/auth/me"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUpdateMe(payload: {
  full_name?: string;
  password?: string;
  avatar_url?: string;
  bio?: string;
  preferred_language?: string;
  learning_profile?: LearningProfile;
  onboarding_completed?: boolean;
}): Promise<UserProfile> {
  const res = await apiFetch(buildTessApiUrl("/auth/me"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export function getGoogleLoginUrl(): string {
  return buildTessApiUrl("/auth/google/login");
}

// ── Cours (personal documents for AI) ─────────────────────────────────────────

export interface BackendCours {
  id: number;
  titre: string;
  fichier_chemin?: string;
  file_type?: string;
  file_size?: number;
  user_id: number;
  created_at?: string;
  analysis_result?: string | null;
  questions_result?: string | null;
  analyzed_at?: string | null;
  has_analysis?: boolean;
  extracted_length?: number;
}

export async function apiGetMyCours(): Promise<BackendCours[]> {
  const res = await apiFetch(buildApiUrl("/cours/my_cours/"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetCours(id: number): Promise<BackendCours> {
  const res = await apiFetch(buildApiUrl(`/cours/${id}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUploadCours(
  titre: string,
  file: File,
): Promise<{ message: string; cours: BackendCours }> {
  const form = new FormData();
  form.append("titre", titre);
  form.append("file", file);
  const res = await apiFetch(buildApiUrl("/cours/upload_cours/"), {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  return handleResponse(res);
}

export async function apiDeleteCours(id: number): Promise<{ message: string }> {
  const res = await apiFetch(buildApiUrl(`/cours/${id}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUpdateCours(
  id: number,
  titre: string,
): Promise<{ message: string; cours: BackendCours }> {
  const form = new FormData();
  form.append("titre", titre);
  const res = await apiFetch(buildApiUrl(`/cours/${id}`), {
    method: "PUT",
    headers: { ...authHeaders() },
    body: form,
  });
  return handleResponse(res);
}

export async function apiSaveAnalysis(
  id: number,
  analysisResult: string,
  questionsResult: string,
): Promise<void> {
  const res = await apiFetch(buildApiUrl(`/cours/${id}/save_analysis`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      analysis_result: analysisResult,
      questions_result: questionsResult,
    }),
  });
  if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
}

export async function apiGetProgress(
  coursId: number,
): Promise<{ cours_id: number; percent_complete: number }> {
  const res = await apiFetch(buildApiUrl(`/cours/${coursId}/progress`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUpdateProgress(
  coursId: number,
  percent: number,
): Promise<{ percent_complete: number }> {
  const res = await apiFetch(buildApiUrl(`/cours/${coursId}/progress`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ percent_complete: percent }),
  });
  return handleResponse(res);
}

export interface SummarizeResult {
  summary: string;
  status: string;
}

export async function apiSummarizeCours(
  id: number,
  customInstruction?: string,
): Promise<SummarizeResult> {
  const res = await apiFetch(buildApiUrl(`/cours/summarize_cours/${id}`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ custom_instruction: customInstruction ?? null }),
  });
  return handleResponse(res);
}

export interface QuestionsResult {
  questions: unknown;
  structured: boolean;
  status: string;
}

export async function apiGenerateQuestions(
  id: number,
  options?: { customInstruction?: string; structured?: boolean },
): Promise<QuestionsResult> {
  const res = await apiFetch(buildApiUrl(`/cours/generate_questions/${id}`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      custom_instruction: options?.customInstruction ?? null,
      structured: options?.structured ?? false,
    }),
  });
  return handleResponse(res);
}

// ── Catalogue ─────────────────────────────────────────────────────────────────

export async function apiGetCatalogue(params?: {
  category?: string;
  search?: string;
}): Promise<CatalogueCourse[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);
  const url = buildApiUrl(`/courses/?${qs.toString()}`);
  const res = await apiFetch(url, { headers: { ...authHeaders() } });
  return handleResponse(res);
}

export interface CourseRecommendation extends CatalogueCourse {
  recommendation_score?: number;
  recommendation_reasons?: string[];
}

export async function apiGetCourseRecommendations(limit = 6): Promise<CourseRecommendation[]> {
  const res = await apiFetch(buildApiUrl(`/courses/recommendations?limit=${limit}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetCatalogueCategories(): Promise<string[]> {
  const res = await apiFetch(buildApiUrl("/courses/categories"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetCatalogueAllAdmin(): Promise<CatalogueCourse[]> {
  const res = await apiFetch(buildApiUrl("/courses/all"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetCatalogueCourse(
  id: number,
): Promise<CatalogueCourse> {
  const res = await apiFetch(buildApiUrl(`/courses/${id}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetCourseChapters(
  courseId: number,
): Promise<BackendChapter[]> {
  const res = await apiFetch(buildApiUrl(`/courses/${courseId}/chapters`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiEnrollCourse(
  id: number,
): Promise<{ message: string; enrolled: boolean }> {
  const res = await apiFetch(buildApiUrl(`/courses/${id}/enroll`), {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUnenrollCourse(
  id: number,
): Promise<{ message: string; enrolled: boolean }> {
  const res = await apiFetch(buildApiUrl(`/courses/${id}/enroll`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetMyEnrollments(): Promise<CatalogueCourse[]> {
  const res = await apiFetch(buildApiUrl("/courses/my-enrollments"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiCreateCourse(payload: {
  title: string;
  description: string;
  category: string;
  cover_image: string;
  level: string;
  duration_hours: number;
  instructor_name: string;
  is_published: boolean;
  tags: string;
}): Promise<CatalogueCourse> {
  const res = await apiFetch(buildApiUrl("/courses/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiUpdateCourse(
  id: number,
  payload: Partial<{
    title: string;
    description: string;
    category: string;
    cover_image: string;
    level: string;
    duration_hours: number;
    instructor_name: string;
    is_published: boolean;
    tags: string;
  }>,
): Promise<CatalogueCourse> {
  const res = await apiFetch(buildApiUrl(`/courses/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiPublishCourse(id: number): Promise<CatalogueCourse> {
  const res = await apiFetch(buildApiUrl(`/courses/${id}/publish`), {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiDeleteCourse(
  id: number,
): Promise<{ message: string }> {
  const res = await apiFetch(buildApiUrl(`/courses/${id}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiCreateChapter(
  courseId: number,
  payload: {
    title: string;
    description: string;
    content: string;
    order_index: number;
    video_url: string;
    video_position?: string;
    duration_min: number;
  },
): Promise<BackendChapter> {
  const res = await apiFetch(buildApiUrl(`/courses/${courseId}/chapters`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiUpdateChapter(
  courseId: number,
  chapterId: number,
  payload: Partial<{
    title: string;
    description: string;
    content: string;
    order_index: number;
    video_url: string;
    video_position: string;
    duration_min: number;
  }>,
): Promise<BackendChapter> {
  const res = await apiFetch(
    buildApiUrl(`/courses/${courseId}/chapters/${chapterId}`),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse(res);
}

export async function apiDuplicateChapter(
  courseId: number,
  chapterId: number,
): Promise<BackendChapter> {
  const res = await apiFetch(
    buildApiUrl(`/courses/${courseId}/chapters/${chapterId}/duplicate`),
    {
      method: "POST",
      headers: { ...authHeaders() },
    },
  );
  return handleResponse(res);
}

export async function apiDeleteChapter(
  courseId: number,
  chapterId: number,
): Promise<{ message: string }> {
  const res = await apiFetch(
    buildApiUrl(`/courses/${courseId}/chapters/${chapterId}`),
    {
      method: "DELETE",
      headers: { ...authHeaders() },
    },
  );
  return handleResponse(res);
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export interface BackendNote {
  id: number;
  titre: string;
  contenu: string;
  cours_id: number | null;
  user_id: number;
  folder: string;
  is_favorite: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendNoteFolder {
  id: number;
  name: string;
  note_count: number;
  created_at: string | null;
}

export async function apiGetNotes(): Promise<BackendNote[]> {
  const res = await apiFetch(buildApiUrl("/notes/"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetTrashNotes(): Promise<BackendNote[]> {
  const res = await apiFetch(buildApiUrl("/notes/trash"), { headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function apiGetNoteFolders(): Promise<BackendNoteFolder[]> {
  const res = await apiFetch(buildApiUrl("/notes/folders"), { headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function apiCreateNoteFolder(name: string): Promise<BackendNoteFolder> {
  const res = await apiFetch(buildApiUrl("/notes/folders"), { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ name }) });
  return handleResponse(res);
}

export async function apiDeleteNoteFolder(id: number): Promise<{ message: string }> {
  const res = await apiFetch(buildApiUrl(`/notes/folders/${id}`), { method: "DELETE", headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function apiCreateNote(payload: {
  titre: string;
  contenu: string;
  cours_id?: number;
  folder?: string;
  is_favorite?: boolean;
}): Promise<BackendNote> {
  const res = await apiFetch(buildApiUrl("/notes/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiUpdateNote(
  id: number,
  payload: { titre?: string; contenu?: string; folder?: string; is_favorite?: boolean },
): Promise<BackendNote> {
  const res = await apiFetch(buildApiUrl(`/notes/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiDeleteNote(id: number): Promise<{ message: string; note?: BackendNote }> {
  const res = await apiFetch(buildApiUrl(`/notes/${id}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiRestoreNote(id: number): Promise<BackendNote> {
  const res = await apiFetch(buildApiUrl(`/notes/${id}/restore`), { method: "POST", headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function apiPermanentlyDeleteNote(id: number): Promise<{ message: string }> {
  const res = await apiFetch(buildApiUrl(`/notes/${id}/permanent`), { method: "DELETE", headers: { ...authHeaders() } });
  return handleResponse(res);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface BackendNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  notif_type: string;
  notification_type?: string;
  link_url?: string | null;
  action_type?: string | null;
  created_at: string;
}

export async function apiGetNotifications(): Promise<BackendNotification[]> {
  const res = await apiFetch(buildApiUrl("/notifications/"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiMarkNotificationRead(
  id: number,
): Promise<BackendNotification> {
  const res = await apiFetch(buildApiUrl(`/notifications/${id}/read`), {
    method: "PATCH",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiMarkAllNotificationsRead(): Promise<{
  message: string;
}> {
  const res = await apiFetch(buildApiUrl("/notifications/read-all"), {
    method: "PATCH",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiDeleteNotification(
  id: number,
): Promise<{ message: string }> {
  const res = await apiFetch(buildApiUrl(`/notifications/${id}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── AI Chat ───────────────────────────────────────────────────────────────────

export interface AIChatResponse {
  reply: string;
  status: string;
}

export async function apiAIChat(
  message: string,
  coursId?: number,
  history?: { role: string; content: string }[],
  mode?: "document" | "assistant" | "course",
): Promise<AIChatResponse> {
  const res = await apiFetch(buildApiUrl("/ai/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      message,
      cours_id: coursId ?? null,
      history: history ?? [],
      mode: mode ?? "assistant",
    }),
  });
  return handleResponse(res);
}

/**
 * Streaming AI chat — yields text deltas in real time.
 * Usage:
 *   for await (const delta of apiAIChatStream(...)) {
 *     setContent(prev => prev + delta);
 *   }
 */
export interface AIPermissions {
  allow_dashboard: boolean;
  allow_catalogue: boolean;
  allow_quizzes: boolean;
  allow_analytics: boolean;
  allow_certificates: boolean;
  allow_notes: boolean;
  allow_documents: boolean;
  allow_library: boolean;
}

export interface AIMemorySnapshot {
  profile: {
    level: string;
    weaknesses: string[];
    question_count: number;
    last_active: string | null;
  };
  session: {
    course_id?: number | null;
    chapter_id?: number | null;
    cours_id?: number | null;
    course_title?: string;
    chapter_title?: string;
    updated_at?: string | null;
  };
}

export async function apiGetAIMemory(): Promise<AIMemorySnapshot> {
  const res = await apiFetch(buildApiUrl("/ai/memory"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetAIPermissions(): Promise<AIPermissions> {
  const res = await apiFetch(buildApiUrl("/ai/permissions"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export interface TessAgentCapability {
  id: string;
  name: string;
  description: string;
  status?: string;
  permissions?: string[];
  tools?: string[];
}

export interface TessToolCapability {
  tool_id: string;
  name: string;
  description: string;
  permissions?: string[];
  agent_ids?: string[];
  confirmation_required?: boolean;
}

/** Capabilities exposed by the permissioned TESS gateway, never guessed by the UI. */
export async function apiTessListAgents(): Promise<TessAgentCapability[]> {
  const response = await apiFetch(buildTessApiUrl("/agents"), { headers: { ...authHeaders() } });
  if (!response.ok) throw new Error("Les agents TESS sont indisponibles.");
  return handleResponse(response);
}

export async function apiTessListTools(): Promise<TessToolCapability[]> {
  const response = await apiFetch(buildTessApiUrl("/tools"), { headers: { ...authHeaders() } });
  if (!response.ok) throw new Error("Les outils TESS sont indisponibles.");
  return handleResponse(response);
}

export async function apiUpdateAIPermissions(
  payload: Partial<AIPermissions>,
): Promise<AIPermissions> {
  const res = await apiFetch(buildApiUrl("/ai/permissions"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export interface PageContextData {
  current_page: string;
  page_title: string;
  page_data: Record<string, unknown>;
}

export async function apiAIVoiceTranscribe(audio: Blob, signal?: AbortSignal, language?: "fr" | "en" | "sw"): Promise<string> {
  const form = new FormData();
  const extension = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "m4a" : "webm";
  form.append("audio", audio, `tess-ai-voice.${extension}`);
  form.append("language", language ?? (document.documentElement.lang === "sw" ? "sw" : document.documentElement.lang?.startsWith("en") ? "en" : "fr"));
  const response = await apiFetch(buildApiUrl("/ai/voice/transcribe"), {
    method: "POST", body: form, signal, headers: authHeaders(),
  });
  const result = await response.json().catch(() => ({})) as { text?: string; detail?: string };
  if (!response.ok) throw new Error(result.detail || "La transcription vocale est indisponible.");
  return result.text ?? "";
}

export async function apiAIVoiceSynthesize(
  text: string,
  options?: { voice?: "fr-CH-ArianeNeural" | "fr-CH-FabriceNeural"; rate?: number; signal?: AbortSignal },
): Promise<Blob> {
  const response = await apiFetch(buildApiUrl("/ai/voice/synthesize"), {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, signal: options?.signal,
    body: JSON.stringify({ text, voice: options?.voice, rate: options?.rate }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(result.detail || "La synthèse vocale est indisponible.");
  }
  return response.blob();
}

export type AIVoiceStreamEvent =
  | { type: "start"; total_chunks?: number }
  | { type: "audio"; chunk_index?: number; text?: string; audio_base64?: string; audio_content_type?: string; final?: boolean }
  | { type: "done"; total_chunks?: number }
  | { type: "error"; message?: string };

export async function apiAIVoiceSynthesizeStream(
  text: string,
  options: {
    voice?: "fr-CH-ArianeNeural" | "fr-CH-FabriceNeural";
    rate?: number;
    signal?: AbortSignal;
    onEvent: (event: AIVoiceStreamEvent) => void;
  },
): Promise<void> {
  const response = await apiFetch(buildApiUrl("/ai/voice/synthesize/stream"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    signal: options.signal,
    body: JSON.stringify({ text, voice: options.voice, rate: options.rate }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(result.detail || "La synthèse vocale est indisponible.");
  }
  if (!response.body) throw new Error("Le flux audio est indisponible.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const consume = (line: string) => {
    const payload = line.startsWith("data:") ? line.slice(5).trim() : "";
    if (!payload || payload === "[DONE]") return;
    try { options.onEvent(JSON.parse(payload) as AIVoiceStreamEvent); } catch { /* ignore malformed keep-alive lines */ }
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach((line) => consume(line.trim()));
    if (done) break;
  }
  if (buffer.trim()) consume(buffer.trim());
}

export async function* apiAIChatStream(
  message: string,
  options?: {
    coursId?: number;
    courseId?: number;
    chapterId?: number;
    history?: { role: string; content: string }[];
      mode?: "document" | "assistant" | "course";
      alertMode?: boolean;
      confirmed?: boolean;
    conversationId?: string;
    onConversationId?: (id: string) => void;
    pageContext?: PageContextData | null;
    userContext?: {
      ia_level?: string;
      ia_language?: string;
      ia_proactive_hints?: boolean;
      learning_profile?: {
        goals: string[];
        level: string;
        interests: string[];
        weekly_time: string;
        preferred_style: string;
        target_date?: string;
      } | null;
    } | null;
    signal?: AbortSignal;
      image_base64?: string;
    image_type?: string;
    longThinking?: boolean;
    analysisMode?: boolean;
    analysisScope?: "section" | "course" | "document";
    voiceMode?: boolean;
    onStatus?: (status: string) => void;
    onActivity?: (step: AIActivityStep) => void;
    onSources?: (sources: AIActivitySource[]) => void;
  },
): AsyncGenerator<string> {
  // The TESS gateway is the authoritative chat contract. The legacy
  // application route remains available only as an explicit compatibility
  // fallback, so normal messages do not generate noisy 404s in the browser.
  const useCanonicalGateway = true;
  const res = await apiFetch(
    useCanonicalGateway ? buildTessApiUrl("/chat/stream") : buildApiUrl("/ai/chat/stream"),
    {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    signal: options?.signal ?? null,
    body: JSON.stringify(useCanonicalGateway ? {
      message,
      session_id: options?.conversationId || undefined,
      mode: options?.mode || "assistant",
      alert_mode: Boolean(options?.alertMode),
      confirmed: Boolean(options?.confirmed),
      analysis_mode: Boolean(options?.analysisMode),
      long_thinking: Boolean(options?.longThinking),
    } : {
      message,
      cours_id: options?.coursId ?? null,
      course_id: options?.courseId ?? null,
      chapter_id: options?.chapterId ?? null,
      history: options?.history ?? [],
      mode: options?.mode ?? "course",
      conversation_id: options?.conversationId ?? null,
      page_context: options?.pageContext ?? null,
      user_context: options?.userContext ?? null,
      image_base64: options?.image_base64 ?? null,
      image_type: options?.image_type ?? null,
      long_thinking: options?.longThinking ?? false,
      analysis_mode: options?.analysisMode ?? false,
      analysis_scope: options?.analysisScope ?? "section",
      voice_mode: options?.voiceMode ?? false,
    }),
    },
  );

  // Keep the application-specific stream contract when available, but bridge
  // a missing route to the canonical TESS gateway instead of showing a false
  // AI outage.
  if (!useCanonicalGateway && [404, 405, 502, 503, 504].includes(res.status)) {
    // Bridge the legacy application route to the canonical TESS SSE gateway.
    // This keeps the real streaming contract when the optional legacy route
    // is absent, instead of downgrading to a JSON response or reporting a
    // false temporary outage.
    const tessResponse = await apiFetch(buildTessApiUrl("/chat/stream"), {
      method: "POST",
      headers: { "Accept": "text/event-stream", "Content-Type": "application/json", ...authHeaders() },
      signal: options?.signal ?? null,
      body: JSON.stringify({
        message,
        session_id: options?.conversationId || undefined,
        mode: options?.mode || "assistant",
        alert_mode: Boolean(options?.alertMode),
        confirmed: Boolean(options?.confirmed),
        analysis_mode: Boolean(options?.analysisMode),
        long_thinking: Boolean(options?.longThinking),
      }),
    });
    if (!tessResponse.ok) {
      const err = await tessResponse.json().catch(() => ({ detail: "Erreur réseau" }));
      if (tessResponse.status === 401) clearAuth();
      const detail = (err as ApiError).detail;
      throw new Error(
        apiErrorMessage(
          typeof detail === "string" ? detail : "Erreur IA TESS",
          "Le service IA TESS est temporairement indisponible.",
        ),
      );
    }
    const reader = tessResponse.body?.getReader();
    if (!reader) throw new Error("Le flux de réponse est indisponible.");
    const decoder = new TextDecoder();
    let buffer = "";
    let streamDone = false;
    const consumeFallbackLine = (line: string) => {
      if (!line.startsWith("data:")) return;
      const payload = line.slice(5).trim();
      if (!payload) return;
      if (payload === "[DONE]") { streamDone = true; return; }
      try {
        const parsed = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          status?: string;
          activity?: AIActivityStep;
        };
        if (parsed.type === "status" && parsed.status) options?.onStatus?.(parsed.status);
        if (parsed.type === "activity" && parsed.activity) options?.onActivity?.(parsed.activity);
        if (parsed.delta) fallbackDeltas.push(parsed.delta);
      } catch {
        // Ignore malformed keep-alive frames; the canonical route remains authoritative.
      }
    };
    const fallbackDeltas: string[] = [];
    while (!streamDone) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        consumeFallbackLine(line.trim());
        while (fallbackDeltas.length) yield fallbackDeltas.shift()!;
      }
      if (done) break;
    }
    if (buffer.trim()) consumeFallbackLine(buffer.trim());
    while (fallbackDeltas.length) yield fallbackDeltas.shift()!;
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur réseau" }));
    if (res.status === 401) clearAuth();
    const detail = (err as ApiError).detail;
    throw new Error(
      apiErrorMessage(
        typeof detail === "string" ? detail : "Erreur IA",
        "Le service IA est temporairement indisponible.",
      ),
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Le flux de réponse est indisponible.");
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDone = false;
  const dispatchSSE = (payload: string): { done: boolean; delta?: string } => {
    const normalized = payload.trim();
    if (!normalized || normalized === ":keep-alive") return { done: false };
    if (normalized === "[DONE]") return { done: true };
    try {
      const parsed = JSON.parse(normalized) as {
        delta?: string;
        conversation_id?: string | number;
        session_id?: string;
        type?: string;
        status?: string;
        activity?: AIActivityStep;
        sources?: AIActivitySource[];
        message?: string;
      };
      if (parsed.type === "error") {
        throw new Error(parsed.message || "Le service IA a interrompu la réponse.");
      }
      if (parsed.type === "meta" && options?.onConversationId) {
        const id = parsed.session_id ?? (parsed.conversation_id != null ? String(parsed.conversation_id) : undefined);
        if (id) options.onConversationId(id);
      }
      if (parsed.type === "status" && parsed.status) options?.onStatus?.(parsed.status);
      if (parsed.type === "activity" && parsed.activity) options?.onActivity?.(parsed.activity);
      if (parsed.type === "sources" && Array.isArray(parsed.sources)) options?.onSources?.(parsed.sources);
      return { done: false, delta: parsed.delta };
    } catch (error) {
      if (error instanceof Error && error.message !== "Unexpected end of JSON input") throw error;
      // A malformed/partial frame must not erase the text already received.
      // The next complete frame (or the final decoder flush) can still finish it.
      return { done: false };
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, "");
        if (!line.startsWith("data:")) continue;
        const event = dispatchSSE(line.slice(5));
        if (event.done) { sawDone = true; return; }
        if (event.delta) yield event.delta;
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  // Some proxies close after the final SSE payload without a terminating newline.
  if (!sawDone) {
    buffer += decoder.decode();
    const finalFrame = buffer.replace(/\r$/, "").trim();
    if (finalFrame.startsWith("data:")) {
      const event = dispatchSSE(finalFrame.slice(5));
      if (event.done) sawDone = true;
      if (event.delta) yield event.delta;
    }
  }
}

/** Update the AI's knowledge of where the student currently is. */
export async function apiUpdateAIContext(payload: {
  course_id?: number;
  chapter_id?: number;
  cours_id?: number;
  course_title?: string;
  chapter_title?: string;
}): Promise<{ status: string }> {
  const res = await apiFetch(buildApiUrl("/ai/context"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ── Catalogue Progress ────────────────────────────────────────────────────────

export interface CatalogueProgressResult {
  course_id: number;
  percent_complete: number;
}

export async function apiGetCatalogueProgress(
  courseId: number,
): Promise<CatalogueProgressResult> {
  const res = await apiFetch(buildApiUrl(`/courses/${courseId}/progress`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUpdateCatalogueProgress(
  courseId: number,
  percent: number,
): Promise<CatalogueProgressResult> {
  const res = await apiFetch(buildApiUrl(`/courses/${courseId}/progress`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ percent_complete: percent }),
  });
  return handleResponse(res);
}

export async function apiGetAllProgress(): Promise<CatalogueProgressResult[]> {
  const res = await apiFetch(buildApiUrl("/courses/progress/all"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Analytics & Activity Tracking ────────────────────────────────────────────

export interface ActivityEventPayload {
  event_type: string;
  course_id?: number;
  chapter_id?: number;
  metadata?: Record<string, unknown>;
}

/** Log a student activity event (silently — never throws). */
export async function apiLogActivity(
  payload: ActivityEventPayload,
): Promise<void> {
  try {
    await apiFetch(buildApiUrl("/analytics/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
  } catch {
    // silencieux — le tracking ne bloque jamais l'UI
  }
}

export interface AnalyticsProfile {
  profile: Record<string, unknown>;
  weaknesses: { topic: string; score: number; course_id?: number }[];
  activity_summary: {
    total_events: number;
    event_counts: Record<string, number>;
    estimated_time_min: number;
    active_days: number;
  };
}

export async function apiGetAnalyticsProfile(): Promise<AnalyticsProfile> {
  const res = await apiFetch(buildApiUrl("/analytics/profile"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── AI Conversations (historique persistant) ──────────────────────────────────

export interface AIConversation {
  id: string;
  title?: string;
  matches?: string[];
  course_id?: number;
  chapter_id?: number;
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export async function apiGetConversations(search = ""): Promise<AIConversation[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const res = await apiFetch(buildTessApiUrl(`/conversations${query}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetConversationMessages(
  conversationId: string,
): Promise<{ conversation_id: string; messages: AIMessage[] }> {
  const res = await apiFetch(
    buildTessApiUrl(`/conversations/${encodeURIComponent(conversationId)}/messages`),
    {
      headers: { ...authHeaders() },
    },
  );
  const messages = await handleResponse<AIMessage[]>(res);
  return { conversation_id: conversationId, messages };
}

export async function apiDeleteConversation(
  conversationId: string,
): Promise<{ status: string }> {
  const res = await apiFetch(
    buildTessApiUrl(`/conversations/${encodeURIComponent(conversationId)}`),
    {
      method: "DELETE",
      headers: { ...authHeaders() },
    },
  );
  return handleResponse(res);
}

// ── Quizzes ───────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: string;
  explanation: string;
}

export interface QuizGenerateResult {
  course_id: number;
  course_title: string;
  questions: QuizQuestion[];
  status: string;
}

export interface QuizResultEntry {
  id: number;
  score: number;
  n_correct: number;
  n_questions: number;
  created_at: string;
}

export type MyQuizResults = Record<
  string,
  { best_score: number; attempts: number; results: QuizResultEntry[] }
>;

export async function apiGenerateCourseQuiz(
  courseId: number,
  nQuestions = 5,
): Promise<QuizGenerateResult> {
  const res = await apiFetch(buildApiUrl(`/quizzes/generate/${courseId}`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ n_questions: nQuestions }),
  });
  return handleResponse(res);
}

export async function apiSaveQuizResult(payload: {
  course_id: number;
  score: number;
  n_questions: number;
  n_correct: number;
}): Promise<QuizResultEntry> {
  const res = await apiFetch(buildApiUrl("/quizzes/save-result"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiGetMyQuizResults(): Promise<MyQuizResults> {
  const res = await apiFetch(buildApiUrl("/quizzes/my-results"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  total_courses: number;
  published_courses: number;
  draft_courses: number;
  total_enrollments: number;
  total_chapters: number;
  students: number;
  professors: number;
  admins: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  enrollment_count: number;
}

export async function apiGetAdminStats(): Promise<AdminStats> {
  const res = await apiFetch(buildApiUrl("/admin/stats"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetAdminUsers(): Promise<AdminUser[]> {
  const res = await apiFetch(buildApiUrl("/admin/users"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUpdateUserRole(
  userId: number,
  role: string,
): Promise<AdminUser> {
  const res = await apiFetch(buildApiUrl(`/admin/users/${userId}/role`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  return handleResponse(res);
}

export async function apiDeleteUser(
  userId: number,
): Promise<{ message: string }> {
  const res = await apiFetch(buildApiUrl(`/admin/users/${userId}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiAdminCreateUser(payload: {
  email: string;
  name: string;
  password: string;
  role: string;
}): Promise<AdminUser> {
  const res = await apiFetch(buildApiUrl("/admin/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export interface AdminQuizStat {
  id: number;
  user_id: number;
  user_email?: string;
  user_name: string;
  course_id: number;
  course_title: string;
  score: number;
  n_correct: number;
  n_questions: number;
  time_spent_sec: number;
  created_at: string;
  date?: string;
}

export async function apiAdminGetAllQuizStats(): Promise<AdminQuizStat[]> {
  const res = await apiFetch(buildApiUrl("/admin/quizzes/all-stats"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiAdminGenerateQuiz(
  courseId: number,
  nQuestions: number = 5,
): Promise<{
  course_id: number;
  course_title: string;
  questions: unknown[];
  status: string;
}> {
  const res = await apiFetch(
    buildApiUrl(`/admin/quizzes/generate/${courseId}`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ n_questions: nQuestions }),
    },
  );
  return handleResponse(res);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  documents_count: number;
  notes_count: number;
  unread_notifications: number;
  avg_progress: number;
  recent_documents: { id: number; titre: string }[];
  enrollments_count?: number;
  completed_courses?: number;
  in_progress_courses?: number;
  certificates_count?: number;
  best_quiz_score?: number;
  active_days?: number;
}

export async function apiGetDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch(buildApiUrl("/dashboard/stats"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Chapter Completions ────────────────────────────────────────────────────────

export interface ChapterCompletion {
  id: number;
  user_id: number;
  course_id: number;
  chapter_id: number;
  completed_at: string;
}

export async function apiMarkChapterComplete(payload: {
  course_id: number;
  chapter_id: number;
}): Promise<{ status: string; message: string; certificate?: unknown }> {
  const res = await apiFetch(buildApiUrl("/chapter-completions/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiGetMyChapterCompletions(
  courseId?: number,
): Promise<ChapterCompletion[]> {
  const qs = courseId ? `?course_id=${courseId}` : "";
  const res = await apiFetch(buildApiUrl(`/chapter-completions/${qs}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Certificates ───────────────────────────────────────────────────────────────

export interface Certificate {
  id: number;
  user_id: number;
  course_id: number;
  course_title: string;
  issued_at: string;
  certificate_url: string | null;
  score: number | null;
}

export async function apiGetMyCertificates(): Promise<Certificate[]> {
  const res = await apiFetch(buildApiUrl("/certificates/"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetCertificate(id: number): Promise<Certificate> {
  const res = await apiFetch(buildApiUrl(`/certificates/${id}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Reviews ────────────────────────────────────────────────────────────────────

export interface CourseReview {
  id: number;
  user_id: number;
  course_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
}

export async function apiGetCourseReviews(
  courseId: number,
): Promise<CourseReview[]> {
  const res = await apiFetch(buildApiUrl(`/reviews/${courseId}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiCreateOrUpdateReview(payload: {
  course_id: number;
  rating: number;
  comment?: string;
}): Promise<CourseReview> {
  const res = await apiFetch(buildApiUrl("/reviews/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiDeleteReview(
  courseId: number,
): Promise<{ message: string }> {
  const res = await apiFetch(buildApiUrl(`/reviews/${courseId}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

// ── Library ────────────────────────────────────────────────────────────────────

export interface LibraryBook {
  id: number;
  title: string;
  author: string;
  description: string;
  cover_image: string;
  category: string;
  page_count: number;
  language: string;
  read_url: string;
  download_url: string;
  file_url: string;
  file_size: number;
  resource_type: string;
  tags: string;
  course_id: number | null;
  is_published: boolean;
  created_at: string;
}

export async function apiGetLibraryBooks(params?: {
  search?: string;
  category?: string;
  lang?: string;
}): Promise<LibraryBook[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.category) qs.set("category", params.category);
  if (params?.lang) qs.set("lang", params.lang);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(buildApiUrl(`/library/${query}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetLibraryCategories(): Promise<string[]> {
  const res = await apiFetch(buildApiUrl("/library/categories"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetLibraryByCourse(
  courseId: number,
): Promise<LibraryBook[]> {
  const res = await apiFetch(buildApiUrl(`/library/by-course/${courseId}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetLibraryAllAdmin(): Promise<LibraryBook[]> {
  const res = await apiFetch(buildApiUrl("/library/admin/all"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiCreateLibraryResource(
  data: Partial<LibraryBook>,
): Promise<LibraryBook> {
  const res = await apiFetch(buildApiUrl("/library/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiUpdateLibraryResource(
  id: number,
  data: Partial<LibraryBook>,
): Promise<LibraryBook> {
  const res = await apiFetch(buildApiUrl(`/library/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiDeleteLibraryResource(id: number): Promise<void> {
  const res = await apiFetch(buildApiUrl(`/library/${id}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUploadLibraryFile(
  file: File,
): Promise<{ url: string; filename: string; size: number; type: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(buildApiUrl("/library/upload-file"), {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  return handleResponse(res);
}

export async function apiUploadChapterImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(buildApiUrl("/library/upload-image"), {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  const data = await handleResponse<{ url: string }>(res);
  return data.url;
}

// ── AI Course Generation ────────────────────────────────────────────────────────

export interface AICourseGenTask {
  task_id: string;
}

export interface AICourseGenEvent {
  type: "extracting" | "start" | "progress" | "chapter" | "done" | "error";
  message?: string;
  total_pages?: number;
  total_chunks?: number;
  chunk?: number;
  total?: number;
  pages_start?: number;
  pages_end?: number;
  index?: number;
  title?: string;
  description?: string;
  content?: string;
  duration_min?: number;
  order_index?: number;
  total_chapters?: number;
  duration_hours?: number;
}

export interface AICourseConfirmPayload {
  title: string;
  description: string;
  category: string;
  level: string;
  instructor_name: string;
  cover_image: string;
  tags: string;
  duration_hours: number;
  is_published: boolean;
  chapters: {
    title: string;
    description: string;
    content: string;
    duration_min: number;
    order_index: number;
    video_url: string;
  }[];
}

export interface AICourseConfirmResult {
  id: number;
  title: string;
  category: string;
  is_published: boolean;
  chapters_created: number;
  supabase_id: number | null;
}

// ── Course Quiz (AI-generated) ─────────────────────────────────────────────────

export interface CourseQuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface CourseQuizResponse {
  questions: CourseQuizQuestion[];
  course_id: number;
}

export async function apiGenerateCatalogueAIQuiz(
  courseId: number,
  numQuestions: number = 5,
): Promise<CourseQuizResponse> {
  const res = await apiFetch(buildApiUrl("/ai/generate-course-quiz"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      catalogue_course_id: courseId,
      num_questions: numQuestions,
    }),
  });
  return handleResponse(res);
}

export async function apiAICourseGenUpload(
  formData: FormData,
): Promise<AICourseGenTask> {
  const res = await apiFetch(buildApiUrl("/ai-course-gen/upload"), {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  return handleResponse(res);
}

export async function apiAICourseGenConfirm(
  taskId: string,
  payload: AICourseConfirmPayload,
): Promise<AICourseConfirmResult> {
  const res = await apiFetch(buildApiUrl(`/ai-course-gen/confirm/${taskId}`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ── Questionnaires ───────────────────────────────────────────────────────────

export type QuestionnaireQuestionKind =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "yes_no"
  | "true_false"
  | "select"
  | "scale"
  | "rating"
  | "date"
  | "time"
  | "number"
  | "percentage"
  | "email"
  | "phone"
  | "ranking"
  | "matrix";

export interface QuestionnaireQuestion {
  id?: number;
  prompt: string;
  description: string;
  kind: QuestionnaireQuestionKind;
  options: string[];
  required: boolean;
  note: string;
  correct_answer?: string | null;
  points: number;
  explanation?: string;
  section_id?: string | null;
  settings?: Record<string, unknown>;
  order_index?: number;
}

export type QuestionnaireAiMode =
  "disabled" | "guide_only" | "ask_to_answer" | "allowed";
export type QuestionnaireStatus = "draft" | "published" | "closed" | "archived";
export type RespondentFieldType = "text" | "email" | "tel" | "number" | "date";
export interface RespondentField {
  key: string;
  label: string;
  type: RespondentFieldType;
  required: boolean;
}

export interface Questionnaire {
  id: number;
  slug: string;
  title: string;
  description: string;
  author_name: string;
  status: QuestionnaireStatus;
  visibility: "private" | "public";
  ai_mode: QuestionnaireAiMode;
  anonymous_responses: boolean;
  allow_multiple: boolean;
  show_confirmation: boolean;
  confirmation_message: string;
  progressive: boolean;
  allow_back: boolean;
  shuffle_questions: boolean;
  max_responses: number | null;
  open_at: string | null;
  expires_at: string | null;
  closed_at: string | null;
  mode: "form" | "quiz";
  intro_message: string;
  footer_note: string;
  sections: { id: string; title: string; description?: string }[];
  logic_rules: Record<string, unknown>[];
  respondent_fields: (RespondentField | string)[];
  appearance: Record<string, unknown>;
  ai_settings: Record<string, unknown>;
  quiz_pass_threshold: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  response_count: number;
  last_response_at: string | null;
  questions: QuestionnaireQuestion[];
  responses?: QuestionnaireResponse[];
}

export interface QuestionnaireResponse {
  id: number;
  respondent_name: string;
  respondent_post_name: string;
  respondent_email: string;
  respondent_phone: string;
  respondent_data: Record<string, unknown>;
  submitted_at: string;
  score: number | null;
  feedback: string;
  processing_status: "new" | "read" | "processed";
  processed_at: string | null;
  answers: Record<string, unknown>;
}

export interface QuestionnairePayload {
  title: string;
  description: string;
  author_name: string;
  visibility: "private" | "public";
  ai_mode: QuestionnaireAiMode;
  anonymous_responses: boolean;
  allow_multiple: boolean;
  show_confirmation: boolean;
  confirmation_message: string;
  progressive: boolean;
  allow_back: boolean;
  shuffle_questions: boolean;
  max_responses: number | null;
  open_at: string | null;
  expires_at: string | null;
  mode: "form" | "quiz";
  intro_message: string;
  footer_note: string;
  sections: { id: string; title: string; description?: string }[];
  logic_rules: Record<string, unknown>[];
  respondent_fields: (RespondentField | string)[];
  appearance: Record<string, unknown>;
  ai_settings: Record<string, unknown>;
  quiz_pass_threshold: number;
  questions: QuestionnaireQuestion[];
  status?: Questionnaire["status"];
}

export async function apiGetQuestionnaires(): Promise<Questionnaire[]> {
  const res = await apiFetch(buildApiUrl("/questionnaires/"), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiSearchQuestionnaires(
  search = "",
  status?: QuestionnaireStatus,
): Promise<Questionnaire[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  const res = await apiFetch(
    buildApiUrl(`/questionnaires/?${params.toString()}`),
    {
      headers: { ...authHeaders() },
    },
  );
  return handleResponse(res);
}

export async function apiGetQuestionnaire(id: number): Promise<Questionnaire> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiCreateQuestionnaire(
  payload: QuestionnairePayload,
): Promise<Questionnaire> {
  const res = await apiFetch(buildApiUrl("/questionnaires/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiUpdateQuestionnaire(
  id: number,
  payload: QuestionnairePayload,
): Promise<Questionnaire> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiPublishQuestionnaire(
  id: number,
): Promise<Questionnaire> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}/publish`), {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiCloseQuestionnaire(
  id: number,
): Promise<Questionnaire> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}/close`), {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiReopenQuestionnaire(
  id: number,
): Promise<Questionnaire> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}/reopen`), {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiArchiveQuestionnaire(
  id: number,
): Promise<Questionnaire> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}/archive`), {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export function apiQuestionnaireExportUrl(id: number): string {
  return buildApiUrl(`/questionnaires/${id}/export.csv`);
}

export async function apiDuplicateQuestionnaire(
  id: number,
): Promise<Questionnaire> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}/duplicate`), {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiDeleteQuestionnaire(
  id: number,
): Promise<{ message: string }> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}`), {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiGetQuestionnaireStats(id: number): Promise<{
  questionnaire_id: number;
  total_responses: number;
  average_score: number | null;
  min_score: number | null;
  max_score: number | null;
  breakdown: {
    question_id: number;
    prompt: string;
    kind: QuestionnaireQuestionKind;
    counts: Record<string, number>;
    answered: number;
    average: number | null;
  }[];
}> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${id}/stats`), {
    headers: { ...authHeaders() },
  });
  return handleResponse(res);
}

export async function apiUpdateQuestionnaireFeedback(
  questionnaireId: number,
  responseId: number,
  feedback: string,
  processingStatus?: "new" | "read" | "processed",
): Promise<{
  id: number;
  feedback: string;
  processing_status: "new" | "read" | "processed";
  processed_at: string | null;
}> {
  const res = await apiFetch(
    buildApiUrl(`/questionnaires/${questionnaireId}/responses/${responseId}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ feedback, processing_status: processingStatus }),
    },
  );
  return handleResponse(res);
}

export async function apiGetPublicQuestionnaire(
  slug: string,
): Promise<Questionnaire> {
  const res = await apiFetch(
    buildApiUrl(`/questionnaires/public/${encodeURIComponent(slug)}`),
  );
  return handleResponse(res);
}

export async function apiSubmitQuestionnaireResponse(
  slug: string,
  payload: {
    respondent_name: string;
    respondent_post_name: string;
    respondent_email?: string;
    respondent_phone?: string;
    respondent_data?: Record<string, unknown>;
    answers: Record<string, unknown>;
  },
): Promise<{
  status: string;
  message: string;
  score: number | null;
  passed?: boolean | null;
  response_id: number;
  document_token: string;
}> {
  const res = await apiFetch(
    buildApiUrl(`/questionnaires/public/${encodeURIComponent(slug)}/responses`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse(res);
}

/** Download the Word receipt made available only after a public response is saved. */
export async function apiDownloadQuestionnaireResponseDocument(
  slug: string,
  responseId: number,
  documentToken: string,
): Promise<void> {
  const params = new URLSearchParams({ token: documentToken });
  const res = await apiFetch(
    buildApiUrl(
      `/questionnaires/public/${encodeURIComponent(slug)}/responses/${responseId}/document?${params.toString()}`,
    ),
  );
  if (!res.ok) {
    await handleResponse<never>(res);
    return;
  }
  const file = await res.blob();
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ma-reponse-questionnaire.docx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function apiQuestionnaireAi(
  slug: string,
  payload: { message: string; question_id?: number; mode?: "guide" | "answer" },
): Promise<{ reply: string; mode: string }> {
  const res = await apiFetch(
    buildApiUrl(`/questionnaires/public/${encodeURIComponent(slug)}/ai`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse(res);
}

export async function apiQuestionnaireCreatorAi(
  questionnaireId: number,
  payload: { message: string; question_id?: number; mode?: "guide" | "answer" },
): Promise<{ reply: string; mode: string }> {
  const res = await apiFetch(buildApiUrl(`/questionnaires/${questionnaireId}/ai`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
