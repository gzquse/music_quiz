"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoachApiError, coachPost, useCoach, useCoachData } from "@/lib/coach/client";
import { prepareTake, readVideoDuration } from "@/lib/coach/media";
import { CAPTURE, DEFAULT_INSTRUCTOR, formatClock } from "@/lib/coach/rubric";
import type { AccountSummary } from "@/lib/coach/server";
import { Recorder } from "@/components/coach/Recorder";
import {
  Card,
  CoachPage,
  InstructorAvatar,
  PrimaryButton,
  SecondaryButton,
  Spinner,
  TopBar,
} from "@/components/coach/ui";

type Step = "setup" | "camera" | "review" | "analyzing";
type Progress = "frames" | "audio" | "review";

export default function RecordPage() {
  const router = useRouter();
  const { user, account, setAccount } = useCoach();
  const { data } = useCoachData(user.id);
  const instructor = data?.coach_instructors?.[0];
  const instructorName = instructor?.name ?? DEFAULT_INSTRUCTOR.name;

  const [step, setStep] = useState<Step>("setup");
  const [piece, setPiece] = useState("");
  const [goal, setGoal] = useState("");
  const [take, setTake] = useState<{ blob: Blob; seconds: number; url: string } | null>(null);
  const [progress, setProgress] = useState<Progress>("frames");
  const [error, setError] = useState<{ message: string; paywall?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (take) URL.revokeObjectURL(take.url);
  }, [take]);

  const outOfAnalyses = account ? account.remaining <= 0 : false;

  const acceptTake = (blob: Blob, seconds: number) => {
    setError(null);
    if (seconds < CAPTURE.minSeconds) {
      setError({ message: `That take was ${Math.round(seconds)} seconds. Record at least ${CAPTURE.minSeconds}.` });
      setStep("setup");
      return;
    }
    setTake({ blob, seconds, url: URL.createObjectURL(blob) });
    setStep("review");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const seconds = await readVideoDuration(file);
      acceptTake(file, seconds);
    } catch {
      setError({ message: "Couldn't open that video. Try one recorded with your phone's camera." });
    }
  };

  const onUnavailable = useCallback((message: string) => {
    setStep("setup");
    setError({ message });
  }, []);

  const analyze = async () => {
    if (!take) return;
    setStep("analyzing");
    setError(null);
    try {
      const prepared = await prepareTake(take.blob, take.seconds, setProgress);
      setProgress("review");
      const res = await coachPost<{ sessionId: string; account: AccountSummary }>("/api/coach/analyze", user, {
        ...prepared,
        piece: piece.trim() || undefined,
        goal: goal.trim() || undefined,
      });
      setAccount(res.account);
      router.replace(`/coach/session/${res.sessionId}`);
    } catch (err) {
      setStep("review");
      if (err instanceof CoachApiError) {
        setError({ message: err.message, paywall: err.status === 402 });
      } else {
        console.error(err);
        setError({ message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
      }
    }
  };

  if (step === "camera") {
    return (
      <Recorder
        onDone={acceptTake}
        onClose={() => setStep("setup")}
        onUnavailable={onUnavailable}
      />
    );
  }

  if (step === "analyzing") {
    const steps: { key: Progress; label: string }[] = [
      { key: "frames", label: `Picking ${CAPTURE.frames} moments from your video` },
      { key: "audio", label: "Listening for rhythm and dynamics" },
      { key: "review", label: `${instructorName} is reviewing your take` },
    ];
    const current = steps.findIndex((s) => s.key === progress);
    return (
      <CoachPage className="justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <InstructorAvatar name={instructorName} color={instructor?.color ?? 0} size={84} />
            <span className="absolute -inset-2 animate-ping rounded-full border-2 border-[var(--primary-light)] opacity-40" />
          </div>
          <h1 className="font-display mt-7 text-[28px] font-semibold tracking-tight">Reviewing your take</h1>
          <p className="mt-2 text-[15px] text-[var(--muted)]">Usually under a minute. Keep this screen open.</p>
        </div>
        <Card className="mt-8 space-y-4">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                {i < current ? (
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--success)]" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i === current ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--separator)]" />
                )}
              </span>
              <span className={`text-[15px] ${i <= current ? "font-medium" : "text-[var(--muted)]"}`}>{s.label}</span>
            </div>
          ))}
        </Card>
      </CoachPage>
    );
  }

  if (step === "review" && take) {
    return (
      <CoachPage>
        <TopBar back="/coach" title="Your take" />
        <div className="mt-2 overflow-hidden rounded-[28px] bg-black shadow-[var(--shadow)]">
          <video src={take.url} controls playsInline className="max-h-[52dvh] w-full" />
        </div>
        <p className="mt-3 text-center text-[14px] text-[var(--muted)]">
          {formatClock(take.seconds)}
          {take.seconds > CAPTURE.maxAnalyzeSeconds && ` · the first ${CAPTURE.maxAnalyzeSeconds} seconds will be reviewed`}
        </p>
        {error && <ErrorNote message={error.message} paywall={error.paywall} />}
        <div className="mt-auto space-y-3 pt-6">
          <PrimaryButton onClick={analyze} disabled={outOfAnalyses}>
            Get feedback
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              setTake(null);
              setError(null);
              setStep("setup");
            }}
          >
            Retake
          </SecondaryButton>
        </div>
      </CoachPage>
    );
  }

  return (
    <CoachPage>
      <TopBar back="/coach" title="New take" />

      <Card className="mt-2">
        <SetupIllustration />
        <ol className="mt-4 space-y-3">
          {[
            ["Film from the side", "Phone at keyboard height, about 1–2 m away."],
            ["Keep it all in frame", "Head, shoulders, arms, and both hands."],
            ["Play about a minute", `Recording stops at ${formatClock(CAPTURE.recordSeconds)}.`],
          ].map(([title, detail], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-[13px] font-semibold text-[var(--primary-dark)]">
                {i + 1}
              </span>
              <div>
                <p className="text-[15px] font-semibold">{title}</p>
                <p className="text-[14px] text-[var(--muted)]">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-medium">Piece <span className="text-[var(--muted)]">(optional)</span></span>
          <input
            value={piece}
            onChange={(e) => setPiece(e.target.value.slice(0, 120))}
            placeholder="e.g. Chopin Nocturne Op. 9 No. 2"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[16px] outline-none focus:border-[var(--primary)]"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-medium">Anything to check? <span className="text-[var(--muted)]">(optional)</span></span>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value.slice(0, 300))}
            placeholder="e.g. My wrist feels tight in the fast run"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[16px] outline-none focus:border-[var(--primary)]"
          />
        </label>
      </Card>

      {error && <ErrorNote message={error.message} paywall={error.paywall} />}
      {outOfAnalyses && !error && (
        <ErrorNote
          message={
            account?.plan === "pro"
              ? "You've used this month's analyses."
              : "You've used your free analyses. Upgrade to keep going."
          }
          paywall
        />
      )}

      <div className="mt-auto space-y-3 pt-6">
        <PrimaryButton onClick={() => setStep("camera")} disabled={outOfAnalyses}>
          <span className="h-3 w-3 rounded-full bg-white" />
          Open camera
        </PrimaryButton>
        <SecondaryButton onClick={() => fileRef.current?.click()} disabled={outOfAnalyses}>
          Choose a video
        </SecondaryButton>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </CoachPage>
  );
}

