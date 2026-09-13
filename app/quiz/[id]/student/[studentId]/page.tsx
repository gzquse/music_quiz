"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { db, tx, id as genId, type Question, type Quiz } from "@/lib/instant";
import { formatWeekLabel, getWeekFromResponse, getWeekFromStudyStart } from "@/lib/utils";
import {
  DEFAULT_SCALE_LABELS,
  SURVEY_DESCRIPTION,
  SURVEY_INSTRUCTIONS,
  SURVEY_TITLE,
  WEEKLY_QUESTIONS,
} from "@/lib/survey";
import {
  SurveyComplete,
  SurveyExperience,
  SurveySpinner,
  SurveyState,
} from "@/components/quiz";

export default function StudentQuizPage() {
  const params = useParams();
  const quizId = params.id as string;
  const studentId = params.studentId as string;

  const [isSubmitted, setIsSubmitted] = useState(false);

  const { isLoading, error, data } = db.useQuery({
    quizzes: {
      $: { where: { id: quizId } },
    },
    questions: {
      $: { where: { quizId } },
    },
    students: {
      $: { where: { id: studentId } },
    },
    responses: {
      $: { where: { studentId } },
    },
  });

  const quiz = data?.quizzes?.[0];
  const student = data?.students?.[0];
  const questions = (data?.questions || [])
    .map((q) => ({ ...q, type: q.type as Question["type"] }))
    .sort((a, b) => a.order - b.order)
    .map((q, index) => {
      const weekly = WEEKLY_QUESTIONS[index];
      if (!weekly) return q;
      return {
        ...q,
        title: weekly.title,
        text: weekly.text,
        type: weekly.type,
        required: weekly.required,
      };
    })
    .slice(0, WEEKLY_QUESTIONS.length);

  const displayQuiz = quiz
    ? ({
        ...quiz,
        title: SURVEY_TITLE,
        description: SURVEY_DESCRIPTION,
        instructions: SURVEY_INSTRUCTIONS,
        scaleLabels: [...DEFAULT_SCALE_LABELS],
        scaleMin: 1,
        scaleMax: 5,
        variant: "student" as const,
      } satisfies Quiz)
    : undefined;

  const currentWeek = getWeekFromStudyStart(quiz?.studyStartDate);
  const alreadyCompleted = (data?.responses || []).some((response) => {
    if (response.quizId !== quizId) return false;
    if (response.respondentType && response.respondentType !== "student") return false;
    return getWeekFromResponse(response, quiz?.studyStartDate) === currentWeek;
  });

  const handleSubmit = async (answers: Record<string, string | number>) => {
    if (!quiz || !student) return;
    const responseId = genId();
    const week = getWeekFromStudyStart(quiz.studyStartDate);
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
        metadata: { userAgent: navigator.userAgent, week },
        respondentType: "student",
        studentId,
        teacherId: "",
      }),
      ...answerTxs,
    ]);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return <SurveyComplete name={student?.name} />;
  }

  if (isLoading) {
    return <SurveySpinner />;
  }

  if (error || !quiz || !student || !displayQuiz) {
    return (
      <SurveyState
        title="Link not found"
        message="This survey link may be invalid. Please use your name from the home page."
      />
    );
  }

  return (
    <SurveyExperience
      quiz={displayQuiz}
      questions={questions}
      greeting={student.name}
      alreadyCompleted={alreadyCompleted}
      weekLabel={formatWeekLabel(currentWeek, quiz.studyStartDate)}
      onSubmit={handleSubmit}
    />
  );
}
