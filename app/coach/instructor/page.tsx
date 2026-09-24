"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, useCoach, useCoachData } from "@/lib/coach/client";
import { toInstructorRow } from "@/lib/coach/records";
import {
  DEFAULT_INSTRUCTOR,
  INSTRUCTOR_COLORS,
  LEVELS,
  MAX_FOCUS,
  MAX_NOTES,
  METRICS,
  TONES,
  type InstructorSettings,
  type MetricKey,
} from "@/lib/coach/rubric";
import { cn } from "@/lib/utils";
import {
  Card,
  CoachPage,
  InstructorAvatar,
  PrimaryButton,
  SectionLabel,
  Segmented,
  Spinner,
  TopBar,
} from "@/components/coach/ui";

export default function InstructorPage() {
  const { user } = useCoach();
  const { isLoading, instructor } = useCoachData(user.id);

  if (isLoading) {
    return (
      <CoachPage className="items-center justify-center">
        <Spinner />
      </CoachPage>
    );
  }

  return <InstructorForm userId={user.id} initial={instructor} />;
}

function InstructorForm({ userId, initial }: { userId: string; initial: InstructorSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<InstructorSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof InstructorSettings>(key: K, value: InstructorSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleFocus = (key: MetricKey) =>
    set(
      "focus",
      form.focus.includes(key)
        ? form.focus.filter((k) => k !== key)
        : form.focus.length < MAX_FOCUS
          ? [...form.focus, key]
          : form.focus
    );

  const save = async () => {
    setBusy(true);
    setError(null);
    const { error } = await getSupabase()
      .from("coach_instructors")
      .upsert(toInstructorRow(userId, form), { onConflict: "user_id" });
    if (error) {
      console.error(error);
      setError("Couldn't save. Please try again.");
      setBusy(false);
      return;
    }
    router.push("/coach");
  };

  const tone = TONES.find((t) => t.value === form.tone) ?? TONES[1];

  return (
    <CoachPage>
      <TopBar back="/coach" title="Your instructor" />

      <Card className="mt-2">
        <div className="flex items-center gap-4">
          <InstructorAvatar name={form.name || "C"} color={form.color} size={64} />
          <div className="min-w-0">
            <p className="truncate text-[20px] font-semibold">{form.name || DEFAULT_INSTRUCTOR.name}</p>
            <p className="text-[13px] text-[var(--muted)]">
              {tone.label} · {LEVELS.find((l) => l.value === form.level)?.label}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl rounded-tl-md bg-[var(--accent-light)] px-4 py-3 text-[15px] leading-relaxed">
          {tone.sample}
        </div>
      </Card>

      <SectionLabel className="mt-7">Name & look</SectionLabel>
      <Card className="space-y-4">
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value.slice(0, 40))}
          placeholder={DEFAULT_INSTRUCTOR.name}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[16px] outline-none focus:border-[var(--primary)]"
        />
        <div className="flex justify-between">
          {INSTRUCTOR_COLORS.map((gradient, i) => (
            <button
              key={gradient}
              type="button"
              onClick={() => set("color", i)}
              aria-label={`Color ${i + 1}`}
              className={cn(
                "h-11 w-11 rounded-full bg-gradient-to-br ring-offset-2 ring-offset-[var(--surface)] transition",
                gradient,
                form.color === i ? "ring-2 ring-[var(--foreground)]" : ""
              )}
            />
          ))}
        </div>
      </Card>

      <SectionLabel className="mt-7">How they talk</SectionLabel>
      <Segmented value={form.tone} onChange={(v) => set("tone", v)} options={TONES} />
      <p className="mt-2 px-1 text-[13px] text-[var(--muted)]">Tone changes the wording, never the scores.</p>

      <SectionLabel className="mt-7">Your level</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => set("level", l.value)}
            className={cn(
              "min-h-12 rounded-2xl border text-[15px] font-semibold transition",
              form.level === l.value
                ? "border-[var(--primary)] bg-[var(--accent-light)] text-[var(--primary-dark)]"
                : "border-[var(--border)] bg-[var(--surface)]"
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <SectionLabel className="mt-7">Watch closely · up to {MAX_FOCUS}</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => {
          const on = form.focus.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggleFocus(m.key)}
              className={cn(
                "min-h-10 rounded-full border px-4 text-[14px] font-semibold transition",
                on
                  ? "border-transparent bg-[var(--primary-dark)] text-white"
                  : "border-[var(--border)] bg-[var(--surface)]",
                !on && form.focus.length >= MAX_FOCUS && "opacity-40"
              )}
            >
              {m.long}
            </button>
          );
        })}
      </div>

      <SectionLabel className="mt-7">Standing notes</SectionLabel>
      <Card>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value.slice(0, MAX_NOTES))}
          rows={3}
          placeholder="e.g. My teacher says my thumb tucks under too early. I'm working on arm weight."
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none"
        />
        <p className="text-right text-[12px] tabular-nums text-[var(--muted)]">
          {form.notes.length}/{MAX_NOTES}
        </p>
      </Card>

      <Card className="mt-4 flex items-start gap-4">
        <div className="flex-1">
          <p className="text-[15px] font-semibold">Learn from my professor</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
            Uses the professor notes you add to recent takes, so the coach picks up their priorities and words.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.learnFromProfessor}
          onClick={() => set("learnFromProfessor", !form.learnFromProfessor)}
          className={cn(
            "relative mt-1 h-8 w-[52px] shrink-0 rounded-full transition",
            form.learnFromProfessor ? "bg-[var(--success)]" : "bg-[var(--separator)]"
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
              form.learnFromProfessor ? "left-[24px]" : "left-1"
            )}
          />
        </button>
      </Card>

      {error && <p className="mt-4 text-center text-[14px] text-[var(--error)]">{error}</p>}
      <div className="sticky bottom-0 mt-6 bg-[linear-gradient(to_top,var(--background)_70%,transparent)] pb-2 pt-6">
        <PrimaryButton onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save instructor"}
        </PrimaryButton>
      </div>
    </CoachPage>
  );
}
