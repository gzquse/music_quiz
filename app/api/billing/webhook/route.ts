import type Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/coach/stripe";

export const runtime = "nodejs";

// Stripe → our database. Register this URL in Stripe with the events listed below.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return new Response("Webhook not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // Signature verification needs the raw, unparsed body.
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    console.error("Stripe signature check failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          await syncSubscription(await stripe().subscriptions.retrieve(session.subscription));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
    }
  } catch (err) {
    // A 500 makes Stripe retry the event later.
    console.error("Stripe webhook handling failed", event.type, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
