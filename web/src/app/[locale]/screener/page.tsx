import { getTranslations } from "next-intl/server";
import { getCompanies } from "@/lib/api";
import { isDemoPremium } from "@/lib/premium";
import { activateDemoPremium, deactivateDemoPremium } from "@/lib/premium-actions";
import { ScreenerTable } from "@/components/screener-table";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("screener");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ScreenerPage() {
  const t = await getTranslations("screener");
  const premium = await isDemoPremium();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
            <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-accent-700">
              {t("premiumBadge")}
            </span>
          </div>
          <p className="max-w-2xl text-slate-600">{t("subtitle")}</p>
        </div>
        {premium ? (
          <form action={deactivateDemoPremium}>
            <button
              type="submit"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("deactivate")}
            </button>
          </form>
        ) : null}
      </div>

      {premium ? (
        <ScreenerTable companies={await getCompanies()} />
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div aria-hidden className="pointer-events-none select-none space-y-3 p-6 opacity-50 blur-sm">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-8 w-2/3 rounded bg-slate-100" />
            <div className="h-8 rounded bg-slate-100" />
            <div className="h-8 rounded bg-slate-100" />
            <div className="h-8 w-1/2 rounded bg-slate-100" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 p-6 text-center backdrop-blur-[2px]">
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-700">
              {t("premiumBadge")}
            </span>
            <p className="max-w-md text-base font-semibold text-slate-900">{t("teaserTitle")}</p>
            <p className="max-w-md text-sm text-slate-600">{t("teaserBody")}</p>
            <form action={activateDemoPremium}>
              <button
                type="submit"
                className="mt-1 bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                {t("activate")}
              </button>
            </form>
            <p className="text-xs text-slate-400">{t("demoNote")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
