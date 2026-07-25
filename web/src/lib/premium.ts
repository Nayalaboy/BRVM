import "server-only";
import { cookies } from "next/headers";

/**
 * Demo-only Premium flag (Phase 0 has no auth/payments). A signed-out visitor
 * can toggle a "démo Premium" cookie to preview gated features — purely for
 * evaluation. Real Premium (accounts + billing) is a later phase; the Auth.js +
 * Stripe skeleton is parked on the `legacy-premium` branch.
 */
export const DEMO_PREMIUM_COOKIE = "aqlee_demo_premium";

export async function isDemoPremium(): Promise<boolean> {
  const store = await cookies();
  return store.get(DEMO_PREMIUM_COOKIE)?.value === "1";
}
