// Copie Zentrix Academy : src/hooks/useActivityTracker.ts
/**
 * useActivityTracker
 * ------------------
 * Hook de tracking comportemental — envoie les événements d'activité
 * en arrière-plan (silencieux, ne bloque jamais l'UI).
 *
 * Événements automatiques :
 *   CHAPTER_OPEN   — à chaque changement de chapitre
 *   PAGE_TIME      — toutes les 30 secondes (temps actif)
 *
 * Événements manuels via logEvent() :
 *   VIDEO_PLAY, VIDEO_PAUSE, VIDEO_COMPLETE
 *   QUIZ_START, QUIZ_COMPLETE, QUIZ_FAILED
 *   CHAT_OPEN, CHAPTER_COMPLETE
 */
import { useEffect, useCallback, useRef } from "react";
import { apiLogActivity, isAuthenticated } from "@/lib/api-client";

interface ActivityTrackerOptions {
  courseId?:    number;
  chapterId?:   number;
  chapterTitle?: string;
}

export function useActivityTracker({
  courseId,
  chapterId,
  chapterTitle,
}: ActivityTrackerOptions) {
  const logEvent = useCallback(
    async (eventType: string, metadata?: Record<string, unknown>) => {
      if (!isAuthenticated()) return;
      try {
        await apiLogActivity({
          event_type: eventType,
          course_id:  courseId,
          chapter_id: chapterId,
          metadata,
        });
      } catch {
        // Silencieux — le tracking ne doit jamais bloquer l'UI
      }
    },
    [courseId, chapterId],
  );

  // ── CHAPTER_OPEN : se déclenche à chaque changement de chapitre ──────────────
  const prevChapterId = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!chapterId || chapterId === prevChapterId.current) return;
    prevChapterId.current = chapterId;
    logEvent("CHAPTER_OPEN", {
      title:     chapterTitle,
      course_id: courseId,
    });
  }, [chapterId, chapterTitle, courseId, logEvent]);

  // ── PAGE_TIME : toutes les 30 secondes ────────────────────────────────────────
  useEffect(() => {
    if (!chapterId) return;
    const interval = setInterval(() => {
      logEvent("PAGE_TIME", { seconds: 30 });
    }, 30_000);
    return () => clearInterval(interval);
  }, [chapterId, logEvent]);

  return { logEvent };
}
