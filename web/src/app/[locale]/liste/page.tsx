import { getLocale, getTranslations } from "next-intl/server";
import { getCompanies, getDividendCalendar } from "@/lib/api";
import { WatchlistView } from "@/components/watchlist-view";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("watchlist");
  return { title: t("title"), description: t("subtitle") };
}

export default async function WatchlistPage() {
  const t = await getTranslations("watchlist");
  const locale = await getLocale();
  const [companies, calendar] = await Promise.all([getCompanies(), getDividendCalendar()]);

  return (
    <div className="space-y-7">
      <header className="border-b-4 border-black pb-6">
        <p className="terminal-kicker text-brand-600">WTC / {locale === "fr" ? "SUIVI" : "WATCH"}</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{t("subtitle")}</p>
      </header>
      <WatchlistView companies={companies} upcoming={calendar.upcoming} locale={locale} />
    </div>
  );
}
