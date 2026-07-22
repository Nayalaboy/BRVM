import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
  } catch (error) {
    console.error("[stripe-webhook] signature verification failed", error);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event, {
      retrieveSubscription: (id) => stripe.subscriptions.retrieve(id),
    });
  } catch (error) {
    console.error(`[stripe-webhook] failed to handle ${event.type}`, error);
    // 500 so Stripe retries the delivery.
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
