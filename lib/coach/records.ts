// Database rows (snake_case, as stored in Supabase) and the shapes the UI uses.

import {
  DEFAULT_INSTRUCTOR,
  type AudioMetrics,
  type CoachFeedback,
  type InstructorSettings,
  type MetricKey,
} from "./rubric";

export type InstructorRow = {
  user_id: string;
  name: string;
  color: number;
  tone: string;
  level: string;
  focus: string[];
  notes: string;
  learn_from_professor: boolean;
  updated_at?: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  created_at: string;
  piece: string | null;
  goal: string | null;
  duration_sec: number;
  frame_times: number[];
  thumbs: Record<string, string>;
  loudness: number[];
  audio: AudioMetrics | null;
  ai: CoachFeedback;
  overall: number | null;
  instructor_name: string;
  model: string;
  professor_name: string | null;
  professor_notes: string | null;
  professor_scores: Record<string, number> | null;
  professor_at: string | null;
};

export type SessionRecord = {
  id: string;
  createdAt: number;
  piece?: string;
  durationSec: number;
  frameTimes: number[];
  thumbs: Record<string, string>;
  loudness: number[];
  ai: CoachFeedback;
  overall?: number;
  instructorName: string;
  professorName?: string;
  professorNotes?: string;
  professorScores?: Record<string, number>;
};

export type ProfessorFeedback = Pick<SessionRecord, "professorName" | "professorNotes" | "professorScores">;

export function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    createdAt: Date.parse(row.created_at),
    piece: row.piece ?? undefined,
    durationSec: row.duration_sec,
    frameTimes: row.frame_times ?? [],
    thumbs: row.thumbs ?? {},
    loudness: row.loudness ?? [],
    ai: row.ai,
    overall: row.overall ?? undefined,
    instructorName: row.instructor_name,
    professorName: row.professor_name ?? undefined,
    professorNotes: row.professor_notes ?? undefined,
    professorScores: row.professor_scores ?? undefined,
  };
}

export function toInstructor(row: InstructorRow | null | undefined): InstructorSettings {
  if (!row) return DEFAULT_INSTRUCTOR;
  return {
    name: row.name || DEFAULT_INSTRUCTOR.name,
    color: row.color ?? DEFAULT_INSTRUCTOR.color,
    tone: (row.tone as InstructorSettings["tone"]) || DEFAULT_INSTRUCTOR.tone,
    level: (row.level as InstructorSettings["level"]) || DEFAULT_INSTRUCTOR.level,
    focus: (row.focus ?? []) as MetricKey[],
    notes: row.notes ?? "",
    learnFromProfessor: row.learn_from_professor ?? DEFAULT_INSTRUCTOR.learnFromProfessor,
  };
}

export function toInstructorRow(userId: string, s: InstructorSettings): InstructorRow {
  return {
    user_id: userId,
    name: s.name.trim() || DEFAULT_INSTRUCTOR.name,
    color: s.color,
    tone: s.tone,
    level: s.level,
    focus: s.focus,
    notes: s.notes.trim(),
    learn_from_professor: s.learnFromProfessor,
    updated_at: new Date().toISOString(),
  };
}
