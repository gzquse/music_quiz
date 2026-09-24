// Server-only: InstantDB admin access, signed-in user checks, and usage entitlements.

import { init, id, type User } from "@instantdb/admin";
import schema from "@/instant.schema";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || "";
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || "";

export const adminDb = init({ appId: APP_ID, adminToken: ADMIN_TOKEN, schema });
export { id };

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

// The browser sends the InstantDB refresh token of the signed-in student.
export async function requireUser(req: Request): Promise<User> {
  if (!APP_ID || !ADMIN_TOKEN) {
    throw new HttpError(500, "Server is missing InstantDB credentials.");
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Please sign in.");
  try {
    return await adminDb.auth.verifyToken(token);
  } catch {
    throw new HttpError(401, "Your session expired. Please sign in again.");
  }
}

export type CoachAccount = {
  id: string;
  userId: string;
  email?: string;
  createdAt: number;
  trialUsed: number;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  periodStart?: number;
  periodEnd?: number;
  periodUsed?: number;
};

async function findAccount(userId: string) {
  const { coach_accounts } = await adminDb.query({
    coach_accounts: { $: { where: { userId } } },
  });
  return (coach_accounts[0] as CoachAccount | undefined) ?? null;
}

export async function getOrCreateAccount(user: User): Promise<CoachAccount> {
  const existing = await findAccount(user.id);
  if (existing) return existing;

  const account = {
    userId: user.id,
    email: user.email ?? undefined,
    createdAt: Date.now(),
    trialUsed: 0,
  };
  const accountId = id();
  try {
    await adminDb.transact(adminDb.tx.coach_accounts[accountId].update(account));
  } catch (err) {
    // A parallel first request may have created it (userId is unique).
    const created = await findAccount(user.id);
    if (created) return created;
    throw err;
  }
  return { id: accountId, ...account };
}

export function isPro(account: CoachAccount) {
  return account.subscriptionStatus === "active" || account.subscriptionStatus === "trialing";
}

export type Entitlement =
  | { allowed: true; via: "pro" | "trial"; remaining: number }
  | { allowed: false; reason: "trial_used" | "monthly_limit"; remaining: 0 };

function currentPeriod(account: CoachAccount, now: number) {
  const start = account.periodStart ?? 0;
  if (now - start < PERIOD_MS) return { start, used: account.periodUsed ?? 0 };
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
  const remaining = FREE_ANALYSES - (account.trialUsed ?? 0);
  return remaining > 0
    ? { allowed: true, via: "trial", remaining }
    : { allowed: false, reason: "trial_used", remaining: 0 };
}

// Called only after an analysis succeeded, so failed requests never cost the student.
export function usageUpdate(account: CoachAccount, via: "pro" | "trial", now = Date.now()) {
  if (via === "trial") {
    return adminDb.tx.coach_accounts[account.id].update({ trialUsed: (account.trialUsed ?? 0) + 1 });
  }
  const { start, used } = currentPeriod(account, now);
  return adminDb.tx.coach_accounts[account.id].update({ periodStart: start, periodUsed: used + 1 });
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
