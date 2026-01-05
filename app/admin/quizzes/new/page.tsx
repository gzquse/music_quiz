"use client";

import { QuizBuilder } from "@/components/admin";

export default function NewQuizPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Survey</h1>
        <p className="text-[var(--muted)]">Build your survey with custom questions</p>
      </div>
      <QuizBuilder />
    </div>
  );
}

