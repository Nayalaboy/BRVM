import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCompanies } from "@/lib/api";
import { formatFCFA, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("companies");
  return { title: t("title") };
}

export default async function CompaniesPage() {
  const t = await getTranslations("companies");
  const rows = await getCompanies();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("title")}
        </h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">{t("colSymbol")}</th>
              <th className="px-4 py-3 font-medium">{t("colName")}</th>
              <th className="px-4 py-3 font-medium">{t("colSector")}</th>
              <th className="px-4 py-3 font-medium">{t("colCountry")}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t("colLastClose")}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {t("colYield")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.ticker} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={{
                      pathname: "/societes/[symbol]",
                      params: { symbol: c.ticker },
                    }}
                    className="font-mono font-semibold text-brand-700 hover:underline"
                  >
                    {c.ticker}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link
                    href={{
                      pathname: "/societes/[symbol]",
                      params: { symbol: c.ticker },
                    }}
                    className="hover:text-brand-700"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.sector}</td>
                <td className="px-4 py-3 text-slate-600">{c.country}</td>
                <td className="tabular px-4 py-3 text-right text-slate-900">
                  {c.lastClose !== null ? formatFCFA(c.lastClose) : "—"}
                </td>
                <td className="tabular px-4 py-3 text-right font-semibold text-slate-900">
                  {c.dividendYield !== null ? formatPercent(c.dividendYield) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
