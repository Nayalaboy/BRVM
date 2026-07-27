import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDividendCalendar, type DividendRow } from "@/lib/api";
import { formatDate, formatFCFA, formatPercent } from "@/lib/format";
import { DataTrust } from "@/components/data-trust";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("dividends");
  return { title: t("title") };
}

const STATUS_CLASS: Record<string, string> = {
  proposed: "bg-amber-100 text-amber-800",
  announced: "bg-emerald-100 text-emerald-800",
  approved: "bg-emerald-100 text-emerald-800",
  paid: "bg-slate-100 text-slate-600",
};

async function DividendTable({ rows }: { rows: DividendRow[] }) {
  const t = await getTranslations("dividends");
  const locale = await getLocale();

  const statusLabel: Record<string, string> = {
    proposed: t("statusProposed"),
    announced: t("statusApproved"),
    approved: t("statusApproved"),
    paid: t("statusPaid"),
  };

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{t("empty")}</p>;
  }

  return (
    <div className="overflow-x-auto border border-zinc-300 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-black font-mono text-[10px] uppercase tracking-wide text-zinc-300">
          <tr className="text-left">
            <th className="px-4 py-3 font-medium">{t("colCompany")}</th>
            <th className="px-4 py-3 font-medium">{t("colFiscalYear")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("colAmount")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("colYield")}</th>
            <th className="px-4 py-3 font-medium">{t("colExDate")}</th>
            <th className="px-4 py-3 font-medium">{t("colPaymentDate")}</th>
            <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr
              key={`${d.ticker}-${d.fiscalYear}-${d.exDate}`}
              className="border-b border-zinc-200 last:border-0 hover:bg-brand-50"
            >
              <td className="px-4 py-3">
                <Link
                  href={{ pathname: "/societes/[symbol]", params: { symbol: d.ticker } }}
                  className="font-medium text-slate-900 hover:text-brand-700"
                >
                  <span className="font-mono text-brand-700">{d.ticker}</span> · {d.company}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{d.fiscalYear}</td>
              <td className="tabular px-4 py-3 text-right font-semibold text-slate-900">
                {d.amount === null ? "—" : formatFCFA(d.amount, 2)}
              </td>
              <td className="tabular px-4 py-3 text-right text-slate-600">
                {d.yield === null ? "—" : formatPercent(d.yield)}
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDate(d.exDate, locale)}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(d.paymentDate, locale)}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    STATUS_CLASS[d.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {statusLabel[d.status] ?? d.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DividendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; sector?: string; minYield?: string }>;
}) {
  const t = await getTranslations("dividends");
  const locale = await getLocale();
  const calendar = await getDividendCalendar();
  const filters = await searchParams;
  const all = [...calendar.upcoming, ...calendar.past];
  const countries = [...new Set(all.map((row) => row.country).filter((v): v is string => Boolean(v)))].sort();
  const sectors = [...new Set(all.map((row) => row.sector).filter((v): v is string => Boolean(v)))].sort();
  const minYield = Number(filters.minYield ?? 0) / 100;
  const applyFilters = (rows: DividendRow[]) =>
    rows.filter((row) => {
      const query = (filters.q ?? "").toLowerCase();
      return (
        (!query || `${row.ticker} ${row.company}`.toLowerCase().includes(query)) &&
        (!filters.country || row.country === filters.country) &&
        (!filters.sector || row.sector === filters.sector) &&
        (!Number.isFinite(minYield) || minYield <= 0 || (row.yield ?? -1) >= minYield)
      );
    });
  const upcoming = applyFilters(calendar.upcoming);
  const past = applyFilters(calendar.past);
  const latestPriceDate = all.map((row) => row.priceAsOf).filter((v): v is string => Boolean(v)).sort().at(-1) ?? null;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black pb-6">
        <div>
          <p className="terminal-kicker text-brand-600">DVD / BRVM</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-black sm:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{t("subtitle")}</p>
        </div>
        <a
          href="/api/dividends/ics"
          className="border border-zinc-400 bg-white px-4 py-2 text-xs font-black uppercase text-black hover:border-brand-500 hover:bg-brand-50"
        >
          {t("exportIcs")} →
        </a>
      </div>

      <DataTrust date={latestPriceDate} locale={locale} source="BRVM" />

      <form method="get" className="grid gap-3 border border-zinc-300 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input name="q" defaultValue={filters.q} placeholder={locale === "fr" ? "Société ou symbole" : "Company or ticker"} className="border border-zinc-400 bg-zinc-50 px-3 py-2 text-sm" />
        <select name="country" defaultValue={filters.country ?? ""} className="border border-zinc-400 bg-zinc-50 px-3 py-2 text-sm">
          <option value="">{locale === "fr" ? "Tous les pays" : "All countries"}</option>
          {countries.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select name="sector" defaultValue={filters.sector ?? ""} className="border border-zinc-400 bg-zinc-50 px-3 py-2 text-sm">
          <option value="">{locale === "fr" ? "Tous les secteurs" : "All sectors"}</option>
          {sectors.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <input name="minYield" type="number" min="0" step="0.1" defaultValue={filters.minYield} placeholder={locale === "fr" ? "Rendement min. %" : "Min. yield %"} className="border border-zinc-400 bg-zinc-50 px-3 py-2 text-sm" />
        <button className="bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-brand-500 hover:text-black">{locale === "fr" ? "Filtrer" : "Filter"}</button>
      </form>

      <p className="text-xs text-zinc-500">
        {locale === "fr"
          ? "Le rendement utilise le dernier cours disponible à la date indiquée ci-dessus; il peut être trompeur pour une valeur peu liquide."
          : "Yield uses the latest available price shown above and may be misleading for an illiquid security."}
      </p>

      <section className="space-y-3">
        <h2 className="border-b-4 border-black pb-2 text-lg font-black uppercase tracking-tight text-black">{t("upcoming")}</h2>
        <DividendTable rows={upcoming} />
      </section>

      <section className="space-y-3">
        <h2 className="border-b-4 border-black pb-2 text-lg font-black uppercase tracking-tight text-black">{t("past")}</h2>
        <DividendTable rows={past} />
      </section>
    </div>
  );
}
