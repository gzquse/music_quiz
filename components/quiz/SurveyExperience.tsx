"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { type Question, type Quiz } from "@/lib/instant";
import { DEFAULT_SCALE_LABELS } from "@/lib/survey";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { AppShell, CreditCard } from "./AppShell";

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
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow-[var(--shadow)] backdrop-blur-md">
            <CheckIcon className="h-8 w-8 text-[var(--success)]" />
          </div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight">All set</h1>
          <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-[var(--muted)]">
            {greeting ? `${greeting}, you` : "You"} already submitted this week
            {weekLabel ? ` (${weekLabel})` : ""}. See you next week.
          </p>
          <Link href="/" className="mt-8">
            <Button size="lg" className="min-w-[180px] rounded-full px-8">
              Done
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  if (step === -1) {
    return (
      <AppShell>
        <header className="px-6 pt-8 text-center">
          <p className="text-[15px] font-medium tracking-wide text-[var(--foreground)]/80">
            Weekly check-in
          </p>
          <h1 className="font-display mx-auto mt-4 max-w-[16ch] text-[32px] font-semibold leading-[1.12] tracking-tight">
            {quiz.title}
          </h1>
          {greeting && (
            <p className="mt-3 text-[16px] font-medium text-[var(--primary-dark)]">
              {greetingPrefix}
              {greeting}
            </p>
          )}
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--muted)]">
            Think about this week's practice. Tap how often each feeling or action happened.
          </p>
        </header>

        <div className="mt-7 px-5">
          <CreditCard />

          <div className="mt-4 rounded-[28px] bg-white/70 p-4 shadow-[var(--shadow)] backdrop-blur-md">
            <p className="mb-3 text-center text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              How often
            </p>
            <div className="flex gap-1.5">
              {scaleLabels.map((label, index) => (
                <div
                  key={label}
                  className="flex min-h-[64px] flex-1 flex-col items-center justify-center rounded-[18px] bg-gradient-to-b from-[#fff7f2] to-[#fde8e2] px-1 text-center"
                >
                  <span className="text-[15px] font-semibold tabular-nums text-[var(--primary-dark)]">
                    {scaleMin + index}
                  </span>
                  <span className="mt-0.5 text-[10px] leading-tight text-[var(--muted)]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-auto bg-[linear-gradient(to_top,var(--background)_72%,transparent)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
          <Button
            size="lg"
            className="h-14 w-full rounded-full text-[17px] font-semibold"
            onClick={() => setStep(0)}
          >
            Begin
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!current) {
    return null;
  }

  const title = questionTitle(current, step);
  const body = questionBody(current);

  return (
    <AppShell>
      <header className="px-5 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex min-h-11 min-w-11 items-center text-[16px] font-medium text-[var(--primary-dark)]"
          >
            Back
          </button>
          <span className="rounded-full bg-white/55 px-3 py-1 text-[12px] tabular-nums text-[var(--muted)] backdrop-blur-md">
            {step + 1} / {questions.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f3b3b0] to-[#e8926a] transition-all duration-300"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-5 pt-7">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          {title}
        </p>
        <h2 className="font-display mt-2 text-[24px] font-semibold leading-snug tracking-tight">
          {body}
        </h2>
        {!current.required && (
          <p className="mt-2 text-[14px] text-[var(--muted)]">Optional</p>
        )}

        <div className="mt-6">
          {current.type === "scale" && (
            <div className="space-y-2.5">
              {scaleOptions.map((option) => {
                const selected = currentValue === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [current.id]: option }))
                    }
                    className={cn(
                      "flex min-h-[56px] w-full items-center justify-between rounded-[22px] px-4 text-left shadow-[var(--shadow)] transition-all",
                      selected
                        ? "bg-gradient-to-r from-[#f4b183] to-[#e8926a] text-white"
                        : "bg-white/75 backdrop-blur-md active:bg-[var(--surface-hover)]"
                    )}
                  >
                    <span className={cn("text-[16px]", selected && "font-semibold")}>
                      {scaleLabels[option - scaleMin] || option}
                    </span>
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold tabular-nums",
                        selected ? "bg-white/25" : "bg-[#fde8e2] text-[var(--primary-dark)]"
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
              placeholder="A short note, or skip."
              rows={5}
              className="w-full resize-none rounded-[28px] border-0 bg-white/75 px-5 py-4 text-[16px] leading-relaxed shadow-[var(--shadow)] backdrop-blur-md placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          )}

          {current.type === "choice" && (
            <div className="space-y-2.5">
              {(current.options || []).map((option) => {
                const selected = currentValue === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [current.id]: option }))
                    }
                    className={cn(
                      "flex min-h-[56px] w-full items-center justify-between rounded-[22px] px-4 text-left shadow-[var(--shadow)]",
                      selected
                        ? "bg-gradient-to-r from-[#f4b183] to-[#e8926a] text-white"
                        : "bg-white/75 backdrop-blur-md"
                    )}
                  >
                    <span className={cn("text-[16px]", selected && "font-semibold")}>
                      {option}
                    </span>
                    {selected && <CheckIcon className="h-5 w-5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <div className="sticky bottom-0 bg-[linear-gradient(to_top,var(--background)_72%,transparent)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
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
        <p className="mt-3 text-center text-[12px] text-[var(--muted)]">
          {answeredRequired.length} of {requiredQuestions.length} required
        </p>
      </div>
    </AppShell>
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
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow-[var(--shadow)] backdrop-blur-md">
          <CheckIcon className="h-8 w-8 text-[var(--success)]" />
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight">Thank you</h1>
        <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-[var(--muted)]">
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
    </AppShell>
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
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-[32px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-[var(--muted)]">{message}</p>
        <Link href={actionHref} className="mt-8">
          <Button size="lg" className="min-w-[180px] rounded-full px-8">
            {actionLabel}
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}

export function SurveySpinner() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
    </div>
  );
}
