import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPastDividends, getUpcomingDividends, type DividendRow } from "@/lib/data";
import { formatDate, formatFCFA } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("dividends");
  return { title: t("title") };
}

async function DividendTable({ rows }: { rows: DividendRow[] }) {
  const t = await getTranslations("dividends");
  const locale = await getLocale();

  const statusLabel = {
    proposed: t("statusProposed"),
    approved: t("statusApproved"),
    paid: t("statusPaid"),
  } as const;

  const statusClass = {
    proposed: "bg-amber-100 text-amber-800",
    approved: "bg-brand-100 text-brand-800",
    paid: "bg-slate-100 text-slate-600",
  } as const;

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{t("empty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">{t("colCompany")}</th>
            <th className="px-4 py-3 font-medium">{t("colFiscalYear")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("colAmount")}</th>
            <th className="px-4 py-3 font-medium">{t("colExDate")}</th>
            <th className="px-4 py-3 font-medium">{t("colPaymentDate")}</th>
            <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={{
                    pathname: "/societes/[symbol]",
                    params: { symbol: d.symbol },
                  }}
                  className="font-medium text-slate-900 hover:text-brand-700"
                >
                  <span className="font-mono text-brand-700">{d.symbol}</span>{" "}
                  · {d.companyName}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{d.fiscalYear}</td>
              <td className="tabular px-4 py-3 text-right font-semibold text-slate-900">
                {formatFCFA(d.amount, 2)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(d.exDate, locale)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(d.paymentDate, locale)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass[d.status]}`}
                >
                  {statusLabel[d.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DividendsPage() {
  const t = await getTranslations("dividends");
  const [upcoming, past] = await Promise.all([
    getUpcomingDividends(50),
    getPastDividends(50),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-slate-600">{t("subtitle")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{t("upcoming")}</h2>
        <DividendTable rows={upcoming} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{t("past")}</h2>
        <DividendTable rows={past} />
      </section>
    </div>
  );
}
