"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db, tx, id as genId, type Question } from "@/lib/instant";
import { getWeekFromStudyStart } from "@/lib/utils";
import { QuestionRenderer } from "@/components/quiz";
import { Button, Card } from "@/components/ui";

export default function StudentQuizPage() {
  const params = useParams();
  const quizId = params.id as string;
  const studentId = params.studentId as string;

  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  });

  const quiz = data?.quizzes?.[0];
  const student = data?.students?.[0];
  const questions = (data?.questions || [])
    .map((q) => ({ ...q, type: q.type as Question["type"] }))
    .sort((a, b) => a.order - b.order);

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !student) return;
    setIsSubmitting(true);
    try {
      const responseId = genId();
      const week = getWeekFromStudyStart(quiz.studyStartDate);
      await db.transact([
        tx.responses[responseId].update({
          quizId: quiz.id,
          submittedAt: Date.now(),
          metadata: { userAgent: navigator.userAgent, week },
          respondentType: "student",
          studentId,
          teacherId: "",
        }),
      ]);
      const answerTxs = Object.entries(answers).map(([questionId, value]) =>
        tx.answers[genId()].update({
          responseId,
          questionId,
          value,
        })
      );
      await db.transact(answerTxs);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Failed to submit:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
          <p className="text-[var(--muted)] mb-6">Your response has been recorded successfully.</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quiz || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Survey Not Found</h1>
          <p className="text-[var(--muted)] mb-6">This survey or student link may be invalid.</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const requiredQuestions = questions.filter((q) => q.required);
  const answeredRequired = requiredQuestions.filter((q) => answers[q.id] !== undefined);
  const progress = requiredQuestions.length > 0
    ? (answeredRequired.length / requiredQuestions.length) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <span className="text-sm text-[var(--muted)]">
              {answeredRequired.length} of {requiredQuestions.length} required
            </span>
          </div>
          <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
          <p className="text-[var(--muted)]">{quiz.description}</p>
        </div>

        {quiz.instructions && (
          <Card className="mb-8 bg-[var(--accent-light)]/20 border-[var(--accent)]">
            <h2 className="font-semibold mb-2">Instructions</h2>
            <p className="text-sm whitespace-pre-line">{quiz.instructions}</p>
          </Card>
        )}

        <Card className="mb-8">
          <h2 className="font-semibold mb-3">Rating Scale</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {(quiz.scaleLabels || ["Not at all", "Slightly", "Moderately", "Very", "Extremely"]).map(
              (label, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-[var(--muted)]">{label}</span>
                </div>
              )
            )}
          </div>
        </Card>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {questions.map((question, index) => (
              <Card key={question.id}>
                <div className="mb-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-lg">{question.text}</h3>
                      {!question.required && (
                        <span className="text-sm text-[var(--muted)]">(Optional)</span>
                      )}
                    </div>
                  </div>
                </div>
                <QuestionRenderer
                  question={question}
                  value={answers[question.id] ?? null}
                  onChange={(value) => handleAnswerChange(question.id, value)}
                  scaleLabels={quiz.scaleLabels || undefined}
                  scaleMin={quiz.scaleMin || 1}
                  scaleMax={quiz.scaleMax || 5}
                />
              </Card>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || answeredRequired.length < requiredQuestions.length}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Response"
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
