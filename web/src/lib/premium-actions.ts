"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_PREMIUM_COOKIE } from "./premium";

export async function activateDemoPremium(): Promise<void> {
  const store = await cookies();
  store.set(DEMO_PREMIUM_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function deactivateDemoPremium(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_PREMIUM_COOKIE);
  revalidatePath("/", "layout");
}
