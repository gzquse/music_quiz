"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/instant";
import { Card, Button } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export default function ResponsesViewerPage() {
  const params = useParams();
  const quizId = params.id as string;
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");

  const { data, isLoading, error } = db.useQuery({
    quizzes: { $: { where: { id: quizId } } },
    questions: { $: { where: { quizId } } },
    responses: { $: { where: { quizId } } },
    answers: {},
    students: {},
    teachers: {},
    teacher_student_assignments: {},
  });

  const quiz = data?.quizzes?.[0];
  const questions = (data?.questions || []).sort((a: { order: number }, b: { order: number }) => a.order - b.order);
  const responses = data?.responses || [];
  const answers = data?.answers || [];
  const students = data?.students || [];
  const teachers = data?.teachers || [];
  const assignments = data?.teacher_student_assignments || [];

  const scaleQuestions = questions.filter((q: { type: string }) => q.type === "scale");
  const textQuestions = questions.filter((q: { type: string }) => q.type === "text");

  const getAnswersForResponse = (responseId: string) => {
    return answers.filter((a: { responseId: string }) => a.responseId === responseId);
  };

  const getAnswerValue = (responseAnswers: { questionId: string; value: string | number }[], questionId: string) => {
    const a = responseAnswers.find((x: { questionId: string }) => x.questionId === questionId);
    return a?.value ?? "-";
  };

  const getTeacherStudents = (teacherId: string) =>
    assignments
      .filter((a: { teacherId: string }) => a.teacherId === teacherId)
      .map((a: { studentId: string }) => students.find((s: { id: string }) => s.id === a.studentId))
      .filter((s): s is { id: string; name: string; createdAt: number } => !!s);

  const getWeek = (r: { metadata?: { week?: number } }) => (r.metadata as { week?: number } | undefined)?.week;

  const getTeacherResponse = (teacherId: string, studentId: string) => {
    const teacherResponses = responses.filter(
      (r: { respondentType?: string; teacherId?: string; studentId?: string }) =>
        r.respondentType === "teacher" && r.teacherId === teacherId && r.studentId === studentId
    );
    if (teacherResponses.length === 0) return null;
    if (selectedWeek !== "all") {
      const forWeek = teacherResponses.find((r) => getWeek(r) === selectedWeek);
      return forWeek ?? null;
    }
    return teacherResponses.sort(
      (a: { submittedAt: number }, b: { submittedAt: number }) => b.submittedAt - a.submittedAt
    )[0];
  };

  const getStudentResponse = (studentId: string) => {
    const studentResponses = responses.filter(
      (r: { respondentType?: string; studentId?: string }) =>
        r.respondentType === "student" && r.studentId === studentId
    );
    if (studentResponses.length === 0) return null;
    if (selectedWeek !== "all") {
      const forWeek = studentResponses.find((r) => getWeek(r) === selectedWeek);
      return forWeek ?? null;
    }
    return studentResponses.sort(
      (a: { submittedAt: number }, b: { submittedAt: number }) => b.submittedAt - a.submittedAt
    )[0];
  };

  const getTeacherName = (teacherId: string) => teachers.find((t: { id: string }) => t.id === teacherId)?.name ?? "Unknown";
  const getStudentName = (studentId: string) => students.find((s: { id: string }) => s.id === studentId)?.name ?? "Unknown";

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

  const selectedStudent = selectedStudentId ? students.find((s: { id: string }) => s.id === selectedStudentId) : null;
  const selectedStudentResponse = selectedStudentId ? getStudentResponse(selectedStudentId) : null;
  const selectedStudentAnswers = selectedStudentResponse ? getAnswersForResponse(selectedStudentResponse.id) : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-1">
            <Link href="/admin/quizzes" className="hover:text-[var(--foreground)]">Surveys</Link>
            <span>/</span>
            <Link href={`/admin/quizzes/${quizId}`} className="hover:text-[var(--foreground)]">{quiz.title}</Link>
          </div>
          <h1 className="text-3xl font-bold">Responses by Participant</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="week" className="text-sm font-medium text-[var(--muted)]">Week:</label>
            <select
              id="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm"
            >
              <option value="all">All (latest)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
          <Link href={`/admin/quizzes/${quizId}/analytics`}>
            <Button variant="secondary">Analytics</Button>
          </Link>
          <Link href={`/admin/quizzes/${quizId}`}>
            <Button variant="ghost">Edit Survey</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        {teachers.map((teacher: { id: string; name: string }) => {
          const teacherStudents = getTeacherStudents(teacher.id);
          if (teacherStudents.length === 0) return null;

          return (
            <Card key={teacher.id}>
              <h2 className="text-xl font-semibold mb-4">{teacher.name}</h2>
              <div className="space-y-4">
                {teacherStudents.map((student: { id: string; name: string }) => {
                  const teacherResponse = getTeacherResponse(teacher.id, student.id);
                  const responseAnswers = teacherResponse ? getAnswersForResponse(teacherResponse.id) : [];

                  return (
                    <div
                      key={student.id}
                      className="border border-[var(--border)] rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(student.id)}
                          className="font-semibold text-[var(--primary)] hover:underline text-left"
                        >
                          {student.name}
                        </button>
                        <span className="text-xs text-[var(--muted)]">
                          Click to view student self-assessment
                        </span>
                      </div>

                      {teacherResponse ? (
                        <div>
                          <p className="text-xs text-[var(--muted)] mb-2">
                            Teacher response
                            {selectedWeek !== "all" && ` (Week ${selectedWeek})`}
                            {": "}{formatDateTime(teacherResponse.submittedAt)}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                            {scaleQuestions.slice(0, 6).map((q: { id: string; order: number; text: string }) => (
                              <div key={q.id} className="bg-[var(--surface-hover)] rounded px-2 py-1">
                                <div className="text-[var(--muted)] truncate" title={q.text}>
                                  Q{q.order + 1}
                                </div>
                                <div className="font-medium">
                                  {getAnswerValue(responseAnswers, q.id)}
                                </div>
                              </div>
                            ))}
                          </div>
                          {textQuestions.length > 0 && (
                            <div className="mt-2 text-sm">
                              {textQuestions.map((q: { id: string; text: string }) => {
                                const val = getAnswerValue(responseAnswers, q.id);
                                if (val === "-" || val === "") return null;
                                return (
                                  <div key={q.id} className="mt-1">
                                    <span className="text-[var(--muted)]">{q.text.slice(0, 40)}...: </span>
                                    <span>{String(val).slice(0, 100)}{String(val).length > 100 ? "..." : ""}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted)]">No teacher response yet</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {teachers.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-[var(--muted)]">No teachers with assigned students. Add participants and assignments in the Participants section.</p>
        </Card>
      )}

      {/* Student self-assessment modal */}
      {selectedStudentId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedStudentId(null)}
        >
          <div
            className="bg-[var(--surface)] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {getStudentName(selectedStudentId)} - Self Assessment
              </h2>
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {selectedStudentResponse ? (
                <div>
                  <p className="text-sm text-[var(--muted)] mb-4">
                    {selectedWeek !== "all" && `Week ${selectedWeek} - `}
                    Submitted: {formatDateTime(selectedStudentResponse.submittedAt)}
                  </p>
                  <div className="space-y-4">
                    {scaleQuestions.map((q: { id: string; order: number; text: string }) => (
                      <div key={q.id} className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                        <span className="text-sm">{q.text}</span>
                        <span className="font-medium">{getAnswerValue(selectedStudentAnswers, q.id)}</span>
                      </div>
                    ))}
                    {textQuestions.map((q: { id: string; text: string }) => {
                      const val = getAnswerValue(selectedStudentAnswers, q.id);
                      if (val === "-" || val === "") return null;
                      return (
                        <div key={q.id}>
                          <p className="text-sm text-[var(--muted)] mb-1">{q.text}</p>
                          <p className="text-sm">{String(val)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[var(--muted)]">No self-assessment submitted yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
