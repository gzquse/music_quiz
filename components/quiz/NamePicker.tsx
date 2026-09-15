"use client";

import Link from "next/link";
import { type Student } from "@/lib/instant";
import { SURVEY_INSTRUCTOR, SURVEY_SUPERVISOR, SURVEY_TITLE } from "@/lib/survey";
import { AppShell, personTone } from "./AppShell";

interface NamePickerProps {
  students: Student[];
  quizId: string;
  title?: string;
  description?: string;
}

export function NamePicker({
  students,
  quizId,
  title = SURVEY_TITLE,
  description = "One minute. Tap your name to begin.",
}: NamePickerProps) {
  return (
    <AppShell className="px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <header className="px-1 pt-6 text-center">
        <p className="text-[15px] font-medium tracking-wide text-[var(--foreground)]/80">
          Practice
        </p>
        <h1 className="font-display mx-auto mt-5 max-w-[16ch] text-[34px] font-semibold leading-[1.1] tracking-tight">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-white/55 px-3 py-1 text-[12px] text-[var(--muted)] backdrop-blur-md">
            {SURVEY_INSTRUCTOR}
          </span>
          <span className="rounded-full bg-white/55 px-3 py-1 text-[12px] text-[var(--muted)] backdrop-blur-md">
            {SURVEY_SUPERVISOR}
          </span>
        </div>
      </header>

      <section className="mt-8 flex-1">
        <h2 className="mb-3 px-1 text-[13px] font-medium text-[var(--muted)]">
          Who are you?
        </h2>
        {students.length === 0 ? (
          <p className="rounded-[28px] bg-white/70 px-5 py-8 text-center text-[15px] text-[var(--muted)] shadow-[var(--shadow)] backdrop-blur-md">
            No participants yet. Please check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/quiz/${quizId}/student/${student.id}`}
                className={`relative flex min-h-[108px] flex-col justify-end overflow-hidden rounded-[28px] bg-gradient-to-br ${personTone(student.name)} p-4 text-white shadow-[var(--shadow)] active:scale-[0.98] transition-transform`}
              >
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-[13px] font-semibold backdrop-blur-md">
                  {student.name.slice(0, 1)}
                </span>
                <span className="text-[18px] font-semibold leading-tight">{student.name}</span>
                <span className="mt-1 text-[12px] text-white/80">Start</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
