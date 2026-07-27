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

const RANGES = [
  { key: "1m", limit: 23, fr: "1 M", en: "1M" },
  { key: "6m", limit: 130, fr: "6 M", en: "6M" },
  { key: "1y", limit: 260, fr: "1 A", en: "1Y" },
  { key: "max", limit: 2000, fr: "Max", en: "Max" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string; locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { symbol } = await params;
  const { range: rangeParam } = await searchParams;
  const t = await getTranslations("company");
  const tDiv = await getTranslations("dividends");
  const locale = await getLocale();

  const chartRange: RangeKey = RANGES.some((r) => r.key === rangeParam) ? (rangeParam as RangeKey) : "1y";
  const limit = RANGES.find((r) => r.key === chartRange)!.limit;
  const [company, quotes] = await Promise.all([getCompany(symbol), getQuotes(symbol, limit)]);
  if (!company) notFound();

  const chartPoints = quotes.filter((q) => q.close !== null);
  const rangeFirst = chartPoints[0]?.close ?? null;
  const rangeLast = chartPoints[chartPoints.length - 1]?.close ?? null;
  const rangeChange = rangeFirst && rangeLast ? rangeLast / rangeFirst - 1 : null;
  const exDates = company.dividends
    .map((d) => d.exDate)
    .filter((d): d is string => d !== null);

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
            <span className="bg-brand-500 px-2 py-1 font-mono text-sm font-black text-black">
              {company.ticker}
            </span>
            <h1 className="text-3xl font-black tracking-tight text-black">{company.name}</h1>
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

      {chartPoints.length >= 2 ? (
        <section className="border border-zinc-300 bg-white shadow-[3px_3px_0_#111]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 bg-zinc-100 px-4 py-2">
            <div className="flex items-center gap-3">
              <p className="terminal-kicker text-black">
                {locale === "fr" ? "Cours de clôture" : "Closing price"}
              </p>
              {rangeChange != null ? (
                <span
                  className={`tabular font-mono text-xs font-black ${rangeChange >= 0 ? "text-emerald-700" : "text-red-600"}`}
                >
                  {rangeChange >= 0 ? "+" : ""}
                  {formatPercent(rangeChange)}
                </span>
              ) : null}
            </div>
            <div className="flex" role="group" aria-label={locale === "fr" ? "Période" : "Range"}>
              {RANGES.map((r) => (
                <a
                  key={r.key}
                  href={`?range=${r.key}`}
                  aria-current={r.key === chartRange ? "true" : undefined}
                  className={`border border-l-0 border-zinc-300 px-3 py-1 font-mono text-[10px] font-black uppercase first:border-l ${
                    r.key === chartRange ? "bg-black text-brand-400" : "bg-white text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {locale === "fr" ? r.fr : r.en}
                </a>
              ))}
            </div>
          </div>
          <div className="p-4">
            <PriceChart quotes={quotes} exDates={exDates} locale={locale} />
          </div>
        </section>
      ) : null}

      <div className="grid gap-px border border-zinc-300 bg-zinc-300 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-4">
            <p className="terminal-kicker text-zinc-500">{s.label}</p>
            <p className="tabular mt-1 font-mono text-lg font-bold text-black">{s.value}</p>
            {s.hint ? <p className="font-mono text-xs text-zinc-400">{s.hint}</p> : null}
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-2">
          <h2 className="text-lg font-black uppercase tracking-tight text-black">{t("dividendHistory")}</h2>
          {company.dividends.length > 0 ? (
            <a
              href={`/api/dividends/ics?ticker=${company.ticker}`}
              className="font-mono text-[10px] font-bold uppercase text-brand-600 hover:underline"
            >
              {tDiv("exportIcs")} →
            </a>
          ) : null}
        </div>
        {company.dividends.length === 0 ? (
          <p className="text-sm text-zinc-500">{tDiv("empty")}</p>
        ) : (
          <div className="overflow-x-auto border border-zinc-300 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-black font-mono text-[10px] uppercase tracking-wide text-zinc-300">
                <tr className="text-left">
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
          <div className="flex items-center justify-between gap-3 border-b-4 border-black pb-2">
            <h2 className="text-lg font-black uppercase tracking-tight text-black">
              {locale === "fr" ? "Décisions publiques récentes" : "Recent public decisions"}
            </h2>
            <a href={`/decisions?ticker=${company.ticker}`} className="font-mono text-[10px] font-bold uppercase text-brand-600 hover:underline">
              {locale === "fr" ? "Tout voir" : "View all"} →
            </a>
          </div>
          <div className="divide-y divide-zinc-200 border-y border-zinc-300">
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
          <h2 className="border-b-4 border-black pb-2 text-lg font-black uppercase tracking-tight text-black">
            {locale === "fr" ? `Comparaison · ${company.sector}` : `Peer comparison · ${company.sector}`}
          </h2>
          <div className="overflow-x-auto border border-zinc-300 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-black font-mono text-[10px] uppercase tracking-wide text-zinc-300"><tr className="text-left">
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
    <div className="bg-white p-4">
      <p className="terminal-kicker text-zinc-500">{label}</p>
      <p className="tabular mt-1 font-mono text-lg font-bold text-black">{value}</p>
    </div>
  );
}
