"use client";

import { useState } from "react";
import {
  METRICS,
  formatClock,
  metricLabel,
  scoreColor,
  type CoachFeedback,
} from "@/lib/coach/rubric";
import { formatDate } from "@/lib/utils";
import { Timeline } from "./Timeline";
import { ProfessorPanel } from "./ProfessorPanel";
import {
  Card,
  CoachPage,
  InstructorAvatar,
  ScoreRing,
  ScoreSegments,
  SectionLabel,
  Segmented,
  TopBar,
  anchorLabel,
} from "./ui";

const CONFIDENCE = {
  high: "Clear view",
  medium: "Partial view",
  low: "Limited view",
} as const;

export type SessionRecord = {
  id: string;
  createdAt: number;
  piece?: string;
  durationSec: number;
  frameTimes: number[];
  thumbs: Record<string, string>;
  loudness: number[];
  ai: CoachFeedback;
  overall?: number;
  instructorName: string;
  professorName?: string;
  professorNotes?: string;
  professorScores?: Record<string, number>;
};

export function SessionView({
  session,
  instructorColor,
  learnFromProfessor,
  initialTab = "coach",
}: {
  session: SessionRecord;
  instructorColor: number;
  learnFromProfessor: boolean;
  initialTab?: "coach" | "compare";
}) {
  const [tab, setTab] = useState<"coach" | "compare">(initialTab);
  const ai = session.ai;
  const thumbs = session.thumbs ?? {};
  const frameTimes = session.frameTimes ?? [];
  const cover = thumbs[String(Math.ceil(frameTimes.length / 2))] ?? Object.values(thumbs)[0];
  const overall = session.overall ?? null;
  const color = instructorColor;

  return (
    <CoachPage>
      <TopBar back="/coach" title={session.piece || "Your take"} />
      <p className="-mt-1 text-center text-[13px] text-[var(--muted)]">
        {formatDate(session.createdAt)} · {formatClock(session.durationSec)}
      </p>

      <div className="mt-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "coach", label: "Coach" },
            { value: "compare", label: session.professorNotes ? "Compare" : "Add professor" },
          ]}
        />
      </div>

      {tab === "compare" ? (
        <div className="mt-4">
          <ProfessorPanel
            sessionId={session.id}
            ai={ai}
            saved={{
              professorName: session.professorName,
              professorNotes: session.professorNotes,
              professorScores: session.professorScores,
            }}
            learnFromProfessor={learnFromProfessor}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Card className="overflow-hidden p-0">
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="h-36 w-full object-cover opacity-90" />
            )}
            <div className="flex items-center gap-4 p-5">
              <ScoreRing score={overall} size={104} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: scoreColor(overall) }}>
                  {anchorLabel(overall)}
                </p>
                <p className="mt-1 text-[17px] font-semibold leading-snug">{ai.headline}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-[var(--separator)] px-5 py-3">
              <InstructorAvatar name={session.instructorName} color={color} size={26} />
              <span className="text-[13px] font-medium">{session.instructorName}</span>
              <span className="ml-auto rounded-full bg-[var(--separator)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--muted)]">
                {CONFIDENCE[ai.confidence]}
              </span>
            </div>
          </Card>

          {ai.priorities.length > 0 && (
            <>
              <Card>
                <Timeline
                  loudness={session.loudness ?? []}
                  durationSec={session.durationSec}
                  frameTimes={frameTimes}
                  priorities={ai.priorities}
                  metrics={ai.metrics}
                />
              </Card>

              <div>
                <SectionLabel className="mt-2">Focus next</SectionLabel>
                <div className="space-y-3">
                  {ai.priorities.map((p, i) => {
                    const thumb = thumbs[String(p.frame)];
                    const tone = scoreColor(ai.metrics[p.area]?.score ?? null);
                    return (
                      <Card key={i} className="scroll-mt-4">
                        <div id={`priority-${i + 1}`} className="flex items-start gap-3">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                            style={{ background: tone }}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[17px] font-semibold leading-snug">{p.title}</p>
                            <p className="mt-0.5 text-[12px] font-medium text-[var(--muted)]">
                              {metricLabel(p.area)} · {formatClock(frameTimes[p.frame - 1] ?? 0)}
                            </p>
                          </div>
                          {thumb && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={`Frame at ${formatClock(frameTimes[p.frame - 1] ?? 0)}`} className="h-16 w-24 shrink-0 rounded-xl object-cover" />
                          )}
                        </div>
                        <p className="mt-3 text-[15px] leading-relaxed">{p.observation}</p>
                        <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted)]">{p.why}</p>
                        <div className="mt-3 rounded-2xl bg-[var(--accent-light)] px-4 py-3">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--primary-dark)]">Try</p>
                          <p className="mt-0.5 text-[15px] font-medium leading-relaxed">{p.cue}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <SectionLabel className="mt-2">All areas</SectionLabel>
            <Card className="space-y-4">
              {METRICS.map((m) => {
                const metric = ai.metrics[m.key];
                return (
                  <div key={m.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <p className="text-[15px] font-semibold">{m.long}</p>
                      <p className="shrink-0 text-[12px] font-semibold" style={{ color: scoreColor(metric?.score ?? null) }}>
                        {metric?.score != null ? `${metric.score} · ${anchorLabel(metric.score)}` : "Not visible"}
                      </p>
                    </div>
                    <ScoreSegments score={metric?.score ?? null} />
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{metric?.note}</p>
                  </div>
                );
              })}
            </Card>
          </div>

          {ai.strengths.length > 0 && (
            <div>
              <SectionLabel className="mt-2">Working well</SectionLabel>
              <Card className="space-y-2.5">
                {ai.strengths.map((s, i) => (
                  <p key={i} className="flex gap-2.5 text-[15px] leading-relaxed">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {s}
                  </p>
                ))}
              </Card>
            </div>
          )}

          {ai.drill?.steps?.length > 0 && (
            <div>
              <SectionLabel className="mt-2">Practice drill</SectionLabel>
              <Card>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[17px] font-semibold">{ai.drill.name}</p>
                  <span className="shrink-0 rounded-full bg-[var(--accent-light)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--primary-dark)]">
                    {ai.drill.minutes} min
                  </span>
                </div>
                <ol className="mt-3 space-y-2">
                  {ai.drill.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                      <span className="font-semibold tabular-nums text-[var(--primary-dark)]">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          )}

          {ai.recordingTip && (
            <p className="rounded-[20px] bg-[var(--separator)] px-4 py-3 text-[14px] leading-relaxed text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">Filming tip: </span>
              {ai.recordingTip}
            </p>
          )}

          {!session.professorNotes && (
            <button
              type="button"
              onClick={() => {
                setTab("compare");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex w-full items-center justify-between rounded-[28px] border border-dashed border-[var(--primary-light)] px-5 py-4 text-left"
            >
              <span>
                <span className="block text-[15px] font-semibold">Compare with your professor</span>
                <span className="block text-[13px] text-[var(--muted)]">Add their notes to see where you agree.</span>
              </span>
              <span className="text-[22px] text-[var(--primary-dark)]">+</span>
            </button>
          )}
        </div>
      )}
    </CoachPage>
  );
}
