import { type ClassValue, clsx } from "clsx";

// Simple className merger (without tailwind-merge for now)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format date for display
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format date with time
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate a random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Calculate average from array of numbers
export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

// Week 1 = Feb 1-8 (8 days), Week 2 = Feb 9-15 (7 days), Week 3 = Feb 16-22 (7 days), etc.
const MS_WEEK_1 = 8 * 24 * 60 * 60 * 1000;
const MS_WEEK_2_PLUS = 7 * 24 * 60 * 60 * 1000;
export const MS_PER_WEEK = MS_WEEK_2_PLUS; // for formatWeekLabel compatibility

/** Maximum study week index derived from study start date or stored metadata (was 8). */
export const MAX_STUDY_WEEK = 16;

function getWeekFromElapsed(elapsedMs: number): number {
  if (elapsedMs < MS_WEEK_1) return 1;
  return Math.floor((elapsedMs - MS_WEEK_1) / MS_WEEK_2_PLUS) + 2;
}

function getElapsedToWeekStart(week: number): number {
  if (week <= 1) return 0;
  return MS_WEEK_1 + (week - 2) * MS_WEEK_2_PLUS;
}

function getElapsedToWeekEnd(week: number): number {
  if (week <= 1) return MS_WEEK_1 - 1;
  return MS_WEEK_1 + (week - 1) * MS_WEEK_2_PLUS - 1;
}

export function getWeekFromStudyStart(studyStartDate?: number | null): number {
  if (!studyStartDate) return 1;
  const elapsed = Date.now() - studyStartDate;
  const week = getWeekFromElapsed(elapsed);
  return Math.min(MAX_STUDY_WEEK, Math.max(1, week));
}

/** Derive week (1..MAX_STUDY_WEEK) from response. Prefer derived from submittedAt + studyStartDate so display matches actual date; fall back to metadata.week only when studyStartDate is unset. */
export function getWeekFromResponse(
  response: { submittedAt: number; metadata?: { week?: number } },
  studyStartDate?: number | null
): number | undefined {
  if (studyStartDate) {
    const elapsed = response.submittedAt - studyStartDate;
    const week = getWeekFromElapsed(elapsed);
    return Math.min(MAX_STUDY_WEEK, Math.max(1, week));
  }
  const stored = (response.metadata as { week?: number } | undefined)?.week;
  if (stored != null && stored >= 1 && stored <= MAX_STUDY_WEEK) return stored;
  return undefined;
}

/** Format week label with date range (e.g. "Week 1 (Feb 1-8)", "Week 2 (Feb 9-15)", "Week 3 (Feb 16-22)"). */
export function formatWeekLabel(week: number, studyStartDate?: number | null): string {
  if (!studyStartDate) return `Week ${week}`;
  const start = new Date(studyStartDate + getElapsedToWeekStart(week));
  const end = new Date(studyStartDate + getElapsedToWeekEnd(week));
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week ${week} (${fmt(start)}-${fmt(end)})`;
}

/** Get scale answer values (Q1-Q6) with fallback when questionIds don't match (e.g. after quiz was edited).
 * First tries direct questionId match; if that yields no values, uses positional match for numeric answers. */
export function getScaleAnswerValues(
  responseAnswers: { questionId: string; value: string | number }[],
  scaleQuestionIds: string[]
): (string | number)[] {
  const byId = scaleQuestionIds.map((qId) => {
    const a = responseAnswers.find((x) => x.questionId === qId);
    return a?.value ?? "-";
  });
  const hasAny = byId.some((v) => v !== "-");
  if (hasAny) return byId;

  const numericAnswers = responseAnswers
    .filter((a) => typeof a.value === "number" && a.value >= 1 && a.value <= 10)
    .sort((a, b) => a.questionId.localeCompare(b.questionId))
    .map((a) => a.value as number);

  return scaleQuestionIds.map((_, i) => (numericAnswers[i] != null ? numericAnswers[i] : "-"));
}

// Group array items by a key
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

