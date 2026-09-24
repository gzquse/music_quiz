"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { CoachProvider, getSupabase, initSupabase } from "@/lib/coach/client";
import { CoachPage, PrimaryButton, Spinner } from "./ui";

type AuthState = { status: "loading" } | { status: "ready"; session: Session | null } | { status: "error" };

// Students sign in with a one-time email code (Supabase Auth), then see the coach.
export function CoachGate({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    initSupabase()
      .then(async (supabase) => {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setAuth({ status: "ready", session: data.session });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
          setAuth({ status: "ready", session })
        );
        unsubscribe = () => listener.subscription.unsubscribe();
      })
      .catch(() => {
        if (!cancelled) setAuth({ status: "error" });
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  if (auth.status === "loading") {
    return (
      <CoachPage className="items-center justify-center">
        <Spinner />
      </CoachPage>
    );
  }
  if (auth.status === "error") {
    return (
      <CoachPage className="items-center justify-center text-center">
        <p className="text-[16px] font-semibold">Form Coach isn&apos;t configured yet</p>
        <p className="mt-2 max-w-xs text-[14px] text-[var(--muted)]">
          The server has no NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for this
          environment. Add both in Vercel for Preview and Production.
        </p>
      </CoachPage>
    );
  }
  if (!auth.session) return <SignIn />;
  return <CoachProvider user={auth.session.user}>{children}</CoachProvider>;
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
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      console.error(error);
      setError(
        error.status === 429
          ? "Too many codes requested. Please wait a few minutes and try again."
          : "Couldn't send the code. Check the email address."
      );
      return;
    }
    setSentTo(email.trim());
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" });
    if (error) {
      console.error(error);
      setError("That code didn't work. Try again or resend it.");
      setBusy(false);
    }
    // On success, CoachGate's auth listener swaps this screen for the coach.
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
              We sent a sign-in code to <span className="font-semibold text-[var(--foreground)]">{sentTo}</span>.
            </p>
            <input
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="123456"
              className="h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-center text-[26px] font-semibold tracking-[0.3em] outline-none focus:border-[var(--primary)]"
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
