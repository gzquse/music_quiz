"use client";

import { useEffect, useRef } from "react";
import { db, type Question, type Quiz, type Student } from "@/lib/instant";
import { NamePicker, SurveySpinner, SurveyState } from "@/components/quiz";
import {
  isActiveParticipant,
  sortParticipants,
  SURVEY_DESCRIPTION,
  SURVEY_TITLE,
} from "@/lib/survey";
import { syncWeeklySurvey } from "@/lib/syncWeeklySurvey";

export default function HomePage() {
  const didSync = useRef(false);
  const { isLoading, error, data } = db.useQuery({
    quizzes: {},
    questions: {},
    students: {},
  });

  useEffect(() => {
    if (didSync.current || isLoading || !data) return;
    const hasWeekly = (data.quizzes || []).some(
      (quiz) => quiz.title === SURVEY_TITLE && quiz.isActive
    );
    if (hasWeekly) return;
    didSync.current = true;
    void syncWeeklySurvey({
      quizzes: (data.quizzes || []) as Quiz[],
      questions: (data.questions || []).map((q) => ({
        ...q,
        type: q.type as Question["type"],
      })),
      students: (data.students || []) as Student[],
    }).catch((err) => {
      console.error("Could not refresh weekly survey:", err);
    });
  }, [isLoading, data]);

  const quizzes = data?.quizzes || [];
  const studentQuiz =
    quizzes.find((q) => q.isActive && q.title === SURVEY_TITLE) ??
    quizzes.find((q) => q.isActive && q.variant === "student") ??
    quizzes.find((q) => q.isActive);
  const students = sortParticipants((data?.students || []).filter(isActiveParticipant));

  if (isLoading) {
    return <SurveySpinner />;
  }

  if (error) {
    return (
      <SurveyState
        title="Could not load"
        message="Please check your connection and try again."
      />
    );
  }

  if (!studentQuiz) {
    return (
      <SurveyState
        title="No survey yet"
        message="The weekly questionnaire is not available right now."
      />
    );
  }

  return (
    <NamePicker
      students={students}
      quizId={studentQuiz.id}
      title={SURVEY_TITLE}
      description={SURVEY_DESCRIPTION}
    />
  );
}
