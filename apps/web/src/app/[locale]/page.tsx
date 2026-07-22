import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getUpcomingDividends } from "@/lib/data";
import { formatDate, formatFCFA } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations("home");
  const tDiv = await getTranslations("dividends");
  const locale = await getLocale();
  const upcoming = await getUpcomingDividends(6);

  const features = [
    { title: t("featureCalendarTitle"), body: t("featureCalendarBody") },
    { title: t("featureCompaniesTitle"), body: t("featureCompaniesBody") },
    { title: t("featureCopilotTitle"), body: t("featureCopilotBody") },
    { title: t("featureScreenerTitle"), body: t("featureScreenerBody") },
  ];

  return (
    <div className="space-y-16">
      <section className="space-y-6 pt-8 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          {t("heroSubtitle")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dividendes"
            className="rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {t("ctaCalendar")}
          </Link>
          <Link
            href="/tarifs"
            className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            {t("ctaPricing")}
          </Link>
        </div>
      </section>

      {upcoming.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {t("upcomingDividends")}
            </h2>
            <Link
              href="/dividendes"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              {tDiv("title")} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((d) => (
              <Link
                key={d.id}
                href={{
                  pathname: "/societes/[symbol]",
                  params: { symbol: d.symbol },
                }}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-brand-700">
                    {d.symbol}
                  </span>
                  <span className="text-xs text-slate-500">
                    {tDiv("colExDate")} · {formatDate(d.exDate, locale)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {d.companyName}
                </p>
                <p className="tabular mt-2 text-lg font-semibold text-slate-900">
                  {formatFCFA(d.amount, 2)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">
          {t("featuresTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
