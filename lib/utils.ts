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

export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function getWeekFromStudyStart(studyStartDate?: number | null): number {
  if (!studyStartDate) return 1;
  const elapsed = Date.now() - studyStartDate;
  const week = Math.floor(elapsed / MS_PER_WEEK) + 1;
  return Math.min(8, Math.max(1, week));
}

/** Derive week (1-8) from response. Uses metadata.week when present; otherwise derives from submittedAt and studyStartDate (Feb 1 = Week 1). */
export function getWeekFromResponse(
  response: { submittedAt: number; metadata?: { week?: number } },
  studyStartDate?: number | null
): number | undefined {
  const stored = (response.metadata as { week?: number } | undefined)?.week;
  if (stored != null && stored >= 1 && stored <= 8) return stored;
  if (!studyStartDate) return undefined;
  const elapsed = response.submittedAt - studyStartDate;
  const week = Math.floor(elapsed / MS_PER_WEEK) + 1;
  return Math.min(8, Math.max(1, week));
}

/** Format week label with date range (e.g. "Week 1 (Feb 1-7)"). */
export function formatWeekLabel(week: number, studyStartDate?: number | null): string {
  if (!studyStartDate) return `Week ${week}`;
  const start = new Date(studyStartDate + (week - 1) * MS_PER_WEEK);
  const end = new Date(studyStartDate + week * MS_PER_WEEK - 1);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week ${week} (${fmt(start)}-${fmt(end)})`;
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

