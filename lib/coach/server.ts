// Server-only: Supabase admin access, signed-in user checks, and usage entitlements.

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";

export const FREE_ANALYSES = Number(process.env.COACH_FREE_ANALYSES ?? 3);
export const PRO_MONTHLY_ANALYSES = Number(process.env.COACH_PRO_MONTHLY_ANALYSES ?? 30);
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message, code: err.code }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

let admin: SupabaseClient | null = null;

// The secret key bypasses row-level security, so it must only ever run on the server.
export function adminDb() {
  if (!SUPABASE_URL || !SECRET_KEY) {
    throw new HttpError(500, "Server is missing Supabase credentials.");
  }
  admin ??= createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

// The browser sends the signed-in student's Supabase access token.
export async function requireUser(req: Request): Promise<User> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Please sign in.");
  const { data, error } = await adminDb().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session expired. Please sign in again.");
  return data.user;
}

export type CoachAccount = {
  userId: string;
  email?: string;
  trialUsed: number;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  periodStart?: number;
  periodEnd?: number;
  periodUsed: number;
};

type AccountRow = {
  user_id: string;
  email: string | null;
  trial_used: number;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  period_start: string | null;
  period_end: string | null;
  period_used: number;
};

export function toAccount(row: AccountRow): CoachAccount {
  return {
    userId: row.user_id,
    email: row.email ?? undefined,
    trialUsed: row.trial_used ?? 0,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    subscriptionId: row.subscription_id ?? undefined,
    subscriptionStatus: row.subscription_status ?? undefined,
    periodStart: row.period_start ? Date.parse(row.period_start) : undefined,
    periodEnd: row.period_end ? Date.parse(row.period_end) : undefined,
    periodUsed: row.period_used ?? 0,
  };
}

async function findAccount(userId: string) {
  const { data, error } = await adminDb().from("coach_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? toAccount(data as AccountRow) : null;
}

export async function getOrCreateAccount(user: User): Promise<CoachAccount> {
  const existing = await findAccount(user.id);
  if (existing) return existing;
  // ignoreDuplicates makes a parallel first request harmless.
  const { error } = await adminDb()
    .from("coach_accounts")
    .upsert({ user_id: user.id, email: user.email }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw error;
  const created = await findAccount(user.id);
  if (!created) throw new HttpError(500, "Could not create your account.");
  return created;
}

export function isPro(account: CoachAccount) {
  return account.subscriptionStatus === "active" || account.subscriptionStatus === "trialing";
}

export type Entitlement =
  | { allowed: true; via: "pro" | "trial"; remaining: number }
  | { allowed: false; reason: "trial_used" | "monthly_limit"; remaining: 0 };

function currentPeriod(account: CoachAccount, now: number) {
  const start = account.periodStart ?? 0;
  if (now - start < PERIOD_MS) return { start, used: account.periodUsed };
  return { start: now, used: 0 };
}

export function entitlement(account: CoachAccount, now = Date.now()): Entitlement {
  if (isPro(account)) {
    const { used } = currentPeriod(account, now);
    const remaining = PRO_MONTHLY_ANALYSES - used;
    return remaining > 0
      ? { allowed: true, via: "pro", remaining }
      : { allowed: false, reason: "monthly_limit", remaining: 0 };
  }
  const remaining = FREE_ANALYSES - account.trialUsed;
  return remaining > 0
    ? { allowed: true, via: "trial", remaining }
    : { allowed: false, reason: "trial_used", remaining: 0 };
}

// Called only after an analysis succeeded, so failed requests never cost the student.
export async function recordUsage(account: CoachAccount, via: "pro" | "trial", now = Date.now()) {
  let update: Record<string, unknown>;
  if (via === "trial") {
    update = { trial_used: account.trialUsed + 1 };
  } else {
    const { start, used } = currentPeriod(account, now);
    update = { period_start: new Date(start).toISOString(), period_used: used + 1 };
  }
  const { error } = await adminDb().from("coach_accounts").update(update).eq("user_id", account.userId);
  if (error) throw error;
}

export function accountSummary(account: CoachAccount) {
  const ent = entitlement(account);
  return {
    plan: isPro(account) ? "pro" : "free",
    subscriptionStatus: account.subscriptionStatus ?? null,
    periodEnd: account.periodEnd ?? null,
    remaining: ent.remaining,
    freeAnalyses: FREE_ANALYSES,
    proMonthlyAnalyses: PRO_MONTHLY_ANALYSES,
    canManageBilling: Boolean(account.stripeCustomerId),
    paymentsEnabled: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
    priceLabel: process.env.COACH_PRICE_LABEL || "$12.99 / month",
    trialDays: Number(process.env.STRIPE_TRIAL_DAYS ?? 0),
  };
}

export type AccountSummary = ReturnType<typeof accountSummary>;
