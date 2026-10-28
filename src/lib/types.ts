export type Role = "admin" | "coach" | "member";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  active: boolean;
  /** Se registró solo y está esperando que el admin le dé acceso. */
  pending: boolean;
  created_at: string;
  /** Cuándo marcó que vio el vídeo de inducción. */
  welcome_seen_at?: string | null;
}

export interface AccessLevel {
  id: string;
  name: string;
  color: string;
}

export interface Settings {
  academy_name: string;
  tagline: string | null;
  primary_color: string;
  logo_url: string | null;
  welcome_message: string | null;
  allow_signup: boolean;
  auto_approve: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  position: number;
  published: boolean;
  show_locked: boolean;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  video_path: string | null;
  position: number;
  published: boolean;
}

export interface LessonFile {
  id: string;
  lesson_id: string;
  name: string;
  path: string;
  size: number | null;
}

export type Recurrence = "none" | "weekly" | "biweekly" | "monthly";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  location: string | null;
  recurrence: Recurrence;
  recurrence_until: string | null;
  /** Solo para staff: a quién va dirigido. */
  audience?: string;
}

export interface Author {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
}

/** Resultado de crear un miembro o resetear su contraseña. */
export interface Credentials {
  error?: string;
  name?: string;
  email?: string;
  password?: string;
  loginUrl?: string;
  academy?: string;
}

export interface Platform {
  id: string;
  name: string;
  description: string | null;
  url: string;
  category: string;
  logo_url: string | null;
  tutorial_url: string | null;
  perk: string | null;
  position: number;
}

export interface StudySession {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  topic: string;
  starts_at: string;
  duration_minutes: number;
  meet_url: string;
  max_attendees: number | null;
}

export interface Benefit {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  claim_url: string | null;
  delivery: "link" | "code";
  active: boolean;
  position: number;
}

export interface LeaderboardRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  lessons: number;
  posts: number;
  comments: number;
  likes: number;
  hosted: number;
  joined: number;
  points: number;
}
