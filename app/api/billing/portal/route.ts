import { HttpError, errorResponse, getOrCreateAccount, requireUser } from "@/lib/coach/server";
import { appOrigin, stripe } from "@/lib/coach/stripe";

export const runtime = "nodejs";

// Opens Stripe's hosted billing portal (update card, cancel, invoices).
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);
    if (!account.stripeCustomerId) throw new HttpError(400, "No billing account yet.");

    const session = await stripe().billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${appOrigin(req)}/coach/plan`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
