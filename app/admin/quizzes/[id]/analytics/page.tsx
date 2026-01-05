"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/instant";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { ChartPanel } from "@/components/admin/ChartPanel";
import { formatDateTime, calculateAverage } from "@/lib/utils";

export default function AnalyticsPage() {
  const params = useParams();
  const quizId = params.id as string;

  const { data, isLoading, error } = db.useQuery({
    quizzes: {
      $: {
        where: { id: quizId },
      },
    },
    questions: {
      $: {
        where: { quizId: quizId },
      },
    },
    responses: {
      $: {
        where: { quizId: quizId },
      },
    },
    answers: {},
  });

  const quiz = data?.quizzes?.[0];
  const questions = (data?.questions || []).sort((a, b) => a.order - b.order);
  const responses = data?.responses || [];
  const allAnswers = data?.answers || [];

  // Filter answers for this quiz's responses
  const responseIds = new Set(responses.map((r) => r.id));
  const answers = allAnswers.filter((a) => responseIds.has(a.responseId));

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

  // Calculate analytics
  const scaleQuestions = questions.filter((q) => q.type === "scale");
  
  // Average scores per question
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
        <Link href={`/admin/quizzes/${quizId}`}>
          <Button variant="secondary">Edit Survey</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardContent>
            <p className="text-3xl font-bold">{responses.length}</p>
            <p className="text-sm text-[var(--muted)]">Total Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-3xl font-bold">{recentResponses.length}</p>
            <p className="text-sm text-[var(--muted)]">Last 30 Days</p>
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
          {/* Average Scores Chart */}
          <div className="mb-8">
            <ChartPanel
              title="Average Score by Question"
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
            <CardHeader>
              <CardTitle>Recent Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">
                        Date
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
                        return (
                          <tr
                            key={response.id}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="py-3 px-4 text-[var(--muted)]">
                              {formatDateTime(response.submittedAt)}
                            </td>
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

