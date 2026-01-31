"use client";

import { db } from "@/lib/instant";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { data, isLoading } = db.useQuery({
    quizzes: {},
    responses: {},
    students: {},
    teachers: {},
  });

  const quizzes = data?.quizzes || [];
  const responses = data?.responses || [];
  const students = data?.students || [];
  const teachers = data?.teachers || [];

  const studentQuiz = quizzes.find(
    (q: { variant?: string; title?: string }) =>
      q.variant === "student" || (q.title || "").toLowerCase().includes("student")
  );
  const teacherQuiz = quizzes.find(
    (q: { variant?: string; title?: string }) =>
      q.variant === "teacher" || (q.title || "").toLowerCase().includes("teacher")
  );
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Calculate stats
  const totalQuizzes = quizzes.length;
  const activeQuizzes = quizzes.filter((q) => q.isActive).length;
  const totalResponses = responses.length;
  
  // Recent responses (last 7 days)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentResponses = responses.filter((r) => r.submittedAt > weekAgo);

  // Response counts by quiz
  const responsesByQuiz = responses.reduce((acc, r) => {
    acc[r.quizId] = (acc[r.quizId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted)]">Overview of your surveys and responses</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalQuizzes}</p>
                <p className="text-sm text-[var(--muted)]">Total Surveys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--success)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{activeQuizzes}</p>
                <p className="text-sm text-[var(--muted)]">Active Surveys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalResponses}</p>
                <p className="text-sm text-[var(--muted)]">Total Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary-light)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--primary-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold">{recentResponses.length}</p>
                <p className="text-sm text-[var(--muted)]">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Survey links - all 10 participant links */}
      {studentQuiz && teacherQuiz && (students.length > 0 || teachers.length > 0) && (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Survey Links</CardTitle>
              <p className="text-sm text-[var(--muted)] mt-1">
                Copy and share these links with participants. Same links each week.
              </p>
            </div>
            <Link href="/admin/participants">
              <Button variant="ghost" size="sm">Manage Participants</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-medium mb-2 text-sm text-[var(--muted)]">Students (6 links)</h3>
                <div className="space-y-2">
                  {students.map((s: { id: string; name: string }, i: number) => {
                    const url = `${baseUrl}/quiz/${studentQuiz.id}/student/${s.id}`;
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-sm w-20">{s.name}</span>
                        <input
                          readOnly
                          value={url}
                          className="flex-1 px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--surface)] truncate"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            alert("Copied");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    );
                  })}
                  {students.length === 0 && (
                    <p className="text-sm text-[var(--muted)]">No students. Add in Participants.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2 text-sm text-[var(--muted)]">Teachers (4 links)</h3>
                <div className="space-y-2">
                  {teachers.map((t: { id: string; name: string }) => {
                    const url = `${baseUrl}/quiz/${teacherQuiz.id}/teacher/${t.id}`;
                    return (
                      <div key={t.id} className="flex items-center gap-2">
                        <span className="text-sm w-20">{t.name}</span>
                        <input
                          readOnly
                          value={url}
                          className="flex-1 px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--surface)] truncate"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            alert("Copied");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    );
                  })}
                  {teachers.length === 0 && (
                    <p className="text-sm text-[var(--muted)]">No teachers. Add in Participants.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Surveys Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Surveys</CardTitle>
          <Link
            href="/admin/quizzes/new"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Create New
          </Link>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <p>No surveys yet. Create your first one!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">Responses</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.slice(0, 5).map((quiz) => (
                    <tr key={quiz.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3 px-4">
                        <p className="font-medium">{quiz.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            quiz.isActive
                              ? "bg-[var(--success)]/10 text-[var(--success)]"
                              : "bg-[var(--muted)]/10 text-[var(--muted)]"
                          }`}
                        >
                          {quiz.isActive ? "Active" : "Draft"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)]">
                        {responsesByQuiz[quiz.id] || 0}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)]">
                        {formatDate(quiz.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/quizzes/${quiz.id}`}
                          className="text-sm text-[var(--primary)] hover:underline mr-3"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/quizzes/${quiz.id}/analytics`}
                          className="text-sm text-[var(--primary)] hover:underline"
                        >
                          Analytics
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

