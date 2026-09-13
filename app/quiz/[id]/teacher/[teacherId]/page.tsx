"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { db, tx, id as genId, type Question } from "@/lib/instant";
import { getWeekFromStudyStart } from "@/lib/utils";
import {
  SurveyComplete,
  SurveyExperience,
  SurveySpinner,
  SurveyState,
} from "@/components/quiz";
import { Button } from "@/components/ui";

export default function TeacherQuizPage() {
  const params = useParams();
  const quizId = params.id as string;
  const teacherId = params.teacherId as string;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { isLoading, error, data } = db.useQuery({
    quizzes: { $: { where: { id: quizId } } },
    questions: { $: { where: { quizId } } },
    teachers: { $: { where: { id: teacherId } } },
    teacher_student_assignments: { $: { where: { teacherId } } },
    students: {},
  });

  const quiz = data?.quizzes?.[0];
  const teacher = data?.teachers?.[0];
  const assignments = data?.teacher_student_assignments || [];
  const allStudents = data?.students || [];
  const assignedStudents = assignments
    .map((a) => allStudents.find((s) => s.id === a.studentId))
    .filter((s): s is NonNullable<typeof s> => !!s);

  const questions = (data?.questions || [])
    .map((q) => ({ ...q, type: q.type as Question["type"] }))
    .sort((a, b) => a.order - b.order);

  const selectedStudent = assignedStudents.find((s) => s.id === selectedStudentId);

  const handleSubmit = async (answers: Record<string, string | number>) => {
    if (!quiz || !teacher || !selectedStudentId) return;
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
        respondentType: "teacher",
        studentId: selectedStudentId,
        teacherId,
      }),
      ...answerTxs,
    ]);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <SurveyComplete
        message={
          selectedStudent
            ? `Your assessment of ${selectedStudent.name} has been saved.`
            : "Your response has been saved."
        }
        extraAction={
          <Button
            className="h-14 w-full rounded-full text-[17px] font-semibold"
            onClick={() => {
              setSelectedStudentId(null);
              setIsSubmitted(false);
            }}
          >
            Fill for another student
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return <SurveySpinner />;
  }

  if (error || !quiz || !teacher) {
    return (
      <SurveyState
        title="Link not found"
        message="This survey or teacher link may be invalid."
      />
    );
  }

  if (assignedStudents.length === 0) {
    return (
      <SurveyState
        title="No students assigned"
        message="You have no students assigned. Please contact the administrator."
      />
    );
  }

  if (!selectedStudentId) {
    return (
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col bg-[var(--background)] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <header className="pt-4">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
            {teacher.name}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">
            {quiz.title}
          </h1>
          <p className="mt-3 text-[17px] text-[var(--muted)]">
            Select the student you are assessing today.
          </p>
        </header>
        <div className="mt-8 overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[var(--shadow)]">
          {assignedStudents.map((s, index) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStudentId(s.id)}
              className={`flex min-h-[56px] w-full items-center justify-between px-5 text-left text-[17px] font-medium active:bg-[var(--surface-hover)] ${
                index !== assignedStudents.length - 1 ? "border-b border-[var(--border)]" : ""
              }`}
            >
              {s.name}
              <svg className="h-5 w-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SurveyExperience
      quiz={{ ...quiz, variant: (quiz.variant || "teacher") as "student" | "teacher" }}
      questions={questions}
      greeting={selectedStudent?.name}
      greetingPrefix="Assessing "
      onSubmit={handleSubmit}
    />
  );
}
