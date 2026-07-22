export type Plan = "free" | "premium";

export function premiumMonthlyPriceId(): string | undefined {
  return process.env.STRIPE_PRICE_PREMIUM_MONTHLY;
}

export function premiumYearlyPriceId(): string | undefined {
  return process.env.STRIPE_PRICE_PREMIUM_YEARLY;
}

export function graceDays(): number {
  const parsed = Number(process.env.BILLING_GRACE_PERIOD_DAYS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 7;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
