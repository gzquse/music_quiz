// Server-only: Stripe client and the mapping from Stripe subscriptions to coach accounts.

import Stripe from "stripe";
import { HttpError, adminDb, toAccount, type CoachAccount } from "./server";

let client: Stripe | null = null;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(500, "Payments are not configured yet.");
  client ??= new Stripe(key);
  return client;
}

export function appOrigin(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
}

export async function ensureCustomer(account: CoachAccount) {
  if (account.stripeCustomerId) return account.stripeCustomerId;
  const customer = await stripe().customers.create({
    email: account.email,
    metadata: { userId: account.userId },
  });
  const { error } = await adminDb()
    .from("coach_accounts")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", account.userId);
  if (error) throw error;
  return customer.id;
}

export async function findAccountByCustomer(customerId: string) {
  const { data, error } = await adminDb()
    .from("coach_accounts")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data ? toAccount(data) : null;
}

// Stripe is the source of truth; every subscription event overwrites our copy.
export async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const account = await findAccountByCustomer(customerId);
  if (!account) {
    console.warn("Stripe subscription for unknown customer", customerId);
    return;
  }
  const item = subscription.items.data[0];
  const periodStart = item?.current_period_start ? item.current_period_start * 1000 : undefined;
  const newPeriod = periodStart !== undefined && periodStart !== account.periodStart;

  const { error } = await adminDb()
    .from("coach_accounts")
    .update({
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
      // A new billing period resets the monthly allowance.
      ...(newPeriod ? { period_start: new Date(periodStart).toISOString(), period_used: 0 } : {}),
    })
    .eq("user_id", account.userId);
  if (error) throw error;
}
