"use client";

import Link from "next/link";
import { type Student } from "@/lib/instant";
import { SURVEY_INSTRUCTOR, SURVEY_SUPERVISOR, SURVEY_TITLE } from "@/lib/survey";

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
  description = "Select your name to begin this week's check-in. It takes about one minute.",
}: NamePickerProps) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col bg-[var(--background)] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="pt-4">
        <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
          Weekly check-in
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed text-[var(--muted)]">{description}</p>
      </header>

      <div className="mt-6 overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <p className="text-[13px] text-[var(--muted)]">Instructor</p>
          <p className="text-[17px] font-medium">{SURVEY_INSTRUCTOR}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-[var(--muted)]">Research supervisor</p>
          <p className="text-[17px] font-medium">{SURVEY_SUPERVISOR}</p>
        </div>
      </div>

      <section className="mt-8 flex-1">
        <h2 className="mb-3 px-1 text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
          Who are you?
        </h2>
        {students.length === 0 ? (
          <p className="rounded-[20px] bg-[var(--surface)] px-5 py-8 text-center text-[15px] text-[var(--muted)] shadow-[var(--shadow)]">
            No participants are available yet. Please check back soon.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[var(--shadow)]">
            {students.map((student, index) => (
              <Link
                key={student.id}
                href={`/quiz/${quizId}/student/${student.id}`}
                className={`flex min-h-[56px] items-center justify-between px-5 text-[17px] active:bg-[var(--surface-hover)] ${
                  index !== students.length - 1 ? "border-b border-[var(--border)]" : ""
                }`}
              >
                <span className="font-medium">{student.name}</span>
                <svg
                  className="h-5 w-5 text-[var(--muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
