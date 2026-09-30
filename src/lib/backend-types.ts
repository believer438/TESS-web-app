// Copie Zentrix Academy : src/lib/backend-types.ts
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  courseCount: number;
}

export interface Course {
  id: string;
  backendId?: number;
  title: string;
  description: string;
  coverImage: string;
  categoryId: string;
  categoryName: string;
  professor: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDuration: number;
  chaptersCount: number;
  lessonsCount: number;
  enrolledCount: number;
  progress: number;
  isEnrolled: boolean;
  isFeatured: boolean;
  tags: string[];
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  orderIndex: number;
  isCompleted: boolean;
  isLocked: boolean;
  estimatedDuration: number;
  blocks: LessonBlock[];
}

export interface LessonBlock {
  id: string;
  lessonId: string;
  blockType: "text" | "video" | "quiz" | "poll" | "exercise" | "code";
  content: Record<string, unknown>;
  orderIndex: number;
  isRequired: boolean;
  isCompleted: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  categoryName: string;
  pageCount: number;
  language: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  questionCount: number;
  timeLimit: number;
  passingScore: number;
  bestScore: number | null;
  attempts: number;
  quizType: "practice" | "exam" | "revision";
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "reminder";
  isRead: boolean;
  createdAt: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export type AIActivityStatus = "planned" | "running" | "completed" | "error";

export interface AIActivityStep {
  id: string;
  title: string;
  status: AIActivityStatus;
  detail?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface AIActivitySource {
  id: string;
  title: string;
  kind: "course" | "chapter" | "document" | "image" | "data";
  detail?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  avatarUrl: string;
  role: "student" | "professor" | "admin";
  level: number;
  streakDays: number;
  coursesCompleted: number;
  quizzesPassed: number;
  totalStudyHours: number;
}

// ─── Catalogue (admin-managed courses) ───────────────────────────────────────

export interface BackendChapter {
  id: number;
  course_id: number;
  title: string;
  description: string;
  content: string;
  order_index: number;
  video_url: string;
  video_position: string;
  duration_min: number;
}

export interface CatalogueCourse {
  id: number;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  level: "beginner" | "intermediate" | "advanced";
  duration_hours: number;
  instructor_name: string;
  is_published: boolean;
  tags: string;
  enrolled_count: number;
  is_enrolled: boolean;
  chapters: BackendChapter[];
  created_at: string;
}
