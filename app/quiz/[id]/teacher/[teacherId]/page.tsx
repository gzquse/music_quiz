"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { db, tx, id as genId, type Question, type Quiz } from "@/lib/instant";
import { getWeekFromStudyStart } from "@/lib/utils";
import {
  DEFAULT_SCALE_LABELS,
  isActiveParticipant,
  sortParticipants,
  SURVEY_DESCRIPTION,
  SURVEY_INSTRUCTIONS,
  SURVEY_TITLE,
  TEACHER_WEEKLY_QUESTIONS,
} from "@/lib/survey";
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
  const allStudents = sortParticipants(
    (data?.students || []).filter(isActiveParticipant)
  );
  const assignedStudents = sortParticipants(
    assignments
      .map((a) => allStudents.find((s) => s.id === a.studentId))
      .filter((s): s is NonNullable<typeof s> => !!s)
  );
  const studentsToGrade = assignedStudents.length > 0 ? assignedStudents : allStudents;

  const questions = (data?.questions || [])
    .map((q) => ({ ...q, type: q.type as Question["type"] }))
    .sort((a, b) => a.order - b.order)
    .map((q, index) => {
      const weekly = TEACHER_WEEKLY_QUESTIONS[index];
      if (!weekly) return q;
      return {
        ...q,
        title: weekly.title,
        text: weekly.text,
        type: weekly.type,
        required: weekly.required,
      };
    })
    .slice(0, TEACHER_WEEKLY_QUESTIONS.length);

  const displayQuiz = quiz
    ? ({
        ...quiz,
        title: SURVEY_TITLE,
        description: SURVEY_DESCRIPTION,
        instructions: SURVEY_INSTRUCTIONS,
        scaleLabels: [...DEFAULT_SCALE_LABELS],
        scaleMin: 1,
        scaleMax: 5,
        variant: "teacher" as const,
      } satisfies Quiz)
    : undefined;

  const selectedStudent = studentsToGrade.find((s) => s.id === selectedStudentId);

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
            Grade another student
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return <SurveySpinner />;
  }

  if (error || !quiz || !teacher || !displayQuiz) {
    return (
      <SurveyState
        title="Link not found"
        message="This survey or teacher link may be invalid."
      />
    );
  }

  if (studentsToGrade.length === 0) {
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
            Grade a student
          </h1>
          <p className="mt-3 text-[15px] text-[var(--muted)]">
            Choose who you are assessing this week.
          </p>
        </header>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {studentsToGrade.map((s, index) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStudentId(s.id)}
              className={`relative flex min-h-[108px] flex-col justify-end overflow-hidden rounded-[28px] bg-gradient-to-br ${personTone(s.name, index)} p-4 text-left text-white shadow-[var(--shadow)] active:scale-[0.98] transition-transform`}
            >
              <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-[13px] font-semibold backdrop-blur-md">
                {s.name.slice(0, 1)}
              </span>
              <span className="text-[18px] font-semibold leading-tight">{s.name}</span>
              <span className="mt-1 text-[12px] text-white/80">Grade</span>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <SurveyExperience
      quiz={displayQuiz}
      questions={questions}
      greeting={selectedStudent?.name}
      greetingPrefix="Assessing "
      onSubmit={handleSubmit}
    />
  );
}
