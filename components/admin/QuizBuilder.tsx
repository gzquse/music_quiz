"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, tx, id as genId, Quiz, Question } from "@/lib/instant";
import { Button, Input, Textarea, Card } from "@/components/ui";
import { QuestionEditor } from "./QuestionEditor";
import { generateId } from "@/lib/utils";

interface QuizBuilderProps {
  existingQuiz?: Quiz;
  existingQuestions?: Question[];
}

interface QuestionDraft extends Partial<Question> {
  tempId: string;
}

export function QuizBuilder({ existingQuiz, existingQuestions }: QuizBuilderProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const toDateInput = (ts?: number) =>
    ts ? new Date(ts).toISOString().slice(0, 10) : "";
  const [quiz, setQuiz] = useState({
    title: existingQuiz?.title || "",
    description: existingQuiz?.description || "",
    instructions: existingQuiz?.instructions || "",
    scaleMin: existingQuiz?.scaleMin || 1,
    scaleMax: existingQuiz?.scaleMax || 5,
    scaleLabels: existingQuiz?.scaleLabels || [
      "Not at all",
      "Slightly",
      "Moderately",
      "Very",
      "Extremely",
    ],
    isActive: existingQuiz?.isActive ?? false,
    variant: (existingQuiz?.variant || "student") as "student" | "teacher",
    studyStartDate: existingQuiz?.studyStartDate
      ? toDateInput(existingQuiz.studyStartDate)
      : (() => {
          const d = new Date();
          return `${d.getFullYear()}-02-01`;
        })(),
  });

  const [questions, setQuestions] = useState<QuestionDraft[]>(() => {
    if (existingQuestions?.length) {
      return existingQuestions
        .sort((a, b) => a.order - b.order)
        .map((q) => ({
          ...q,
          tempId: q.id,
        }));
    }
    return [];
  });

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        tempId: generateId(),
        text: "",
        type: "scale",
        options: null,
        order: prev.length,
        required: true,
      },
    ]);
  };

  const updateQuestion = (index: number, updated: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updated } : q))
    );
  };

  const deleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    setQuestions((prev) => {
      const newQuestions = [...prev];
      [newQuestions[index], newQuestions[newIndex]] = [
        newQuestions[newIndex],
        newQuestions[index],
      ];
      return newQuestions;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const quizId = existingQuiz?.id || genId();
      const now = Date.now();

      const studyStartTs = quiz.studyStartDate
        ? new Date(quiz.studyStartDate + "T00:00:00").getTime()
        : undefined;

      const { studyStartDate: _s, ...quizData } = quiz;
      await db.transact([
        tx.quizzes[quizId].update({
          ...quizData,
          variant: quiz.variant || "student",
          studyStartDate: studyStartTs,
          createdAt: existingQuiz?.createdAt || now,
        }),
      ]);

      // Delete old questions if editing
      if (existingQuestions?.length) {
        const deleteTransactions = existingQuestions.map((q) =>
          tx.questions[q.id].delete()
        );
        await db.transact(deleteTransactions);
      }

      // Create new questions
      if (questions.length > 0) {
        const questionTransactions = questions.map((q, index) => {
          const questionId = genId();
          return tx.questions[questionId].update({
            quizId,
            text: q.text || "",
            type: q.type || "scale",
            options: q.options,
            order: index,
            required: q.required ?? true,
          });
        });
        await db.transact(questionTransactions);
      }

      router.push("/admin/quizzes");
    } catch (error) {
      console.error("Failed to save quiz:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Quiz Details */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Survey Details</h2>
        <div className="space-y-4">
          <Input
            label="Title"
            value={quiz.title}
            onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            placeholder="e.g., Post-Session Playing Experience Survey"
            required
          />

          <Textarea
            label="Description"
            value={quiz.description}
            onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
            placeholder="Brief description shown to respondents"
          />

          <Textarea
            label="Instructions"
            value={quiz.instructions}
            onChange={(e) => setQuiz({ ...quiz, instructions: e.target.value })}
            placeholder="Instructions shown at the top of the survey"
          />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Survey Variant</label>
              <select
                value={quiz.variant}
                onChange={(e) => setQuiz({ ...quiz, variant: e.target.value as "student" | "teacher" })}
                className="w-full max-w-xs px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              >
                <option value="student">Student (self-assessment)</option>
                <option value="teacher">Teacher (assessment of student)</option>
              </select>
              <p className="text-xs text-[var(--muted)] mt-1">
                {quiz.variant === "student" ? "Students rate their own experience" : "Teachers rate their students"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Study Start Date (Week 1)</label>
              <input
                type="date"
                value={quiz.studyStartDate}
                onChange={(e) => setQuiz({ ...quiz, studyStartDate: e.target.value })}
                className="w-full max-w-xs px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Week 1 begins on this date. New submissions are assigned to weeks 1-8 based on this.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={quiz.isActive}
                onChange={(e) => setQuiz({ ...quiz, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <span className="text-sm">Active (visible to public)</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Scale Settings */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Scale Settings</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Configure the rating scale used for scale-type questions
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input
            label="Minimum Value"
            type="number"
            value={quiz.scaleMin}
            onChange={(e) => setQuiz({ ...quiz, scaleMin: parseInt(e.target.value) || 1 })}
            min={0}
            max={10}
          />
          <Input
            label="Maximum Value"
            type="number"
            value={quiz.scaleMax}
            onChange={(e) => setQuiz({ ...quiz, scaleMax: parseInt(e.target.value) || 5 })}
            min={1}
            max={10}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Scale Labels (one per line, from min to max)
          </label>
          <textarea
            value={quiz.scaleLabels.join("\n")}
            onChange={(e) =>
              setQuiz({ ...quiz, scaleLabels: e.target.value.split("\n") })
            }
            placeholder="Not at all&#10;Slightly&#10;Moderately&#10;Very&#10;Extremely"
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] min-h-[120px] resize-y"
          />
        </div>
      </Card>

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Questions</h2>
          <Button type="button" variant="secondary" onClick={addQuestion}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </Button>
        </div>

        {questions.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-[var(--muted)] mb-4">No questions yet</p>
            <Button type="button" variant="secondary" onClick={addQuestion}>
              Add First Question
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionEditor
                key={question.tempId}
                question={question}
                index={index}
                onChange={(updated) => updateQuestion(index, updated)}
                onDelete={() => deleteQuestion(index)}
                onMoveUp={index > 0 ? () => moveQuestion(index, "up") : undefined}
                onMoveDown={
                  index < questions.length - 1
                    ? () => moveQuestion(index, "down")
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-[var(--border)]">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/quizzes")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : existingQuiz ? (
            "Save Changes"
          ) : (
            "Create Survey"
          )}
        </Button>
      </div>
    </form>
  );
}

