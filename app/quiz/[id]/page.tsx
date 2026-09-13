"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { db, tx, id as genId, type Question } from "@/lib/instant";
import { isActiveParticipant, sortParticipants } from "@/lib/survey";
import {
  NamePicker,
  SurveyComplete,
  SurveyExperience,
  SurveySpinner,
  SurveyState,
} from "@/components/quiz";

export default function QuizPage() {
  const params = useParams();
  const quizId = params.id as string;

  const [isSubmitted, setIsSubmitted] = useState(false);

  const { isLoading, error, data } = db.useQuery({
    quizzes: {
      $: { where: { id: quizId } },
    },
    questions: {
      $: { where: { quizId } },
    },
    students: {},
  });

  const quiz = data?.quizzes?.[0];
  const questions = (data?.questions || [])
    .map((q) => ({ ...q, type: q.type as Question["type"] }))
    .sort((a, b) => a.order - b.order);
  const students = sortParticipants((data?.students || []).filter(isActiveParticipant));

  const handleSubmit = async (answers: Record<string, string | number>) => {
    if (!quiz) return;
    const responseId = genId();
    const answerTxs = Object.entries(answers)
      .filter(([, value]) => value !== "" && value !== undefined)
      .map(([questionId, value]) =>
        tx.answers[genId()].update({
          responseId,
          questionId,
          value,
        })
      );
    await db.transact([
      tx.responses[responseId].update({
        quizId: quiz.id,
        submittedAt: Date.now(),
        metadata: { userAgent: navigator.userAgent },
      }),
      ...answerTxs,
    ]);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return <SurveyComplete />;
  }

  if (isLoading) {
    return <SurveySpinner />;
  }

  if (error || !quiz) {
    return (
      <SurveyState
        title="Survey not found"
        message="This survey may have been removed or is not available."
      />
    );
  }

  if (quiz.variant !== "teacher" && students.length > 0) {
    return (
      <NamePicker
        students={students}
        quizId={quiz.id}
        title={quiz.title}
        description={quiz.description}
      />
    );
  }

  return (
    <SurveyExperience
      quiz={{ ...quiz, variant: (quiz.variant || "student") as "student" | "teacher" }}
      questions={questions}
      onSubmit={handleSubmit}
    />
  );
}
