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
import { AppShell, personTone } from "@/components/quiz/AppShell";
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
      <AppShell className="px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <header className="px-1 pt-6 text-center">
          <p className="text-[15px] font-medium tracking-wide text-[var(--foreground)]/80">
            {teacher.name}
          </p>
          <h1 className="font-display mx-auto mt-4 max-w-[16ch] text-[32px] font-semibold leading-[1.12] tracking-tight">
            Choose a student
          </h1>
          <p className="mt-3 text-[15px] text-[var(--muted)]">
            Who are you assessing today?
          </p>
        </header>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {assignedStudents.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStudentId(s.id)}
              className={`relative flex min-h-[108px] flex-col justify-end overflow-hidden rounded-[28px] bg-gradient-to-br ${personTone(s.name)} p-4 text-left text-white shadow-[var(--shadow)] active:scale-[0.98] transition-transform`}
            >
              <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-[13px] font-semibold backdrop-blur-md">
                {s.name.slice(0, 1)}
              </span>
              <span className="text-[18px] font-semibold leading-tight">{s.name}</span>
            </button>
          ))}
        </div>
      </AppShell>
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
