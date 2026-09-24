"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/coach/client";
import type { ProfessorFeedback } from "@/lib/coach/records";
import { METRICS, scoreColor, type CoachFeedback, type MetricKey } from "@/lib/coach/rubric";
import { cn } from "@/lib/utils";
import { Card, PrimaryButton, ScoreSegments, SecondaryButton, SectionLabel } from "./ui";

export function ProfessorPanel({
  sessionId,
  ai,
  saved,
  learnFromProfessor,
  onSaved,
}: {
  sessionId: string;
  ai: CoachFeedback;
  saved: ProfessorFeedback;
  learnFromProfessor: boolean;
  onSaved: (feedback: ProfessorFeedback) => void;
}) {
  const [editing, setEditing] = useState(!saved.professorNotes);
  if (editing) {
    return (
      <ProfessorForm
        sessionId={sessionId}
        saved={saved}
        onSaved={(feedback) => {
          onSaved(feedback);
          setEditing(false);
        }}
      />
    );
  }
  return (
    <Compare ai={ai} saved={saved} learnFromProfessor={learnFromProfessor} onEdit={() => setEditing(true)} />
  );
}

function ProfessorForm({
  sessionId,
  saved,
  onSaved,
}: {
  sessionId: string;
  saved: ProfessorFeedback;
  onSaved: (feedback: ProfessorFeedback) => void;
}) {
  const [name, setName] = useState(saved.professorName ?? "");
  const [notes, setNotes] = useState(saved.professorNotes ?? "");
  const [scores, setScores] = useState<Record<string, number>>(saved.professorScores ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const feedback: ProfessorFeedback = {
      professorName: name.trim() || undefined,
      professorNotes: notes.trim(),
      professorScores: scores,
    };
    const { error } = await getSupabase()
      .from("coach_sessions")
      .update({
        professor_name: feedback.professorName ?? null,
        professor_notes: feedback.professorNotes,
        professor_scores: feedback.professorScores,
        professor_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    setBusy(false);
    if (error) {
      console.error(error);
      setError("Couldn't save. Please try again.");
      return;
    }
    onSaved(feedback);
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[17px] font-semibold">Your professor&apos;s feedback</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted)]">
          Paste or type their lesson notes for this piece. Scores are optional but make the comparison sharper.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Professor's name"
          className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[16px] outline-none focus:border-[var(--primary)]"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
          rows={5}
          placeholder="e.g. Wrists sink in the left-hand arpeggios. Use more arm weight in the climax; the rubato before the return rushes."
          className="mt-3 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[16px] leading-relaxed outline-none focus:border-[var(--primary)]"
        />
      </Card>

      <Card>
        <p className="text-[15px] font-semibold">Their scores</p>
        <p className="mt-1 text-[13px] text-[var(--muted)]">Same 1–5 scale as the coach. Tap again to clear.</p>
        <div className="mt-4 space-y-4">
          {METRICS.map((m) => (
            <div key={m.key}>
              <p className="mb-2 text-[14px] font-medium">{m.long}</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = scores[m.key] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setScores((prev) => {
                          const next = { ...prev };
                          if (active) delete next[m.key];
                          else next[m.key] = n;
                          return next;
                        })
                      }
                      className={cn(
                        "min-h-11 flex-1 rounded-xl border text-[15px] font-semibold tabular-nums transition",
                        active ? "border-transparent text-white" : "border-[var(--border)] bg-[var(--background)]"
                      )}
                      style={active ? { background: scoreColor(n) } : undefined}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {error && <p className="text-center text-[14px] text-[var(--error)]">{error}</p>}
      <PrimaryButton onClick={save} disabled={busy || !notes.trim()}>
        {busy ? "Saving…" : "Save and compare"}
      </PrimaryButton>
    </div>
  );
}

function agreement(ai: number | null | undefined, prof: number | undefined) {
  if (ai == null || prof == null) return null;
  const diff = Math.abs(ai - prof);
  if (diff === 0) return { label: "Agree", color: scoreColor(5) };
  if (diff === 1) return { label: "Close", color: scoreColor(3.6) };
  return { label: `${diff} apart`, color: scoreColor(1.5) };
}

function Compare({
  ai,
  saved,
  learnFromProfessor,
  onEdit,
}: {
  ai: CoachFeedback;
  saved: ProfessorFeedback;
  learnFromProfessor: boolean;
  onEdit: () => void;
}) {
  const prof = saved.professorScores ?? {};
  const rows = METRICS.map((m) => ({
    key: m.key as MetricKey,
    label: m.long,
    ai: ai.metrics[m.key]?.score ?? null,
    prof: prof[m.key] as number | undefined,
  }));
  const both = rows.filter((r) => r.ai != null && r.prof != null);
  const close = both.filter((r) => Math.abs((r.ai as number) - (r.prof as number)) <= 1);
  const biggest = [...both].sort(
    (a, b) => Math.abs((b.ai as number) - (b.prof as number)) - Math.abs((a.ai as number) - (a.prof as number))
  )[0];

  return (
    <div className="space-y-4">
      {both.length > 0 && (
        <Card className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[20px] font-semibold text-white"
            style={{ background: scoreColor((close.length / both.length) * 5) }}
          >
            {close.length}/{both.length}
          </div>
          <div>
            <p className="text-[17px] font-semibold">
              Coach and professor agree on {close.length} of {both.length} areas
            </p>
            <p className="mt-0.5 text-[14px] text-[var(--muted)]">
              {biggest && Math.abs((biggest.ai as number) - (biggest.prof as number)) >= 2
                ? `Biggest gap: ${biggest.label} (coach ${biggest.ai}, professor ${biggest.prof})`
                : "Within one point on the 1–5 scale."}
            </p>
          </div>
        </Card>
      )}

      {both.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center gap-4 text-[12px] font-medium text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-[var(--primary)]" /> Coach
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-[var(--foreground)]/70" /> Professor
            </span>
          </div>
          <div className="space-y-4">
            {rows.map((r) => {
              const a = agreement(r.ai, r.prof);
              return (
                <div key={r.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[14px] font-medium">{r.label}</p>
                    {a ? (
                      <span className="text-[12px] font-semibold" style={{ color: a.color }}>
                        {a.label}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[var(--muted)]">Not compared</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <ScoreSegments score={r.ai} color="var(--primary)" />
                    <ScoreSegments score={r.prof ?? null} color="color-mix(in srgb, var(--foreground) 70%, transparent)" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div>
        <SectionLabel className="mt-2">{saved.professorName ? `${saved.professorName}'s notes` : "Professor's notes"}</SectionLabel>
        <Card>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{saved.professorNotes}</p>
        </Card>
      </div>

      <div>
        <SectionLabel className="mt-2">Coach&apos;s notes</SectionLabel>
        <Card className="space-y-3">
          <p className="text-[15px] font-semibold leading-snug">{ai.headline}</p>
          {ai.priorities.map((p, i) => (
            <p key={i} className="text-[14px] leading-relaxed text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">
                {i + 1}. {p.title}.
              </span>{" "}
              {p.observation} {p.cue}
            </p>
          ))}
        </Card>
      </div>

      <p className="px-1 text-[13px] leading-relaxed text-[var(--muted)]">
        {learnFromProfessor
          ? "Your coach reads your professor's latest notes and adopts their priorities on your next takes. "
          : "Your coach isn't using your professor's notes right now. "}
        <Link href="/coach/instructor" className="font-semibold text-[var(--primary-dark)]">
          Change
        </Link>
      </p>

      <SecondaryButton onClick={onEdit}>Edit professor feedback</SecondaryButton>
    </div>
  );
}
