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

// First study period, from the survey's Study Start Date:
// Week 1 = Feb 1-8 (8 days), Week 2 = Feb 9-15 (7 days), Week 3 = Feb 16-22 (7 days), etc.
const MS_WEEK_1 = 8 * 24 * 60 * 60 * 1000;
const MS_WEEK_2_PLUS = 7 * 24 * 60 * 60 * 1000;
export const MS_PER_WEEK = MS_WEEK_2_PLUS; // for formatWeekLabel compatibility

/** Maximum week index of the first study period, derived from study start date or stored metadata (was 8). */
export const MAX_STUDY_WEEK = 16;

/**
 * Study periods, oldest first. Week numbers restart at 1 in each period, and a submission belongs to
 * the latest period that has started. The first period keeps the Study Start Date rules above. Later
 * periods start on `firstDay` and run Monday-Sunday weeks by US Central calendar date, so cutoffs stay
 * at midnight across daylight saving changes; their week number is not capped at `weeks`.
 */
export const STUDY_PERIODS: { name: string; weeks: number; firstDay?: string }[] = [
  { name: "Spring 2026", weeks: MAX_STUDY_WEEK },
  { name: "Fall 2026", weeks: 8, firstDay: "2026-09-21" }, // Week 1 = Sep 21-27 ... Week 8 = Nov 9-15
];

/** A week within a study period; `period` indexes STUDY_PERIODS. */
export type StudyWeek = { period: number; week: number };

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const centralDateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** Days since 1970-01-01 of the US Central calendar date containing the timestamp. */
function centralDay(timestamp: number): number {
  const parts = Object.fromEntries(
    centralDateParts.formatToParts(timestamp).map((p) => [p.type, Number(p.value)])
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY;
}

/** Days since 1970-01-01 of a YYYY-MM-DD date. */
function dayOf(isoDate: string): number {
  return Date.parse(isoDate) / MS_PER_DAY;
}

/** Index into STUDY_PERIODS of the period running at the timestamp. */
export function getStudyPeriodAt(timestamp: number): number {
  const day = centralDay(timestamp);
  for (let i = STUDY_PERIODS.length - 1; i > 0; i--) {
    const firstDay = STUDY_PERIODS[i].firstDay;
    if (firstDay && day >= dayOf(firstDay)) return i;
  }
  return 0;
}

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

/** Study week at a timestamp; undefined in the first period when studyStartDate is unset. */
function getStudyWeekAt(timestamp: number, studyStartDate?: number | null): StudyWeek | undefined {
  const period = getStudyPeriodAt(timestamp);
  const firstDay = STUDY_PERIODS[period].firstDay;
  if (firstDay) {
    return { period, week: Math.floor((centralDay(timestamp) - dayOf(firstDay)) / 7) + 1 };
  }
  if (!studyStartDate) return undefined;
  const week = getWeekFromElapsed(timestamp - studyStartDate);
  return { period, week: Math.min(MAX_STUDY_WEEK, Math.max(1, week)) };
}

export function getCurrentStudyWeek(studyStartDate?: number | null): StudyWeek {
  return getStudyWeekAt(Date.now(), studyStartDate) ?? { period: 0, week: 1 };
}

/** Derive study week from response. Prefer derived from submittedAt + studyStartDate so display matches actual date; fall back to metadata.week only when studyStartDate is unset. */
export function getResponseStudyWeek(
  response: { submittedAt: number; metadata?: { week?: number } },
  studyStartDate?: number | null
): StudyWeek | undefined {
  const derived = getStudyWeekAt(response.submittedAt, studyStartDate);
  if (derived) return derived;
  const stored = (response.metadata as { week?: number } | undefined)?.week;
  if (stored != null && stored >= 1 && stored <= MAX_STUDY_WEEK) return { period: 0, week: stored };
  return undefined;
}

/** Format week label with date range (e.g. "Week 1 (Feb 1-Feb 8)", "Week 2 (Feb 9-Feb 15)", "Week 1 (Sep 21-Sep 27)"). */
export function formatWeekLabel({ period, week }: StudyWeek, studyStartDate?: number | null): string {
  const firstDay = STUDY_PERIODS[period]?.firstDay;
  if (firstDay) {
    const start = (dayOf(firstDay) + (week - 1) * 7) * MS_PER_DAY;
    const fmtDay = (ms: number) =>
      new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `Week ${week} (${fmtDay(start)}-${fmtDay(start + 6 * MS_PER_DAY)})`;
  }
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

