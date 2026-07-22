import "server-only";
import { eq } from "drizzle-orm";
import { db, entitlements } from "@brvm/db";
import { auth } from "./auth";
import { grantsPremium } from "./billing";
import type { Plan } from "./plans";

export interface UserEntitlement {
  plan: Plan;
  status: "active" | "grace" | "expired";
  graceUntil: Date | null;
  isPremium: boolean;
}

const FREE: UserEntitlement = {
  plan: "free",
  status: "active",
  graceUntil: null,
  isPremium: false,
};

export async function getEntitlementForUser(
  userId: string,
): Promise<UserEntitlement> {
  const row = await db.query.entitlements.findFirst({
    where: eq(entitlements.userId, userId),
  });
  if (!row) return FREE;
  return {
    plan: row.plan,
    status: row.status,
    graceUntil: row.graceUntil,
    isPremium: grantsPremium(row),
  };
}

/** Entitlement of the current session (free when signed out). */
export async function getCurrentEntitlement(): Promise<
  UserEntitlement & { userId: string | null }
> {
  const session = await auth();
  if (!session?.user?.id) return { ...FREE, userId: null };
  const ent = await getEntitlementForUser(session.user.id);
  return { ...ent, userId: session.user.id };
}
