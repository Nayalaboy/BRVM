/**
 * Typed product analytics. Events are written to Postgres
 * (`analytics_events`) so the admin dashboard can compute funnels
 * (signup → first value moment → upgrade) without a third-party dependency.
 *
 * Add new events by extending {@link AnalyticsEventMap}; the compiler then
 * enforces the payload shape at every call site.
 */
import { analyticsEvents, db } from "@brvm/db";

export interface AnalyticsEventMap {
  /** A new account was created. */
  signup: { method: "google" | "email" | "dev" ; locale: string };
  /** The user saved their first screener configuration. */
  first_screen_saved: { screenName: string };
  /** The user asked their first copilot question. */
  first_copilot_question: { language: "fr" | "en" };
  /** A subscription became active (checkout completed or reactivation). */
  upgrade: { priceId: string; plan: "premium" };
  /** The user cancelled (at period end or immediately). */
  cancel: { atPeriodEnd: boolean };
  /** The copilot refused a personalized-advice request (regulatory log). */
  copilot_refusal: { reason: string; language: "fr" | "en" };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export interface TrackOptions {
  userId?: string | null;
}

/**
 * Persist an analytics event. Never throws: analytics must not break the
 * request path — failures are logged and swallowed.
 */
export async function track<N extends AnalyticsEventName>(
  name: N,
  properties: AnalyticsEventMap[N],
  options: TrackOptions = {},
): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      name,
      properties,
      userId: options.userId ?? null,
    });
  } catch (error) {
    console.error(`[analytics] failed to track "${name}"`, error);
  }
}
