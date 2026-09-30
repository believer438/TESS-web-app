// Copie Zentrix Academy : src/hooks/useAITracking.ts
/**
 * useAITracking — automatic real-time position sync with the AI
 *
 * Call this hook wherever the student navigates to a course or chapter.
 * It sends POST /ai/context so the AI always knows exactly where the student is,
 * without the student needing to do anything.
 *
 * Usage:
 *   useAITracking({ courseId: course.backendId, courseTitle: course.title })
 *   useAITracking({ chapterId: chapter.id, chapterTitle: chapter.title })
 */
import { useEffect, useRef } from "react";
import { apiUpdateAIContext, isAuthenticated } from "@/lib/api-client";

interface AITrackingPayload {
  courseId?: number;
  chapterId?: number;
  coursId?: number;
  courseTitle?: string;
  chapterTitle?: string;
}

export function useAITracking(payload: AITrackingPayload) {
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    if (!isAuthenticated()) return;

    const key = JSON.stringify(payload);
    if (key === lastSentRef.current) return;
    lastSentRef.current = key;

    if (
      !payload.courseId &&
      !payload.chapterId &&
      !payload.coursId
    ) return;

    apiUpdateAIContext({
      course_id:     payload.courseId,
      chapter_id:    payload.chapterId,
      cours_id:      payload.coursId,
      course_title:  payload.courseTitle ?? "",
      chapter_title: payload.chapterTitle ?? "",
    }).catch(() => {
      // silent — tracking is best-effort, never blocks the UX
    });
  }, [
    payload.courseId,
    payload.chapterId,
    payload.coursId,
    payload.courseTitle,
    payload.chapterTitle,
  ]);
}
