"use client";

import Link from "next/link";
import { db } from "@/lib/instant";
import { QuizCard } from "@/components/quiz";

export default function HomePage() {
  const { isLoading, error, data } = db.useQuery({
    quizzes: {
      $: {
        where: {
          isActive: true,
        },
      },
    },
  });

  const quizzes = data?.quizzes || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <span className="font-semibold text-lg">Music Survey</span>
          </Link>
          {/* Admin link removed from public view */}
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 bg-gradient-to-b from-[var(--surface)] to-[var(--background)]">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Post-Session Playing Experience Survey
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
            Help us understand your playing experience and physical state after practice sessions.
            Your responses contribute to valuable music education research.
          </p>
        </div>
      </section>

      {/* Quiz List */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Available Surveys</h2>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-[var(--error)]">Failed to load surveys. Please try again later.</p>
          </div>
        )}

        {!isLoading && !error && quizzes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">No surveys available at the moment.</p>
          </div>
        )}

        {!isLoading && !error && quizzes.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={{ ...quiz, variant: (quiz.variant || "student") as "student" | "teacher" }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-[var(--muted)]">
          <p>Music Education Research Survey Platform</p>
        </div>
      </footer>
    </div>
  );
}
