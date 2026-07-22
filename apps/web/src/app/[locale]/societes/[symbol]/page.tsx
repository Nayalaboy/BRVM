import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCompanyDetail } from "@/lib/data";
import { getCurrentEntitlement } from "@/lib/entitlements";
import { PremiumTeaser } from "@/components/premium-teaser";
import {
  formatCompactFCFA,
  formatDate,
  formatFCFA,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const FREE_HISTORY_YEARS = 2;

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ symbol: string; locale: string }>;
}) {
  const { symbol } = await params;
  const t = await getTranslations("company");
  const tDiv = await getTranslations("dividends");
  const locale = await getLocale();

  const detail = await getCompanyDetail(symbol);
  if (!detail) notFound();

  const entitlement = await getCurrentEntitlement();
  const { company, dividends, lastClose, lastQuoteDate, avgDailyValueTraded30d } =
    detail;

  const lastDividend = dividends[0] ?? null;
  const dividendYield =
    lastDividend && lastClose
      ? Number(lastDividend.amount) / lastClose
      : null;

  const visibleDividends = entitlement.isPremium
    ? dividends
    : dividends.slice(0, FREE_HISTORY_YEARS);
  const hiddenCount = dividends.length - visibleDividends.length;

  const statusLabel = {
    proposed: tDiv("statusProposed"),
    approved: tDiv("statusApproved"),
    paid: tDiv("statusPaid"),
  } as const;

  const stats: { label: string; value: string; hint?: string }[] = [
    {
      label: t("lastClose"),
      value: lastClose !== null ? formatFCFA(lastClose) : "—",
      hint: lastQuoteDate ? formatDate(lastQuoteDate, locale) : undefined,
    },
    {
      label: t("dividendYield"),
      value: dividendYield !== null ? formatPercent(dividendYield) : "—",
    },
    {
      label: t("lastDividend"),
      value: lastDividend ? formatFCFA(Number(lastDividend.amount), 2) : "—",
      hint: lastDividend ? `${lastDividend.fiscalYear}` : undefined,
    },
    {
      label: t("avgDailyValue"),
      value:
        avgDailyValueTraded30d !== null
          ? formatCompactFCFA(avgDailyValueTraded30d)
          : "—",
    },
    {
      label: t("sharesOutstanding"),
      value: company.sharesOutstanding
        ? formatNumber(company.sharesOutstanding)
        : "—",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded bg-brand-700 px-2 py-1 font-mono text-sm font-bold text-white">
            {company.symbol}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {company.name}
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          {company.sector} · {company.country}
        </p>
        <p className="max-w-3xl leading-relaxed text-slate-600">
          {locale === "fr" ? company.descriptionFr : company.descriptionEn}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {s.label}
            </p>
            <p className="tabular mt-1 text-lg font-semibold text-slate-900">
              {s.value}
            </p>
            {s.hint ? (
              <p className="text-xs text-slate-400">{s.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {t("dividendHistory")}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">{t("colFiscalYear")}</th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("colAmount")}
                </th>
                {entitlement.isPremium ? (
                  <th className="px-4 py-3 text-right font-medium">
                    {t("colGrowth")}
                  </th>
                ) : null}
                <th className="px-4 py-3 font-medium">{t("colExDate")}</th>
                <th className="px-4 py-3 font-medium">{t("colPaymentDate")}</th>
                <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleDividends.map((d, i) => {
                const previous = dividends[i + 1];
                const growth = previous
                  ? Number(d.amount) / Number(previous.amount) - 1
                  : null;
                return (
                  <tr
                    key={d.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {d.fiscalYear}
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold text-slate-900">
                      {formatFCFA(Number(d.amount), 2)}
                    </td>
                    {entitlement.isPremium ? (
                      <td
                        className={`tabular px-4 py-3 text-right font-medium ${
                          growth === null
                            ? "text-slate-400"
                            : growth >= 0
                              ? "text-brand-700"
                              : "text-red-600"
                        }`}
                      >
                        {growth === null
                          ? "—"
                          : `${growth >= 0 ? "+" : ""}${formatPercent(growth)}`}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(d.exDate, locale)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(d.paymentDate, locale)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {statusLabel[d.status]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!entitlement.isPremium && hiddenCount > 0 ? (
          <PremiumTeaser
            title={t("premiumHistoryTitle")}
            body={t("premiumHistoryBody")}
            signedIn={entitlement.userId !== null}
          />
        ) : null}
      </section>
    </div>
  );
}
