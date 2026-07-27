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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black pb-6">
        <div>
          <p className="terminal-kicker text-brand-600">EQS / BRVM</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-4xl font-black uppercase tracking-tight text-black sm:text-5xl">{t("title")}</h1>
            <span className="bg-black px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wide text-brand-400">
              {t("premiumBadge")}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{t("subtitle")}</p>
        </div>
        {premium ? (
          <form action={deactivateDemoPremium}>
            <button
              type="submit"
              className="border border-zinc-400 bg-white px-4 py-2 text-xs font-black uppercase text-zinc-700 hover:bg-zinc-100"
            >
              {t("deactivate")}
            </button>
          </form>
        ) : null}
      </div>

      {premium ? (
        <ScreenerTable companies={await getCompanies()} />
      ) : (
        <div className="relative overflow-hidden border border-zinc-300 bg-white shadow-[3px_3px_0_#111]">
          <div aria-hidden className="pointer-events-none select-none space-y-3 p-6 opacity-50 blur-sm">
            <div className="h-10 bg-zinc-100" />
            <div className="h-8 w-2/3 bg-zinc-100" />
            <div className="h-8 bg-zinc-100" />
            <div className="h-8 bg-zinc-100" />
            <div className="h-8 w-1/2 bg-zinc-100" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 p-6 text-center backdrop-blur-[2px]">
            <span className="bg-black px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wide text-brand-400">
              {t("premiumBadge")}
            </span>
            <p className="max-w-md text-base font-black uppercase text-black">{t("teaserTitle")}</p>
            <p className="max-w-md text-sm text-zinc-600">{t("teaserBody")}</p>
            <form action={activateDemoPremium}>
              <button
                type="submit"
                className="mt-1 bg-black px-5 py-2 text-xs font-black uppercase text-white hover:bg-brand-500 hover:text-black"
              >
                {t("activate")}
              </button>
            </form>
            <p className="text-xs text-zinc-400">{t("demoNote")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
