"use server";

import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { billingCustomers, db, users } from "@brvm/db";
import { auth } from "./auth";
import { getStripe } from "./stripe";
import { linkStripeCustomer } from "./billing";
import { appUrl, premiumMonthlyPriceId } from "./plans";
import { getPathname } from "@/i18n/navigation";

async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const existing = await db.query.billingCustomers.findFirst({
    where: eq(billingCustomers.userId, userId),
  });
  if (existing) return existing.stripeCustomerId;

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user?.email ?? undefined,
    name: user?.name ?? undefined,
    metadata: { userId },
  });
  await linkStripeCustomer(userId, customer.id);
  return customer.id;
}

function localizedUrl(pathname: "/compte" | "/tarifs", locale: string, query = "") {
  const path = getPathname({
    href: pathname,
    locale: locale as "fr" | "en",
  });
  return `${appUrl()}${path}${query}`;
}

/** Start a Stripe Checkout session for the Premium subscription. */
export async function startPremiumCheckout(): Promise<void> {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id) {
    nextRedirect(
      getPathname({ href: "/connexion", locale: locale as "fr" | "en" }),
    );
  }

  const priceId = premiumMonthlyPriceId();
  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_PREMIUM_MONTHLY is not configured — cannot start checkout.",
    );
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(session!.user.id);

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: session!.user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: localizedUrl("/compte", locale, "?checkout=success"),
    cancel_url: localizedUrl("/tarifs", locale, "?checkout=cancelled"),
    locale: locale === "fr" ? "fr" : "en",
    allow_promotion_codes: true,
    // EU VAT-ready: requires Stripe Tax to be enabled on the account.
    // Set STRIPE_AUTOMATIC_TAX=false to disable while testing.
    automatic_tax: {
      enabled: process.env.STRIPE_AUTOMATIC_TAX !== "false",
    },
    customer_update: { address: "auto" },
  });

  if (!checkout.url) throw new Error("Stripe did not return a checkout URL.");
  nextRedirect(checkout.url);
}

/** Open the Stripe billing portal (manage payment method, cancel, invoices). */
export async function openBillingPortal(): Promise<void> {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id) {
    nextRedirect(
      getPathname({ href: "/connexion", locale: locale as "fr" | "en" }),
    );
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(session!.user.id);
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: localizedUrl("/compte", locale),
    locale: locale === "fr" ? "fr" : "auto",
  });
  nextRedirect(portal.url);
}
