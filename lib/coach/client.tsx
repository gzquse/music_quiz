"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AccountSummary } from "./server";
import { toInstructor, toSessionRecord, type InstructorRow, type SessionRecord, type SessionRow } from "./records";

let browserClient: SupabaseClient | null = null;

// Uses the values built into the page when the build had them; otherwise asks the
// server, which reads them at request time. Either way a late-added Vercel variable works.
export async function initSupabase() {
  if (browserClient) return browserClient;
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    const config = await fetch("/api/coach/config")
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
    url = config?.url;
    key = config?.key;
  }
  if (!url || !key) throw new Error("Supabase is not configured.");
  browserClient = createClient(url, key);
  return browserClient;
}

// CoachGate awaits initSupabase() before rendering anything that calls this.
export function getSupabase() {
  if (!browserClient) throw new Error("Supabase is not ready yet.");
  return browserClient;
}

export class CoachApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

// Every coach API call carries the student's access token so the server knows who is asking.
// getSession() refreshes the token first when it's about to expire.
export async function coachPost<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) throw new CoachApiError(401, "Please sign in again.");
  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CoachApiError(res.status, json.error || "Something went wrong. Please try again.", json.code);
  }
  return json as T;
}

type CoachContextValue = {
  user: User;
  account: AccountSummary | null;
  refreshAccount: () => Promise<void>;
  setAccount: (account: AccountSummary) => void;
};

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({ user, children }: { user: User; children: ReactNode }) {
  const [account, setAccount] = useState<AccountSummary | null>(null);

  const refreshAccount = useCallback(async () => {
    try {
      const res = await coachPost<{ account: AccountSummary }>("/api/coach/account");
      setAccount(res.account);
    } catch (err) {
      console.error("Could not load account", err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    coachPost<{ account: AccountSummary }>("/api/coach/account")
      .then((res) => {
        if (!cancelled) setAccount(res.account);
      })
      .catch((err) => console.error("Could not load account", err));
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  return (
    <CoachContext.Provider value={{ user, account, refreshAccount, setAccount }}>
      {children}
    </CoachContext.Provider>
  );
}

export function useCoach() {
  const value = useContext(CoachContext);
  if (!value) throw new Error("useCoach must be used inside CoachProvider");
  return value;
}

export type SessionSummary = Pick<SessionRecord, "id" | "createdAt" | "piece" | "overall" | "professorNotes">;

// The student's instructor and take history. Row-level security limits both to their own rows.
export function useCoachData(userId: string) {
  const [state, setState] = useState<{
    isLoading: boolean;
    instructorRow: InstructorRow | null;
    sessions: SessionSummary[];
  }>({ isLoading: true, instructorRow: null, sessions: [] });

  useEffect(() => {
    let cancelled = false;
    const db = getSupabase();
    Promise.all([
      db.from("coach_instructors").select("*").eq("user_id", userId).maybeSingle(),
      db
        .from("coach_sessions")
        .select("id, created_at, piece, overall, professor_notes")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]).then(([instructorRes, sessionsRes]) => {
      if (cancelled) return;
      if (instructorRes.error) console.error(instructorRes.error);
      if (sessionsRes.error) console.error(sessionsRes.error);
      setState({
        isLoading: false,
        instructorRow: (instructorRes.data as InstructorRow | null) ?? null,
        sessions: (sessionsRes.data ?? []).map((s) => ({
          id: s.id,
          createdAt: Date.parse(s.created_at),
          piece: s.piece ?? undefined,
          overall: s.overall ?? undefined,
          professorNotes: s.professor_notes ?? undefined,
        })),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    isLoading: state.isLoading,
    hasInstructor: Boolean(state.instructorRow),
    instructor: toInstructor(state.instructorRow),
    sessions: state.sessions,
  };
}

export function useSessionRecord(sessionId: string) {
  const [state, setState] = useState<{ isLoading: boolean; session: SessionRecord | null }>({
    isLoading: true,
    session: null,
  });

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .from("coach_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error(error);
        setState({ isLoading: false, session: data ? toSessionRecord(data as SessionRow) : null });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return state;
}
