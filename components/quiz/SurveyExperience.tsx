"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { type Question, type Quiz } from "@/lib/instant";
import { DEFAULT_SCALE_LABELS, SURVEY_INSTRUCTOR, SURVEY_SUPERVISOR } from "@/lib/survey";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SurveyExperienceProps {
  quiz: Quiz;
  questions: Question[];
  greeting?: string;
  greetingPrefix?: string;
  alreadyCompleted?: boolean;
  weekLabel?: string;
  onSubmit: (answers: Record<string, string | number>) => Promise<void>;
}

function questionTitle(question: Question, index: number) {
  if (question.title?.trim()) return question.title;
  const [firstLine] = question.text.split("\n");
  if (firstLine && firstLine.length <= 40 && question.text.includes("\n")) {
    return firstLine;
  }
  return `Question ${index + 1}`;
}

function questionBody(question: Question) {
  if (question.title?.trim() && question.text !== question.title) {
    return question.text;
  }
  const parts = question.text.split("\n");
  if (parts.length > 1 && parts[0].length <= 40) {
    return parts.slice(1).join("\n").trim();
  }
  return question.text;
}

export function SurveyExperience({
  quiz,
  questions,
  greeting,
  greetingPrefix = "Hi, ",
  alreadyCompleted = false,
  weekLabel,
  onSubmit,
}: SurveyExperienceProps) {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaleLabels = quiz.scaleLabels?.length
    ? quiz.scaleLabels
    : [...DEFAULT_SCALE_LABELS];
  const scaleMin = quiz.scaleMin || 1;
  const scaleMax = quiz.scaleMax || 5;
  const scaleOptions = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);

  const requiredQuestions = useMemo(
    () => questions.filter((q) => q.required),
    [questions]
  );
  const answeredRequired = requiredQuestions.filter((q) => answers[q.id] !== undefined);
  const current = step >= 0 ? questions[step] : null;
  const isLast = step === questions.length - 1;
  const currentValue = current ? answers[current.id] : undefined;
  const canContinue = !current
    ? true
    : current.required
      ? currentValue !== undefined && currentValue !== ""
      : true;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(answers);
    } catch (err) {
      console.error(err);
      setError("Could not submit. Please try again.");
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (isLast) {
      void handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  };

  if (alreadyCompleted) {
    return (
      <SurveyFrame>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/12">
            <CheckIcon className="h-8 w-8 text-[var(--success)]" />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight">Already completed</h1>
          <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-[var(--muted)]">
            {greeting ? `${greeting}, you` : "You"} already submitted this week
            {weekLabel ? ` (${weekLabel})` : ""}. See you next week.
          </p>
          <Link href="/" className="mt-8">
            <Button size="lg" className="min-w-[180px] rounded-full px-8">
              Done
            </Button>
          </Link>
        </div>
      </SurveyFrame>
    );
  }

  if (step === -1) {
    return (
      <SurveyFrame>
        <header className="px-6 pt-8 sm:pt-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
            Weekly check-in
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
            {quiz.title}
          </h1>
          {greeting && (
            <p className="mt-3 text-[17px] text-[var(--primary)]">
              {greetingPrefix}
              {greeting}
            </p>
          )}
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)] sm:text-[17px]">
            {quiz.description || quiz.instructions}
          </p>
        </header>

        <div className="mt-8 px-6">
          <div className="overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[var(--shadow)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <p className="text-[13px] text-[var(--muted)]">Instructor</p>
              <p className="text-[17px] font-medium">{SURVEY_INSTRUCTOR}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-[var(--muted)]">Research supervisor</p>
              <p className="text-[17px] font-medium">{SURVEY_SUPERVISOR}</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[var(--shadow)]">
            <div className="px-5 py-4">
              <p className="mb-3 text-[13px] font-medium text-[var(--muted)]">How often</p>
              <ol className="space-y-2.5">
                {scaleLabels.map((label, index) => (
                  <li key={label} className="flex items-center justify-between text-[15px]">
                    <span>{label}</span>
                    <span className="tabular-nums text-[var(--muted)]">{scaleMin + index}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-auto bg-[linear-gradient(to_top,var(--background)_70%,transparent)] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
          <Button
            size="lg"
            className="h-14 w-full rounded-full text-[17px] font-semibold"
            onClick={() => setStep(0)}
          >
            Begin
          </Button>
        </div>
      </SurveyFrame>
    );
  }

  if (!current) {
    return null;
  }

  const title = questionTitle(current, step);
  const body = questionBody(current);

  return (
    <SurveyFrame>
      <header className="px-6 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex min-h-11 min-w-11 items-center text-[17px] text-[var(--primary)]"
          >
            Back
          </button>
          <span className="text-[13px] tabular-nums text-[var(--muted)]">
            {step + 1} of {questions.length}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-6 pt-8">
        <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
          {title}
        </p>
        <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight sm:text-[26px]">
          {body}
        </h2>
        {!current.required && (
          <p className="mt-2 text-[15px] text-[var(--muted)]">Optional</p>
        )}

        <div className="mt-8">
          {current.type === "scale" && (
            <div className="overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[var(--shadow)]">
              {scaleOptions.map((option, index) => {
                const selected = currentValue === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [current.id]: option }))
                    }
                    className={cn(
                      "flex min-h-[56px] w-full items-center justify-between px-5 text-left transition-colors",
                      index !== scaleOptions.length - 1 && "border-b border-[var(--border)]",
                      selected
                        ? "bg-[var(--accent-light)]"
                        : "active:bg-[var(--surface-hover)]"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[17px]",
                        selected ? "font-semibold text-[var(--primary)]" : "text-[var(--foreground)]"
                      )}
                    >
                      {scaleLabels[option - scaleMin] || option}
                    </span>
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums",
                        selected
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-hover)] text-[var(--muted)]"
                      )}
                    >
                      {selected ? <CheckIcon className="h-4 w-4" /> : option}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "text" && (
            <textarea
              value={typeof currentValue === "string" ? currentValue : ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))
              }
              placeholder="Type a short note, or skip."
              rows={5}
              className="w-full resize-none rounded-[20px] border-0 bg-[var(--surface)] px-5 py-4 text-[17px] leading-relaxed shadow-[var(--shadow)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          )}

          {current.type === "choice" && (
            <div className="overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[var(--shadow)]">
              {(current.options || []).map((option, index, arr) => {
                const selected = currentValue === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [current.id]: option }))
                    }
                    className={cn(
                      "flex min-h-[56px] w-full items-center justify-between px-5 text-left",
                      index !== arr.length - 1 && "border-b border-[var(--border)]",
                      selected ? "bg-[var(--accent-light)]" : "active:bg-[var(--surface-hover)]"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[17px]",
                        selected ? "font-semibold text-[var(--primary)]" : ""
                      )}
                    >
                      {option}
                    </span>
                    {selected && <CheckIcon className="h-5 w-5 text-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <div className="sticky bottom-0 bg-[linear-gradient(to_top,var(--background)_70%,transparent)] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        {error && (
          <p className="mb-3 text-center text-[15px] text-[var(--error)]">{error}</p>
        )}
        <Button
          size="lg"
          className="h-14 w-full rounded-full text-[17px] font-semibold"
          disabled={!canContinue || isSubmitting}
          onClick={goNext}
        >
          {isSubmitting
            ? "Submitting..."
            : isLast
              ? current.required || (typeof currentValue === "string" && currentValue.trim())
                ? "Submit"
                : "Skip and submit"
              : "Continue"}
        </Button>
        <p className="mt-3 text-center text-[13px] text-[var(--muted)]">
          {answeredRequired.length} of {requiredQuestions.length} required answered
        </p>
      </div>
    </SurveyFrame>
  );
}

function SurveyFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col bg-[var(--background)] pt-[env(safe-area-inset-top)]">
      {children}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function SurveyComplete({
  name,
  message,
  extraAction,
}: {
  name?: string;
  message?: string;
  extraAction?: ReactNode;
}) {
  return (
    <SurveyFrame>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/12">
          <CheckIcon className="h-8 w-8 text-[var(--success)]" />
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight">Thank you</h1>
        <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-[var(--muted)]">
          {message ||
            (name
              ? `${name}, your weekly response has been saved. See you next week.`
              : "Your weekly response has been saved. See you next week.")}
        </p>
        {extraAction && <div className="mt-8 w-full max-w-xs">{extraAction}</div>}
        <Link href="/" className={extraAction ? "mt-3" : "mt-8"}>
          <Button
            size="lg"
            variant={extraAction ? "secondary" : "primary"}
            className="min-w-[180px] rounded-full px-8"
          >
            Done
          </Button>
        </Link>
      </div>
    </SurveyFrame>
  );
}

export function SurveyState({
  title,
  message,
  actionHref = "/",
  actionLabel = "Back",
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <SurveyFrame>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-[var(--muted)]">{message}</p>
        <Link href={actionHref} className="mt-8">
          <Button size="lg" className="min-w-[180px] rounded-full px-8">
            {actionLabel}
          </Button>
        </Link>
      </div>
    </SurveyFrame>
  );
}

export function SurveySpinner() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
    </div>
  );
}
