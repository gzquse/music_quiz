"use client";

import Link from "next/link";
import { getSupabase, useCoach, useCoachData } from "@/lib/coach/client";
import { LEVELS, METRICS, TONES, scoreColor } from "@/lib/coach/rubric";
import { formatDate } from "@/lib/utils";
import { Card, CoachPage, InstructorAvatar, ScoreChip, SectionLabel, Spinner } from "@/components/coach/ui";

export default function CoachHome() {
  const { user, account } = useCoach();
  const { isLoading, instructor, sessions } = useCoachData(user.id);
  const scored = sessions.filter((s) => typeof s.overall === "number").reverse();

  const planLabel = !account
    ? ""
    : account.plan === "pro"
      ? `Pro · ${account.remaining} left this month`
      : account.remaining > 0
        ? `${account.remaining} free ${account.remaining === 1 ? "analysis" : "analyses"} left`
        : "Free analyses used";

  return (
    <CoachPage>
      <header className="flex items-center justify-between pt-5">
        <p className="text-[15px] font-medium tracking-wide text-[var(--foreground)]/80">Form Coach</p>
        <button
          type="button"
          onClick={() => void getSupabase().auth.signOut()}
          className="min-h-11 px-1 text-[14px] font-medium text-[var(--muted)]"
        >
          Sign out
        </button>
      </header>

      <h1 className="font-display mt-4 text-[34px] font-semibold leading-[1.1] tracking-tight">
        Ready for a take?
      </h1>

      <Link href="/coach/instructor" className="mt-6 block active:scale-[0.99] transition-transform">
        <Card className="flex items-center gap-4">
          <InstructorAvatar name={instructor.name} color={instructor.color} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Your instructor</p>
            <p className="mt-0.5 truncate text-[19px] font-semibold">{instructor.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">
              {TONES.find((t) => t.value === instructor.tone)?.label} ·{" "}
              {LEVELS.find((l) => l.value === instructor.level)?.label}
              {instructor.focus.length > 0 &&
                ` · ${instructor.focus.map((k) => METRICS.find((m) => m.key === k)?.label).join(", ")}`}
            </p>
          </div>
          <span className="text-[14px] font-semibold text-[var(--primary-dark)]">Edit</span>
        </Card>
      </Link>

      <div className="mt-4">
        <Link
          href="/coach/record"
          className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#f4b183] to-[#e8926a] text-[18px] font-semibold text-white shadow-[var(--shadow)] active:scale-[0.99] transition-transform"
        >
          <span className="h-3.5 w-3.5 rounded-full bg-white" />
          Record a 1-minute take
        </Link>
        {planLabel && (
          <Link href="/coach/plan" className="mt-3 flex justify-center">
            <span className="rounded-full bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--muted)] shadow-sm">
              {planLabel}
              <span className="ml-1.5 font-semibold text-[var(--primary-dark)]">
                {account?.plan === "pro" ? "Manage" : "Plans"}
              </span>
            </span>
          </Link>
        )}
      </div>

      {scored.length >= 2 && (
        <div className="mt-8">
          <SectionLabel>Progress</SectionLabel>
          <Card>
            <Trend values={scored.slice(-12).map((s) => s.overall as number)} />
          </Card>
        </div>
      )}

      <div className="mt-8 flex-1">
        <SectionLabel>Takes</SectionLabel>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : sessions.length === 0 ? (
          <Card className="text-center">
            <p className="text-[16px] font-semibold">Your takes will appear here</p>
            <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-[var(--muted)]">
              Film from the side so your head, shoulders, arms, and hands are all in view.
            </p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur-md">
            {sessions.map((s, i) => (
              <Link
                key={s.id}
                href={`/coach/session/${s.id}`}
                className={`flex items-center gap-3 px-4 py-3.5 active:bg-[var(--surface-hover)] ${
                  i > 0 ? "border-t border-[var(--separator)]" : ""
                }`}
              >
                <ScoreChip score={s.overall ?? null} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium">{s.piece || "Untitled take"}</p>
                  <p className="text-[13px] text-[var(--muted)]">{formatDate(s.createdAt)}</p>
                </div>
                {s.professorNotes && (
                  <span className="rounded-full bg-[var(--accent-light)] px-2.5 py-1 text-[12px] font-semibold text-[var(--primary-dark)]">
                    Professor
                  </span>
                )}
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CoachPage>
  );
}

function Trend({ values }: { values: number[] }) {
  const w = 300;
  const h = 84;
  const pad = 8;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
  const y = (v: number) => h - pad - ((v - 1) / 4) * (h - pad * 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const change = values[values.length - 1] - values[0];
  const latest = values[values.length - 1];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[15px] font-semibold">Form score</p>
        <p className="text-[14px] font-medium" style={{ color: change >= 0 ? scoreColor(4.5) : scoreColor(1.5) }}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)} over {values.length} takes
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-auto w-full" aria-label="Form score trend">
        {[2, 3, 4].map((g) => (
          <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="var(--separator)" strokeDasharray="3 5" />
        ))}
        <polyline points={points} fill="none" stroke={scoreColor(latest)} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 5 : 3} fill={scoreColor(v)} />
        ))}
      </svg>
    </div>
  );
}
