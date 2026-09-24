"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@instantdb/react";
import { db } from "@/lib/instant";
import type { AccountSummary } from "./server";

export class CoachApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

// Every coach API call carries the student's InstantDB token so the server knows who is asking.
export async function coachPost<T>(path: string, user: User, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.refresh_token}`,
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
      const res = await coachPost<{ account: AccountSummary }>("/api/coach/account", user);
      setAccount(res.account);
    } catch (err) {
      console.error("Could not load account", err);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    coachPost<{ account: AccountSummary }>("/api/coach/account", user)
      .then((res) => {
        if (!cancelled) setAccount(res.account);
      })
      .catch((err) => console.error("Could not load account", err));
    return () => {
      cancelled = true;
    };
  }, [user]);

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

export function useCoachData(userId: string) {
  return db.useQuery({
    coach_instructors: { $: { where: { userId } } },
    coach_sessions: {
      $: {
        where: { userId },
        fields: ["createdAt", "piece", "overall", "professorNotes", "professorScores", "instructorName"],
      },
    },
  });
}
