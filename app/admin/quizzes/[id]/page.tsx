"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { db, type Question } from "@/lib/instant";
import { QuizBuilder } from "@/components/admin";
import { Card, Button } from "@/components/ui";

export default function EditQuizPage() {
  const params = useParams();
  const quizId = params.id as string;

  const { data, isLoading, error } = db.useQuery({
    quizzes: {
      $: {
        where: { id: quizId },
      },
    },
    questions: {
      $: {
        where: { quizId: quizId },
      },
    },
  });

  const rawQuiz = data?.quizzes?.[0];
  const quiz = rawQuiz
    ? { ...rawQuiz, variant: (rawQuiz.variant || "student") as "student" | "teacher" }
    : undefined;
  // Cast questions to proper type (InstantDB returns string for union types)
  const questions = (data?.questions || []).map(q => ({
    ...q,
    type: q.type as Question["type"]
  })) as Question[];

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="p-8">
        <Card className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Survey Not Found</h2>
          <p className="text-[var(--muted)]">This survey may have been deleted</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Survey</h1>
          <p className="text-[var(--muted)]">Update your survey settings and questions</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/quizzes/${quizId}/responses`}>
            <Button variant="secondary">View Responses</Button>
          </Link>
          <Link href={`/admin/quizzes/${quizId}/analytics`}>
            <Button variant="ghost">Analytics</Button>
          </Link>
        </div>
      </div>
      <QuizBuilder existingQuiz={quiz} existingQuestions={questions} />
    </div>
  );
}

