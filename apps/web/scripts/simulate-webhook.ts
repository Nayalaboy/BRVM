/**
 * Local test helper: simulate the entitlement sync the Stripe webhook
 * performs, without needing Stripe credentials.
 *
 * Usage:
 *   pnpm exec tsx scripts/simulate-webhook.ts <email> <status>
 *   status: active | past_due | canceled
 */
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, pool, users } from "@brvm/db";
import { linkStripeCustomer, syncSubscription } from "../src/lib/billing";

async function main() {
  const [email, status = "active"] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: tsx scripts/simulate-webhook.ts <email> <status>");
    process.exit(1);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  const fakeSubscription = {
    id: "sub_simulated_123",
    status,
    customer: "cus_simulated_123",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: {
            id: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "price_simulated",
          },
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        },
      ],
    },
  } as unknown as Stripe.Subscription;

  await linkStripeCustomer(user.id, "cus_simulated_123");
  const ent = await syncSubscription(user.id, fakeSubscription);
  console.log(`Entitlement for ${email}:`, ent);
  await pool.end();
}

void main();
