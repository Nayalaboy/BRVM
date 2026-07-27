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
      <header className="border-b-4 border-black pb-6">
        <p className="terminal-kicker text-brand-600">SEC / BRVM</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-black sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("subtitle")}</p>
      </header>

      <div className="overflow-x-auto border border-zinc-300 bg-white shadow-[3px_3px_0_#111]">
        <table className="w-full text-sm">
          <thead className="bg-black font-mono text-[10px] uppercase tracking-wide text-zinc-300">
            <tr className="text-left">
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
              <tr key={c.ticker} className="border-b border-zinc-200 last:border-0 hover:bg-brand-50">
                <td className="px-4 py-3">
                  <Link
                    href={{
                      pathname: "/societes/[symbol]",
                      params: { symbol: c.ticker },
                    }}
                    className="font-mono font-black text-brand-600 hover:underline"
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
