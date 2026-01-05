"use client";

import Link from "next/link";
import { db, tx } from "@/lib/instant";
import { Card, Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function QuizzesPage() {
  const { data, isLoading } = db.useQuery({
    quizzes: {},
    responses: {},
  });

  const quizzes = data?.quizzes || [];
  const responses = data?.responses || [];

  // Response counts by quiz
  const responsesByQuiz = responses.reduce((acc, r) => {
    acc[r.quizId] = (acc[r.quizId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleActive = async (quizId: string, currentStatus: boolean) => {
    await db.transact([
      tx.quizzes[quizId].update({ isActive: !currentStatus }),
    ]);
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this survey? This action cannot be undone.")) {
      return;
    }
    await db.transact([tx.quizzes[quizId].delete()]);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Surveys</h1>
          <p className="text-[var(--muted)]">Manage your surveys and questionnaires</p>
        </div>
        <Link href="/admin/quizzes/new">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Survey
          </Button>
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">No surveys yet</h2>
          <p className="text-[var(--muted)] mb-4">Create your first survey to start collecting responses</p>
          <Link href="/admin/quizzes/new">
            <Button>Create Survey</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold truncate">{quiz.title}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      quiz.isActive
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : "bg-[var(--muted)]/10 text-[var(--muted)]"
                    }`}
                  >
                    {quiz.isActive ? "Active" : "Draft"}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] truncate">{quiz.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-[var(--muted)]">
                  <span>{responsesByQuiz[quiz.id] || 0} responses</span>
                  <span>Created {formatDate(quiz.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActive(quiz.id, quiz.isActive)}
                >
                  {quiz.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Link href={`/admin/quizzes/${quiz.id}`}>
                  <Button variant="secondary" size="sm">Edit</Button>
                </Link>
                <Link href={`/admin/quizzes/${quiz.id}/analytics`}>
                  <Button variant="secondary" size="sm">Analytics</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteQuiz(quiz.id)}
                  className="text-[var(--error)] hover:bg-[var(--error)]/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

