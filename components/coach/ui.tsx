"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { INSTRUCTOR_COLORS, SCORE_ANCHORS, scoreColor, type Score } from "@/lib/coach/rubric";

export function CoachPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-5 pt-[env(safe-area-inset-top)] pb-[max(1.75rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TopBar({ back, title, right }: { back?: string; title?: string; right?: ReactNode }) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 pt-2">
      <div className="min-w-16">
        {back && (
          <Link
            href={back}
            className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-[16px] font-medium text-[var(--primary-dark)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </Link>
        )}
      </div>
      {title && <p className="truncate text-[15px] font-semibold">{title}</p>}
      <div className="flex min-w-16 justify-end">{right}</div>
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur-md",
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]", className)}>
      {children}
    </h2>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f4b183] to-[#e8926a] text-[17px] font-semibold text-white shadow-[var(--shadow)] transition active:scale-[0.99] disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[16px] font-semibold text-[var(--foreground)] transition active:bg-[var(--surface-hover)] disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function InstructorAvatar({ name, color, size = 48 }: { name: string; color: number; size?: number }) {
  const initial = name.replace(/^coach\s+/i, "").trim().slice(0, 1).toUpperCase() || "C";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-[var(--shadow)]",
        INSTRUCTOR_COLORS[color % INSTRUCTOR_COLORS.length]
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

// Circular 1–5 score with its rubric label.
export function ScoreRing({ score, size = 120, label = true }: { score: number | null; size?: number; label?: boolean }) {
  const stroke = Math.max(6, size * 0.08);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = score == null ? 0 : (score - 0) / 5;
  const color = scoreColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--separator)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fill)}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-semibold tabular-nums leading-none" style={{ fontSize: size * 0.3 }}>
          {score == null ? "–" : score.toFixed(1)}
        </span>
        {label && size >= 90 && (
          <span className="mt-1 text-[11px] font-medium text-[var(--muted)]">out of 5</span>
        )}
      </div>
    </div>
  );
}

// Five segments, filled up to the score. Muted when the area wasn't observable.
export function ScoreSegments({ score, color }: { score: number | null | undefined; color?: string }) {
  const tone = color ?? scoreColor(score);
  return (
    <div className="flex gap-1" aria-label={score == null ? "Not observable" : `${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="h-2 flex-1 rounded-full"
          style={{ background: score != null && n <= score ? tone : "var(--separator)" }}
        />
      ))}
    </div>
  );
}

export function ScoreChip({ score }: { score: number | null | undefined }) {
  return (
    <span
      className="inline-flex min-w-11 items-center justify-center rounded-full px-2.5 py-1 text-[13px] font-semibold tabular-nums text-white"
      style={{ background: scoreColor(score) }}
    >
      {score == null ? "–" : score.toFixed(1)}
    </span>
  );
}

export function anchorLabel(score: number | null | undefined) {
  if (score == null) return "Not visible";
  return SCORE_ANCHORS[Math.min(5, Math.max(1, Math.round(score))) as Score].label;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary-light)] border-t-[var(--primary-dark)]",
        className
      )}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-[var(--separator)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-10 flex-1 rounded-full px-2 text-[14px] font-semibold transition",
            value === o.value ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
