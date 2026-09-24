"use client";

import { useState, type ReactNode } from "react";
import { db } from "@/lib/instant";
import { CoachProvider } from "@/lib/coach/client";
import { CoachPage, PrimaryButton, Spinner } from "./ui";

// Students sign in with a 6-digit email code (InstantDB magic codes), then see the coach.
export function CoachGate({ children }: { children: ReactNode }) {
  const { isLoading, user, error } = db.useAuth();

  if (isLoading) {
    return (
      <CoachPage className="items-center justify-center">
        <Spinner />
      </CoachPage>
    );
  }
  if (error || !user) return <SignIn />;
  return <CoachProvider user={user}>{children}</CoachProvider>;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setSentTo(email.trim());
    } catch {
      setError("Couldn't send the code. Check the email address.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    try {
      await db.auth.signInWithMagicCode({ email: sentTo, code: code.trim() });
    } catch {
      setError("That code didn't work. Try again or resend it.");
      setBusy(false);
    }
  };

  return (
    <CoachPage className="justify-center">
      <div className="text-center">
        <p className="text-[15px] font-medium tracking-wide text-[var(--foreground)]/80">Form Coach</p>
        <h1 className="font-display mx-auto mt-4 max-w-[14ch] text-[34px] font-semibold leading-[1.1] tracking-tight">
          Feedback on your playing in a minute
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--muted)]">
          Film one minute of practice. Get lesson-style notes on posture, hands, rhythm, and dynamics.
        </p>
      </div>

      <div className="mt-8 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur-md">
        {!sentTo ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-[14px] font-medium">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-13 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[17px] outline-none focus:border-[var(--primary)]"
              />
            </label>
            <PrimaryButton type="submit" disabled={busy || !email.includes("@")}>
              {busy ? "Sending…" : "Send sign-in code"}
            </PrimaryButton>
            <p className="text-center text-[13px] text-[var(--muted)]">New here? Your first analyses are free.</p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-[15px] leading-relaxed text-[var(--muted)]">
              We sent a 6-digit code to <span className="font-semibold text-[var(--foreground)]">{sentTo}</span>.
            </p>
            <input
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-center text-[26px] font-semibold tracking-[0.4em] outline-none focus:border-[var(--primary)]"
            />
            <PrimaryButton type="submit" disabled={busy || code.length < 6}>
              {busy ? "Checking…" : "Sign in"}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setCode("");
              }}
              className="w-full py-2 text-[14px] font-medium text-[var(--primary-dark)]"
            >
              Use a different email
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-center text-[14px] text-[var(--error)]">{error}</p>}
      </div>
    </CoachPage>
  );
}
