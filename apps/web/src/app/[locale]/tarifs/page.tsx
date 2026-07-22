import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getCurrentEntitlement } from "@/lib/entitlements";
import { startPremiumCheckout } from "@/lib/billing-actions";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("pricing");
  return { title: t("title") };
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const t = await getTranslations("pricing");
  const session = await auth();
  const entitlement = await getCurrentEntitlement();
  const { checkout } = await searchParams;

  const freeFeatures = [t("freeFeature1"), t("freeFeature2"), t("freeFeature3")];
  const premiumFeatures = [
    t("premiumFeature1"),
    t("premiumFeature2"),
    t("premiumFeature3"),
    t("premiumFeature4"),
    t("premiumFeature5"),
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("title")}
        </h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </div>

      {checkout === "cancelled" ? (
        <p className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          {t("checkoutCancelled")}
        </p>
      ) : null}

      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("freeName")}
          </h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {t("freePrice")}
          </p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600">
            {freeFeatures.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brand-600">✓</span>
                {f}
              </li>
            ))}
          </ul>
          {!entitlement.isPremium ? (
            <p className="mt-6 rounded-full border border-slate-200 py-2 text-center text-sm font-medium text-slate-500">
              {t("ctaCurrent")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col rounded-2xl border-2 border-brand-600 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-800">
            {t("premiumName")}
          </h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {t("premiumPrice")}
          </p>
          <p className="mt-1 text-xs text-slate-500">{t("premiumPriceNote")}</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brand-600">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {entitlement.isPremium ? (
              <p className="rounded-full border border-brand-200 bg-brand-50 py-2 text-center text-sm font-semibold text-brand-800">
                {t("ctaCurrent")}
              </p>
            ) : session?.user && isStripeConfigured() ? (
              <form action={startPremiumCheckout}>
                <button
                  type="submit"
                  className="w-full rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  {t("cta")}
                </button>
              </form>
            ) : (
              <Link
                href="/connexion"
                className="block w-full rounded-full bg-brand-700 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-800"
              >
                {t("ctaSignIn")}
              </Link>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            {t("billingNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
