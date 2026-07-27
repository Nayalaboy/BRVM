import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCompany, getQuotes } from "@/lib/api";
import { PriceChart } from "@/components/price-chart";
import { DataTrust } from "@/components/data-trust";
import { WatchlistButton } from "@/components/watchlist-button";
import { formatCompactFCFA, formatDate, formatFCFA, formatNumber, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const company = await getCompany(symbol);
  if (!company) return {};
  const t = await getTranslations("dividends");
  return {
    title: `${company.name} (${company.ticker})`,
    description: `${company.name} — ${t("title")} BRVM, ${company.sector ?? ""}.`,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ symbol: string; locale: string }>;
}) {
  const { symbol } = await params;
  const t = await getTranslations("company");
  const tDiv = await getTranslations("dividends");
  const locale = await getLocale();

  const [company, quotes] = await Promise.all([getCompany(symbol), getQuotes(symbol)]);
  if (!company) notFound();

  const statusLabel: Record<string, string> = {
    proposed: tDiv("statusProposed"),
    announced: tDiv("statusApproved"),
    approved: tDiv("statusApproved"),
    paid: tDiv("statusPaid"),
  };

  const range =
    company.metrics?.low52w != null && company.metrics?.high52w != null
      ? `${formatFCFA(company.metrics.low52w)} – ${formatFCFA(company.metrics.high52w)}`
      : "—";

  const stats: { label: string; value: string; hint?: string }[] = [
    {
      label: t("lastClose"),
      value: company.lastClose !== null ? formatFCFA(company.lastClose) : "—",
      hint: company.lastQuoteDate ? formatDate(company.lastQuoteDate, locale) : undefined,
    },
    {
      label: t("dividendYield"),
      value:
        company.metrics?.dividendYield != null
          ? formatPercent(company.metrics.dividendYield)
          : "—",
    },
    { label: t("range52w"), value: range },
    {
      label: t("sharesOutstanding"),
      value: company.sharesOutstanding ? formatNumber(company.sharesOutstanding) : "—",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded bg-brand-700 px-2 py-1 font-mono text-sm font-bold text-white">
              {company.ticker}
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{company.name}</h1>
          </div>
          <WatchlistButton ticker={company.ticker} locale={locale} />
        </div>
        <p className="text-sm text-slate-500">
          {company.sector} · {company.country}
        </p>
        {(locale === "fr" ? company.descriptionFr : company.descriptionEn) ? (
          <p className="max-w-3xl leading-relaxed text-slate-600">
            {locale === "fr" ? company.descriptionFr : company.descriptionEn}
          </p>
        ) : null}
        <DataTrust date={company.lastQuoteDate} locale={locale} source={company.source} />
      </div>

      {quotes.length >= 2 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <PriceChart quotes={quotes} />
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="tabular mt-1 text-lg font-semibold text-slate-900">{s.value}</p>
            {s.hint ? <p className="text-xs text-slate-400">{s.hint}</p> : null}
          </div>
        ))}
        <Stat label={locale === "fr" ? "Capitalisation" : "Market capitalization"} value={company.marketCap != null ? formatCompactFCFA(company.marketCap) : "—"} />
        <Stat label={locale === "fr" ? "Valeur moyenne / jour (20j)" : "Average daily value (20d)"} value={company.metrics?.avgDailyValue20d != null ? formatCompactFCFA(company.metrics.avgDailyValue20d) : "—"} />
        <Stat label={locale === "fr" ? "Performance YTD" : "YTD return"} value={company.metrics?.ytdReturn != null ? formatPercent(company.metrics.ytdReturn) : "—"} />
        <Stat label={locale === "fr" ? "Rendement total 1 an" : "1-year total return"} value={company.totalReturn1y != null ? formatPercent(company.totalReturn1y) : "—"} />
        <Stat label={locale === "fr" ? "Performance cours 1 an" : "1-year price return"} value={company.priceReturn1y != null ? formatPercent(company.priceReturn1y) : "—"} />
        <Stat label={locale === "fr" ? "Série de dividendes" : "Dividend streak"} value={`${company.dividendStreakYears} ${locale === "fr" ? "an(s)" : "year(s)"}`} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{t("dividendHistory")}</h2>
          {company.dividends.length > 0 ? (
            <a
              href={`/api/dividends/ics?ticker=${company.ticker}`}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              {tDiv("exportIcs")}
            </a>
          ) : null}
        </div>
        {company.dividends.length === 0 ? (
          <p className="text-sm text-slate-500">{tDiv("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">{t("colFiscalYear")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("colAmount")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("colGrowth")}</th>
                  <th className="px-4 py-3 font-medium">{t("colExDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("colPaymentDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {company.dividends.map((d, i) => {
                  const previous = company.dividends[i + 1];
                  const amount = d.amountNet ?? d.amountGross;
                  const prevAmount = previous?.amountNet ?? previous?.amountGross;
                  const growth =
                    amount != null && prevAmount ? amount / prevAmount - 1 : null;
                  return (
                    <tr key={d.fiscalYear} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{d.fiscalYear}</td>
                      <td className="tabular px-4 py-3 text-right font-semibold text-slate-900">
                        {amount != null ? formatFCFA(amount, 2) : "—"}
                      </td>
                      <td
                        className={`tabular px-4 py-3 text-right font-medium ${
                          growth === null
                            ? "text-slate-400"
                            : growth >= 0
                              ? "text-emerald-700"
                              : "text-red-600"
                        }`}
                      >
                        {growth === null ? "—" : `${growth >= 0 ? "+" : ""}${formatPercent(growth)}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(d.exDate, locale)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(d.paymentDate, locale)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {statusLabel[d.status] ?? d.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {company.events.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {locale === "fr" ? "Décisions publiques récentes" : "Recent public decisions"}
            </h2>
            <a href={`/decisions?ticker=${company.ticker}`} className="text-xs font-bold text-brand-700 underline">
              {locale === "fr" ? "Tout voir" : "View all"}
            </a>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {company.events.map((event) => (
              <article key={event.id} className="grid gap-2 py-4 sm:grid-cols-[130px_1fr]">
                <div className="font-mono text-xs text-slate-500">
                  <p className="font-bold text-slate-900">{formatDate(event.date, locale)}</p>
                  <p>{event.country ?? "UEMOA"} · {event.eventType.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-slate-800">
                    {locale === "en" && event.summaryEn ? event.summaryEn : event.summaryFr}
                  </p>
                  <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-brand-700 underline">
                    {locale === "fr" ? "Source officielle" : "Official source"} · {event.documentRef}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {company.peers.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {locale === "fr" ? `Comparaison · ${company.sector}` : `Peer comparison · ${company.sector}`}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">{locale === "fr" ? "Société" : "Company"}</th>
                <th className="px-4 py-3 text-right">{locale === "fr" ? "Cours" : "Price"}</th>
                <th className="px-4 py-3 text-right">{locale === "fr" ? "Rendement" : "Yield"}</th>
                <th className="px-4 py-3 text-right">YTD</th>
                <th className="px-4 py-3 text-right">{locale === "fr" ? "Liquidité 20j" : "20d liquidity"}</th>
              </tr></thead>
              <tbody>{company.peers.map((peer) => (
                <tr key={peer.ticker} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3"><span className="font-mono font-semibold text-brand-700">{peer.ticker}</span> · {peer.name}</td>
                  <td className="px-4 py-3 text-right">{peer.lastClose != null ? formatFCFA(peer.lastClose) : "—"}</td>
                  <td className="px-4 py-3 text-right">{peer.dividendYield != null ? formatPercent(peer.dividendYield) : "—"}</td>
                  <td className="px-4 py-3 text-right">{peer.ytdReturn != null ? formatPercent(peer.ytdReturn) : "—"}</td>
                  <td className="px-4 py-3 text-right">{peer.avgDailyValue20d != null ? formatCompactFCFA(peer.avgDailyValue20d) : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="tabular mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
