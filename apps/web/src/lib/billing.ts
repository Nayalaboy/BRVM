/**
 * Stripe → entitlements synchronisation.
 *
 * The `entitlements` table is the single source of truth for feature access
 * and is written exclusively from Stripe webhook events (plus the initial
 * free row at signup). The mapping logic is a pure function
 * ({@link entitlementFromSubscription}) so the grace-period behaviour is
 * unit-testable without Stripe.
 */
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { billingCustomers, db, entitlements, subscriptions } from "@brvm/db";
import { track } from "@brvm/analytics";
import { graceDays } from "./plans";

export interface SubscriptionSnapshot {
  /** Stripe subscription status */
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface EntitlementState {
  plan: "free" | "premium";
  status: "active" | "grace" | "expired";
  graceUntil: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Map a Stripe subscription status to the entitlement it grants.
 *
 * - `active` / `trialing`  → premium, active
 * - `past_due`             → premium kept during a grace window
 *                            (period end + N days, at least N days from now)
 * - anything else          → free (checkout incomplete, canceled, unpaid…)
 */
export function entitlementFromSubscription(
  sub: SubscriptionSnapshot,
  options: { graceDays: number; now?: Date },
): EntitlementState {
  const now = options.now ?? new Date();

  switch (sub.status) {
    case "active":
    case "trialing":
      return { plan: "premium", status: "active", graceUntil: null };
    case "past_due": {
      const graceMs = options.graceDays * DAY_MS;
      const fromPeriodEnd = sub.currentPeriodEnd
        ? sub.currentPeriodEnd.getTime() + graceMs
        : 0;
      const fromNow = now.getTime() + graceMs;
      return {
        plan: "premium",
        status: "grace",
        graceUntil: new Date(Math.max(fromPeriodEnd, fromNow)),
      };
    }
    default:
      return { plan: "free", status: "expired", graceUntil: null };
  }
}

/** Whether an entitlement currently grants premium access. */
export function grantsPremium(
  ent: Pick<EntitlementState, "plan" | "status" | "graceUntil">,
  now: Date = new Date(),
): boolean {
  if (ent.plan !== "premium") return false;
  if (ent.status === "active") return true;
  if (ent.status === "grace") {
    return ent.graceUntil !== null && ent.graceUntil.getTime() > now.getTime();
  }
  return false;
}

// ---------------------------------------------------------------------------
// Stripe helpers
// ---------------------------------------------------------------------------

/**
 * `current_period_end` lives on subscription items since Stripe API
 * 2025-03-31; keep a fallback for older payloads.
 */
export function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  const legacy = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const epoch = fromItem ?? legacy;
  return epoch ? new Date(epoch * 1000) : null;
}

export function snapshotFromStripe(
  sub: Stripe.Subscription,
): SubscriptionSnapshot {
  return {
    status: sub.status,
    currentPeriodEnd: subscriptionPeriodEnd(sub),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export async function findUserIdByStripeCustomer(
  stripeCustomerId: string,
): Promise<string | null> {
  const row = await db.query.billingCustomers.findFirst({
    where: eq(billingCustomers.stripeCustomerId, stripeCustomerId),
  });
  return row?.userId ?? null;
}

export async function linkStripeCustomer(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  await db
    .insert(billingCustomers)
    .values({ userId, stripeCustomerId })
    .onConflictDoUpdate({
      target: billingCustomers.userId,
      set: { stripeCustomerId },
    });
}

/** Upsert the subscription mirror and recompute the user's entitlement. */
export async function syncSubscription(
  userId: string,
  sub: Stripe.Subscription,
): Promise<EntitlementState> {
  const snapshot = snapshotFromStripe(sub);
  const priceId = sub.items?.data?.[0]?.price?.id ?? "unknown";

  await db
    .insert(subscriptions)
    .values({
      id: sub.id,
      userId,
      status: snapshot.status,
      priceId,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: {
        status: snapshot.status,
        priceId,
        currentPeriodEnd: snapshot.currentPeriodEnd,
        cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    });

  const ent = entitlementFromSubscription(snapshot, {
    graceDays: graceDays(),
  });

  await db
    .insert(entitlements)
    .values({
      userId,
      plan: ent.plan,
      status: ent.status,
      graceUntil: ent.graceUntil,
      stripeSubscriptionId: sub.id,
    })
    .onConflictDoUpdate({
      target: entitlements.userId,
      set: {
        plan: ent.plan,
        status: ent.status,
        graceUntil: ent.graceUntil,
        stripeSubscriptionId: sub.id,
        updatedAt: new Date(),
      },
    });

  return ent;
}

// ---------------------------------------------------------------------------
// Webhook dispatcher
// ---------------------------------------------------------------------------

export async function handleStripeEvent(
  event: Stripe.Event,
  deps: {
    retrieveSubscription: (id: string) => Promise<Stripe.Subscription>;
  },
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!userId || !subscriptionId) return;

      if (customerId) await linkStripeCustomer(userId, customerId);
      const sub = await deps.retrieveSubscription(subscriptionId);
      const ent = await syncSubscription(userId, sub);
      if (ent.plan === "premium") {
        await track(
          "upgrade",
          { priceId: sub.items?.data?.[0]?.price?.id ?? "unknown", plan: "premium" },
          { userId },
        );
      }
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const userId = await findUserIdByStripeCustomer(customerId);
      if (!userId) {
        console.warn(
          `[billing] webhook for unknown Stripe customer ${customerId}`,
        );
        return;
      }
      await syncSubscription(userId, sub);

      if (event.type === "customer.subscription.deleted") {
        await track("cancel", { atPeriodEnd: false }, { userId });
      } else {
        const previous = event.data.previous_attributes as
          | Partial<Stripe.Subscription>
          | undefined;
        if (
          sub.cancel_at_period_end &&
          previous?.cancel_at_period_end === false
        ) {
          await track("cancel", { atPeriodEnd: true }, { userId });
        }
      }
      return;
    }

    case "invoice.payment_failed": {
      // The subscription also transitions to past_due (handled above via
      // customer.subscription.updated); nothing extra needed here, but keep
      // the case explicit for observability.
      console.warn("[billing] invoice.payment_failed received");
      return;
    }

    default:
      return;
  }
}
