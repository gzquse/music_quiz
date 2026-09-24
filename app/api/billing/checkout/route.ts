import { HttpError, errorResponse, getOrCreateAccount, isPro, requireUser } from "@/lib/coach/server";
import { appOrigin, ensureCustomer, stripe } from "@/lib/coach/stripe";

export const runtime = "nodejs";

// Starts Stripe Checkout for the Pro subscription and returns the hosted page URL.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);
    if (isPro(account)) throw new HttpError(409, "You're already on Pro.");

    const price = process.env.STRIPE_PRICE_ID;
    if (!price) throw new HttpError(500, "Payments are not configured yet.");

    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 0);
    const origin = appOrigin(req);
    const customer = await ensureCustomer(account);

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { userId: user.id },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      success_url: `${origin}/coach/plan?checkout=success`,
      cancel_url: `${origin}/coach/plan?checkout=cancel`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
