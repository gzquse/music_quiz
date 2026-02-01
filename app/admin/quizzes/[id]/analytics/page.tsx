"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { db, tx } from "@/lib/instant";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from "@/components/ui";
import { ChartPanel } from "@/components/admin/ChartPanel";
import { formatDateTime, calculateAverage } from "@/lib/utils";

export default function AnalyticsPage() {
  const params = useParams();
  const quizId = params.id as string;

  const { data, isLoading, error } = db.useQuery({
    quizzes: {},
    questions: {},
    responses: {},
    answers: {},
    students: {},
    teachers: {},
    teacher_student_assignments: {},
  });

  const allQuizzes = data?.quizzes || [];
  const quiz = allQuizzes.find((q: { id: string }) => q.id === quizId);
  const studentQuiz = allQuizzes.find(
    (q: { variant?: string; title?: string }) =>
      q.variant === "student" || (q.title || "").toLowerCase().includes("student")
  );
  const allQuestions = data?.questions || [];
  const questions = allQuestions
    .filter((q: { quizId: string }) => q.quizId === quizId)
    .sort((a: { order: number }, b: { order: number }) => a.order - b.order);
  const allResponses = data?.responses || [];
  const responses = allResponses.filter((r: { quizId: string }) => r.quizId === quizId);
  const studentResponses = studentQuiz
    ? allResponses.filter((r: { quizId: string }) => r.quizId === studentQuiz.id)
    : [];
  const allAnswers = data?.answers || [];
  const students = data?.students || [];
  const teachers = data?.teachers || [];
  const assignments = data?.teacher_student_assignments || [];

  const getStudentName = (id: string) => students.find((s: { id: string }) => s.id === id)?.name ?? "-";
  const getTeacherName = (id: string) => teachers.find((t: { id: string }) => t.id === id)?.name ?? "-";

  // Filter answers for this quiz's responses
  const responseIds = new Set(responses.map((r: { id: string }) => r.id));
  const studentResponseIds = new Set(studentResponses.map((r: { id: string }) => r.id));
  const answers = allAnswers.filter((a: { responseId: string }) => responseIds.has(a.responseId));
  const studentAnswers = allAnswers.filter((a: { responseId: string }) => studentResponseIds.has(a.responseId));

  const getWeek = (r: { metadata?: { week?: number } }) => (r.metadata as { week?: number } | undefined)?.week;

  // Teacher responses only (for teacher-centric summaries)
  const teacherResponses = responses.filter((r: { respondentType?: string }) => r.respondentType === "teacher");

  // Get teacher's assigned students
  const getTeacherStudents = (teacherId: string) =>
    assignments
      .filter((a: { teacherId: string }) => a.teacherId === teacherId)
      .map((a: { studentId: string }) => students.find((s: { id: string }) => s.id === a.studentId))
      .filter((s): s is { id: string; name: string; createdAt: number } => !!s);

  // For a teacher-student pair, get responses grouped by week
  const getResponsesByWeek = (teacherId: string, studentId: string) => {
    const relevant = teacherResponses.filter(
      (r: { teacherId?: string; studentId?: string }) =>
        r.teacherId === teacherId && r.studentId === studentId
    );
    const byWeek: Record<number, { response: typeof relevant[0]; answers: typeof answers }> = {};
    for (const r of relevant) {
      const week = getWeek(r);
      if (week && !byWeek[week]) {
        byWeek[week] = {
          response: r,
          answers: answers.filter((a: { responseId: string }) => a.responseId === r.id),
        };
      }
    }
    return byWeek;
  };

  // Average score for a response's scale questions
  const getResponseAverage = (responseAnswers: typeof answers, scaleQIds: string[]) => {
    const vals = responseAnswers
      .filter((a: { questionId: string }) => scaleQIds.includes(a.questionId))
      .map((a: { value: string | number }) =>
        typeof a.value === "number" ? a.value : parseFloat(String(a.value))
      )
      .filter((v) => !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const scaleQuestions = questions.filter((q: { type: string }) => q.type === "scale");
  const scaleQuestionIds = scaleQuestions.map((q: { id: string }) => q.id);
  const studentScaleQuestions = studentQuiz
    ? allQuestions
        .filter((q: { quizId: string; type: string }) => q.quizId === studentQuiz.id && q.type === "scale")
        .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
    : [];
  const studentScaleQuestionIds = studentScaleQuestions.map((q: { id: string }) => q.id);

  const getStudentResponsesByWeek = (studentId: string) => {
    const relevant = studentResponses.filter(
      (r: { respondentType?: string; studentId?: string }) =>
        r.respondentType === "student" && r.studentId === studentId
    );
    const byWeek: Record<number, { response: typeof relevant[0]; answers: typeof studentAnswers }> = {};
    for (const r of relevant) {
      const week = getWeek(r);
      if (week && !byWeek[week]) {
        byWeek[week] = {
          response: r,
          answers: studentAnswers.filter((a: { responseId: string }) => a.responseId === r.id),
        };
      }
    }
    return byWeek;
  };

  const deleteResponse = async (responseId: string) => {
    if (!confirm("Delete this response? This cannot be undone.")) return;
    const responseAnswers = answers.filter((a: { responseId: string }) => a.responseId === responseId);
    try {
      const txs = [
        ...responseAnswers.map((a: { id: string }) => tx.answers[a.id].delete()),
        tx.responses[responseId].delete(),
      ];
      await db.transact(txs);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete response.");
    }
  };

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

  // Average scores per question (overall)
  const questionAverages = scaleQuestions.map((q) => {
    const questionAnswers = answers
      .filter((a) => a.questionId === q.id)
      .map((a) => (typeof a.value === "number" ? a.value : parseFloat(String(a.value))))
      .filter((v) => !isNaN(v));
    
    return {
      name: `Q${q.order + 1}`,
      fullName: q.text,
      value: parseFloat(calculateAverage(questionAnswers).toFixed(2)),
      count: questionAnswers.length,
    };
  });

  // Distribution for each scale question
  const questionDistributions = scaleQuestions.map((q) => {
    const questionAnswers = answers.filter((a) => a.questionId === q.id);
    const distribution: Record<number, number> = {};
    
    for (let i = quiz.scaleMin; i <= quiz.scaleMax; i++) {
      distribution[i] = 0;
    }
    
    questionAnswers.forEach((a) => {
      const val = typeof a.value === "number" ? a.value : parseInt(String(a.value));
      if (distribution[val] !== undefined) {
        distribution[val]++;
      }
    });

    return {
      question: q,
      data: Object.entries(distribution).map(([score, count]) => ({
        name: score,
        value: count,
      })),
    };
  });

  // Response timeline (last 30 days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentResponses = responses.filter((r) => r.submittedAt > thirtyDaysAgo);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-1">
            <Link href="/admin/quizzes" className="hover:text-[var(--foreground)]">
              Surveys
            </Link>
            <span>/</span>
            <span>{quiz.title}</span>
          </div>
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>
        <Link href={`/admin/quizzes/${quizId}/responses`}>
          <Button variant="secondary">View Responses</Button>
        </Link>
        <Link href={`/admin/quizzes/${quizId}`}>
          <Button variant="secondary">Edit Survey</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardContent>
            <p className="text-3xl font-bold">{responses.length}</p>
            <p className="text-sm text-[var(--muted)]">Total Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-3xl font-bold">{responses.filter((r: { respondentType?: string }) => r.respondentType === "student").length}</p>
            <p className="text-sm text-[var(--muted)]">Student</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-3xl font-bold">{responses.filter((r: { respondentType?: string }) => r.respondentType === "teacher").length}</p>
            <p className="text-sm text-[var(--muted)]">Teacher</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-3xl font-bold">{questions.length}</p>
            <p className="text-sm text-[var(--muted)]">Questions</p>
          </CardContent>
        </Card>
      </div>

      {responses.length === 0 ? (
        <Card className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No responses yet</h2>
          <p className="text-[var(--muted)] mb-4">
            Share your survey to start collecting responses
          </p>
          <div className="flex items-center justify-center gap-2">
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? `${window.location.origin}/quiz/${quizId}` : ""}
              className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm w-80"
            />
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/quiz/${quizId}`);
              }}
            >
              Copy Link
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Teacher Summaries: 4 teachers, each with 8 weeks per student */}
          {teacherResponses.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-6">Teacher Summaries</h2>
              <div className="space-y-8">
                {teachers.map((teacher: { id: string; name: string }) => {
                  const teacherStudents = getTeacherStudents(teacher.id);
                  if (teacherStudents.length === 0) return null;

                  return (
                    <Card key={teacher.id}>
                      <CardHeader>
                        <CardTitle>{teacher.name}</CardTitle>
                        <CardDescription>
                          {teacherStudents.length} student{teacherStudents.length > 1 ? "s" : ""}:{" "}
                          {teacherStudents.map((s) => s.name).join(", ")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {teacherStudents.map((student: { id: string; name: string }) => {
                            const byWeek = getResponsesByWeek(teacher.id, student.id);
                            const weekData = [1, 2, 3, 4, 5, 6, 7, 8].map((week) => {
                              const w = byWeek[week];
                              const avg = w
                                ? getResponseAverage(w.answers, scaleQuestionIds)
                                : null;
                              return { week, avg, hasData: !!w };
                            });

                            return (
                              <div
                                key={student.id}
                                className="border border-[var(--border)] rounded-lg p-4"
                              >
                                <h3 className="font-semibold mb-3">{student.name}</h3>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-[var(--border)]">
                                        <th className="text-left py-2 px-2 font-medium text-[var(--muted)]">
                                          Week
                                        </th>
                                        {scaleQuestions.slice(0, 6).map((q: { order: number }) => (
                                          <th
                                            key={q.order}
                                            className="text-center py-2 px-2 font-medium text-[var(--muted)]"
                                          >
                                            Q{q.order + 1}
                                          </th>
                                        ))}
                                        <th className="text-center py-2 px-2 font-medium text-[var(--muted)]">
                                          Avg
                                        </th>
                                        <th className="text-right py-2 px-2 font-medium text-[var(--muted)]">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {weekData.map(({ week, avg, hasData }) => {
                                        const w = byWeek[week];
                                        const qVals = scaleQuestionIds.map((qId) => {
                                          const a = w?.answers?.find(
                                            (x: { questionId: string }) => x.questionId === qId
                                          );
                                          const v =
                                            typeof a?.value === "number"
                                              ? a.value
                                              : parseFloat(String(a?.value ?? ""));
                                          return isNaN(v) ? null : v;
                                        });
                                        const rowAvg =
                                          qVals.filter((v) => v !== null).length > 0
                                            ? (
                                                (qVals.filter((v) => v !== null) as number[]).reduce(
                                                  (a, b) => a + b,
                                                  0
                                                ) / (qVals.filter((v) => v !== null) as number[]).length
                                              ).toFixed(1)
                                            : "-";

                                        return (
                                          <tr
                                            key={week}
                                            className="border-b border-[var(--border)] last:border-0"
                                          >
                                            <td className="py-2 px-2 font-medium">Week {week}</td>
                                            {qVals.map((v, i) => (
                                              <td
                                                key={i}
                                                className="text-center py-2 px-2 text-[var(--muted)]"
                                              >
                                                {v !== null ? v : "-"}
                                              </td>
                                            ))}
                                            <td className="text-center py-2 px-2 font-medium">
                                              {rowAvg}
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                              {w?.response && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => deleteResponse(w.response.id)}
                                                  className="text-[var(--error)] hover:bg-[var(--error)]/10 text-xs"
                                                >
                                                  Delete
                                                </Button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                {weekData.some((w) => w.hasData) && (
                                  <div className="mt-4 space-y-4">
                                    <ChartPanel
                                      title={`${student.name} - Score Trend (Teacher view)`}
                                      type="line"
                                      data={weekData
                                        .filter((w) => w.avg !== null)
                                        .map((w) => ({
                                          name: `Week ${w.week}`,
                                          Teacher: Number(w.avg?.toFixed(2)),
                                        }))}
                                      lineKeys={["Teacher"]}
                                    />
                                    {studentQuiz && (() => {
                                      const studentByWeek = getStudentResponsesByWeek(student.id);
                                      const comparisonData = [1, 2, 3, 4, 5, 6, 7, 8].map((week) => {
                                        const tw = byWeek[week];
                                        const sw = studentByWeek[week];
                                        const teacherAvg = tw
                                          ? getResponseAverage(tw.answers, scaleQuestionIds)
                                          : null;
                                        const studentAvg = sw && studentScaleQuestionIds.length
                                          ? getResponseAverage(sw.answers, studentScaleQuestionIds)
                                          : null;
                                        return {
                                          name: `Week ${week}`,
                                          Teacher: teacherAvg != null ? Number(teacherAvg.toFixed(2)) : undefined,
                                          Student: studentAvg != null ? Number(studentAvg.toFixed(2)) : undefined,
                                        };
                                      }).filter((d) => d.Teacher != null || d.Student != null);
                                      return comparisonData.length > 0 ? (
                                        <ChartPanel
                                          title={`${student.name} - Teacher vs Student`}
                                          type="line"
                                          data={comparisonData}
                                          lineKeys={["Teacher", "Student"]}
                                        />
                                      ) : null;
                                    })()}
                                    <ChartPanel
                                      title={`${student.name} - Q1-Q6 Average (across weeks)`}
                                      data={scaleQuestionIds.slice(0, 6).map((qId, i) => {
                                        const vals = Object.values(byWeek)
                                          .map((w) => {
                                            const a = w.answers.find(
                                              (x: { questionId: string }) => x.questionId === qId
                                            );
                                            const v =
                                              typeof a?.value === "number"
                                                ? a.value
                                                : parseFloat(String(a?.value ?? ""));
                                            return isNaN(v) ? null : v;
                                          })
                                          .filter((v): v is number => v !== null);
                                        const avg =
                                          vals.length > 0
                                            ? vals.reduce((a, b) => a + b, 0) / vals.length
                                            : 0;
                                        return {
                                          name: `Q${i + 1}`,
                                          value: Math.round(avg * 10) / 10,
                                        };
                                      }).filter((d) => d.value > 0)}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Average Scores Chart */}
          <div className="mb-8">
            <ChartPanel
              title="Average Score by Question (All Responses)"
              data={questionAverages}
            />
          </div>

          {/* Question Distributions */}
          <h2 className="text-xl font-semibold mb-4">Score Distribution by Question</h2>
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {questionDistributions.map(({ question, data }) => (
              <ChartPanel
                key={question.id}
                title={`Q${question.order + 1}: ${question.text.slice(0, 50)}${question.text.length > 50 ? "..." : ""}`}
                data={data}
                type="distribution"
              />
            ))}
          </div>

          {/* Response Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Responses</CardTitle>
              <Link href={`/admin/quizzes/${quizId}/responses`}>
                <Button variant="ghost" size="sm">View by Participant</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                        Teacher
                      </th>
                      {scaleQuestions.slice(0, 6).map((q) => (
                        <th
                          key={q.id}
                          className="text-center py-3 px-2 font-medium text-[var(--muted)]"
                          title={q.text}
                        >
                          Q{q.order + 1}
                        </th>
                      ))}
                      <th className="text-right py-3 px-4 font-medium text-[var(--muted)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses
                      .sort((a, b) => b.submittedAt - a.submittedAt)
                      .slice(0, 20)
                      .map((response) => {
                        const responseAnswers = answers.filter(
                          (a) => a.responseId === response.id
                        );
                        const respondentType = response.respondentType ?? "-";
                        const studentName = response.studentId ? getStudentName(response.studentId) : "-";
                        const teacherName = response.teacherId ? getTeacherName(response.teacherId) : "-";
                        return (
                          <tr
                            key={response.id}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="py-3 px-4 text-[var(--muted)]">
                              {formatDateTime(response.submittedAt)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                respondentType === "student" ? "bg-[var(--accent)]/10 text-[var(--accent)]" :
                                respondentType === "teacher" ? "bg-[var(--primary)]/10 text-[var(--primary)]" :
                                "bg-[var(--muted)]/10 text-[var(--muted)]"
                              }`}>
                                {respondentType}
                              </span>
                            </td>
                            <td className="py-3 px-4">{studentName}</td>
                            <td className="py-3 px-4">{teacherName}</td>
                            {scaleQuestions.slice(0, 6).map((q) => {
                              const answer = responseAnswers.find(
                                (a) => a.questionId === q.id
                              );
                              return (
                                <td
                                  key={q.id}
                                  className="py-3 px-2 text-center"
                                >
                                  {answer?.value ?? "-"}
                                </td>
                              );
                            })}
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteResponse(response.id)}
                                className="text-[var(--error)] hover:bg-[var(--error)]/10 text-xs"
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

