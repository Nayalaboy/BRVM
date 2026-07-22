import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { auth, signOut } from "@/lib/auth";
import { getEntitlementForUser } from "@/lib/entitlements";
import { openBillingPortal } from "@/lib/billing-actions";
import { isStripeConfigured } from "@/lib/stripe";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const t = await getTranslations("account");
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/connexion", locale: locale as "fr" | "en" });
  }

  const entitlement = await getEntitlementForUser(session!.user.id);
  const { checkout } = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {t("title")}
      </h1>

      {checkout === "success" ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
          {t("checkoutSuccess")}
        </p>
      ) : null}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("email")}
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {session!.user.email}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("plan")}
          </p>
          <p className="mt-1">
            <span
              className={
                entitlement.isPremium
                  ? "rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-800"
                  : "rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600"
              }
            >
              {entitlement.isPremium ? t("planPremium") : t("planFree")}
            </span>
          </p>
          {entitlement.status === "grace" && entitlement.graceUntil ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t("planGraceNote", {
                date: formatDate(entitlement.graceUntil, locale),
              })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          {entitlement.plan === "premium" && isStripeConfigured() ? (
            <form action={openBillingPortal}>
              <button
                type="submit"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("manageBilling")}
              </button>
            </form>
          ) : (
            <Link
              href="/tarifs"
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              {t("upgrade")}
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
