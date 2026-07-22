import { describe, expect, it } from "vitest";
import {
  entitlementFromSubscription,
  grantsPremium,
  type SubscriptionSnapshot,
} from "./billing";

const NOW = new Date("2026-07-22T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function snap(overrides: Partial<SubscriptionSnapshot>): SubscriptionSnapshot {
  return {
    status: "active",
    currentPeriodEnd: new Date("2026-08-22T12:00:00Z"),
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe("entitlementFromSubscription", () => {
  it("grants active premium for an active subscription", () => {
    const ent = entitlementFromSubscription(snap({}), {
      graceDays: 7,
      now: NOW,
    });
    expect(ent).toEqual({ plan: "premium", status: "active", graceUntil: null });
  });

  it("grants active premium for a trialing subscription", () => {
    const ent = entitlementFromSubscription(snap({ status: "trialing" }), {
      graceDays: 7,
      now: NOW,
    });
    expect(ent.plan).toBe("premium");
    expect(ent.status).toBe("active");
  });

  it("keeps premium during grace when payment fails (past_due)", () => {
    const periodEnd = new Date("2026-07-20T00:00:00Z"); // already elapsed
    const ent = entitlementFromSubscription(
      snap({ status: "past_due", currentPeriodEnd: periodEnd }),
      { graceDays: 7, now: NOW },
    );
    expect(ent.plan).toBe("premium");
    expect(ent.status).toBe("grace");
    // Grace is at least 7 days from "now", even if the period ended earlier.
    expect(ent.graceUntil!.getTime()).toBe(NOW.getTime() + 7 * DAY_MS);
  });

  it("extends grace from the period end when it is in the future", () => {
    const periodEnd = new Date("2026-08-01T00:00:00Z");
    const ent = entitlementFromSubscription(
      snap({ status: "past_due", currentPeriodEnd: periodEnd }),
      { graceDays: 7, now: NOW },
    );
    expect(ent.graceUntil!.getTime()).toBe(periodEnd.getTime() + 7 * DAY_MS);
  });

  it("downgrades to free when the subscription is canceled", () => {
    const ent = entitlementFromSubscription(snap({ status: "canceled" }), {
      graceDays: 7,
      now: NOW,
    });
    expect(ent).toEqual({ plan: "free", status: "expired", graceUntil: null });
  });

  it.each(["unpaid", "incomplete", "incomplete_expired", "paused"])(
    "downgrades to free for status %s",
    (status) => {
      const ent = entitlementFromSubscription(snap({ status }), {
        graceDays: 7,
        now: NOW,
      });
      expect(ent.plan).toBe("free");
    },
  );
});

describe("grantsPremium", () => {
  it("grants for active premium", () => {
    expect(
      grantsPremium({ plan: "premium", status: "active", graceUntil: null }, NOW),
    ).toBe(true);
  });

  it("grants during a live grace window", () => {
    expect(
      grantsPremium(
        {
          plan: "premium",
          status: "grace",
          graceUntil: new Date(NOW.getTime() + DAY_MS),
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("denies once the grace window has lapsed", () => {
    expect(
      grantsPremium(
        {
          plan: "premium",
          status: "grace",
          graceUntil: new Date(NOW.getTime() - DAY_MS),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("denies for the free plan", () => {
    expect(
      grantsPremium({ plan: "free", status: "active", graceUntil: null }, NOW),
    ).toBe(false);
  });
});
