import { getTranslations } from "next-intl/server";
import { getCurrentEntitlement } from "@/lib/entitlements";
import { PremiumTeaser } from "@/components/premium-teaser";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("screener");
  return { title: t("title") };
}

export default async function ScreenerPage() {
  const t = await getTranslations("screener");
  const entitlement = await getCurrentEntitlement();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-slate-600">{t("subtitle")}</p>
      </div>

      {entitlement.isPremium ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-sm leading-relaxed text-brand-900">
          {t("comingSoon")}
        </div>
      ) : (
        <PremiumTeaser
          title={t("teaserTitle")}
          body={t("teaserBody")}
          signedIn={entitlement.userId !== null}
        >
          <div className="space-y-3 p-6">
            <div className="h-8 w-1/3 rounded bg-slate-200" />
            <div className="h-24 rounded bg-slate-100" />
            <div className="h-8 rounded bg-slate-100" />
            <div className="h-8 rounded bg-slate-100" />
          </div>
        </PremiumTeaser>
      )}
    </div>
  );
}