function ErrorNote({ message, paywall }: { message: string; paywall?: boolean }) {
  return (
    <div className="mt-4 rounded-[20px] bg-[var(--accent-light)] px-4 py-3 text-[14px] leading-relaxed">
      <p>{message}</p>
      {paywall && (
        <Link href="/coach/plan" className="mt-1 inline-block font-semibold text-[var(--primary-dark)]">
          See plans
        </Link>
      )}
    </div>
  );
}

// Side view: phone on the left, student at the piano on the right.
function SetupIllustration() {
  return (
    <svg viewBox="0 0 320 150" className="h-auto w-full" role="img" aria-label="Phone placed beside the piano, filming from the side">
      <rect x="0" y="0" width="320" height="150" rx="20" fill="var(--accent-light)" />
      <path d="M58 72 L175 34 L175 132 Z" fill="var(--primary-light)" opacity="0.35" />
      <rect x="40" y="58" width="18" height="30" rx="4" fill="var(--foreground)" opacity="0.85" />
      <line x1="49" y1="88" x2="49" y2="132" stroke="var(--foreground)" strokeWidth="3" opacity="0.5" />
      <line x1="38" y1="132" x2="60" y2="132" stroke="var(--foreground)" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
      <rect x="205" y="78" width="95" height="14" rx="3" fill="var(--foreground)" opacity="0.85" />
      <rect x="292" y="40" width="10" height="92" rx="3" fill="var(--foreground)" opacity="0.85" />
      <rect x="150" y="104" width="44" height="8" rx="3" fill="var(--primary-dark)" />
      <line x1="158" y1="112" x2="158" y2="132" stroke="var(--primary-dark)" strokeWidth="3" />
      <line x1="186" y1="112" x2="186" y2="132" stroke="var(--primary-dark)" strokeWidth="3" />
      <circle cx="170" cy="42" r="10" fill="var(--foreground)" />
      <path d="M170 53 L172 102" stroke="var(--foreground)" strokeWidth="7" strokeLinecap="round" />
      <path d="M171 62 L190 84 L212 80" stroke="var(--foreground)" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M172 102 L200 104 L204 132" stroke="var(--foreground)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
