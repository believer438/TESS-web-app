import { buildTessApiUrl } from "@/lib/env";
import { getToken } from "@/lib/api-client";

export async function tessFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(buildTessApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(detail.detail || `TESS API ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type TessStreamEvent = {
  type?: string;
  event?: { event_type?: string; payload?: Record<string, unknown> };
};

/** Abonnement SSE authentifié aux événements opérationnels de l'utilisateur. */
export function tessSubscribeToEvents(onEvent: (event: TessStreamEvent) => void): () => void {
  const controller = new AbortController();
  void (async () => {
    try {
      const token = getToken();
      const response = await fetch(buildTessApiUrl("/events/stream"), {
        credentials: "include",
        signal: controller.signal,
        headers: {
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok || !response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.replace(/\r$/, "");
          if (!line.startsWith("data:")) continue;
          try { onEvent(JSON.parse(line.slice(5).trim()) as TessStreamEvent); } catch { /* frame non JSON */ }
        }
        if (done) break;
      }
      reader.releaseLock();
    } catch {
      // The REST refresh remains authoritative when SSE is unavailable.
    }
  })();
  return () => controller.abort();
}

export type TessFeedbackInput = {
  prompt: string;
  answer: string;
  correction?: string;
  rating?: number;
  domain?: string;
  agent_id?: string;
  session_id?: string;
  mission_id?: string;
};

/** Envoie un retour utilisateur traçable ; la promotion reste soumise à revue humaine. */
export function tessSubmitFeedback(input: TessFeedbackInput) {
  return tessFetch<{ feedback_id: string; status: string }>("/learning/feedback", {
    method: "POST",
    body: JSON.stringify({ domain: "chat", ...input }),
  });
}

export type TessAgent = {
  id: string;
  name: string;
  domain: string;
  description: string;
  status?: string;
  capabilities?: string[];
  tools?: string[];
  permissions?: string[];
  risk_level?: string;
};

export type TessAgentHealth = {
  agent_id: string;
  status: string;
  details?: string;
};

export type TessMission = {
  mission_id: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_agents?: string[];
  created_at?: string;
  updated_at?: string;
  tasks?: Array<{
    task_id: string;
    agent_id: string;
    tool_id?: string | null;
    status: string;
    input?: Record<string, unknown> | null;
    output?: Record<string, unknown> | null;
  }>;
};

export type TessTool = {
  tool_id: string;
  name: string;
  description: string;
  agent_ids: string[];
  permissions: string[];
  risk_level: string;
  confirmation_required: boolean;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
};

export type TessReminder = {
  reminder_id: string;
  message: string;
  due_at: string;
  channel: string;
  status: string;
  mission_id?: string | null;
};

export type TessFollowUp = {
  follow_up_id: string;
  user_id: string;
  description: string;
  mission_id?: string | null;
  task_id?: string | null;
  watch_events: string[];
  status: "WAITING" | "TRIGGERED" | "CANCELLED" | string;
  created_at: string;
  triggered_at?: string | null;
  last_event_type?: string | null;
  result?: Record<string, unknown>;
};

export type TessMemoryItem = {
  key: string;
  value: unknown;
  updated_at: string;
};

export type TessNotification = {
  notification_id: string;
  title: string;
  body: string;
  kind: string;
  created_at: string;
  status: "UNREAD" | "READ" | "ARCHIVED" | string;
  read_at?: string | null;
  metadata?: Record<string, unknown>;
};
