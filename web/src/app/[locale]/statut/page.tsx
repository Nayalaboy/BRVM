import { getLocale } from "next-intl/server";
import { getDataStatus } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const locale = await getLocale();
  const fr = locale === "fr";
  const status = await getDataStatus();
  const rows = [
    [fr ? "Dernière séance actions" : "Latest equity session", status.latestQuoteDate ? formatDate(status.latestQuoteDate, locale) : "—"],
    [fr ? "Dernière séance indices" : "Latest index session", status.latestIndexDate ? formatDate(status.latestIndexDate, locale) : "—"],
    [fr ? "Couverture de la cote" : "Market coverage", `${status.quotedCompanies}/${status.activeCompanies} · ${status.coveragePct.toFixed(1)}%`],
    [fr ? "Dernier succès du pipeline" : "Last successful pipeline run", status.lastSuccessfulRun ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.lastSuccessfulRun)) : "—"],
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{fr ? "État des données" : "Data status"}</h1>
        <p className="mt-2 text-slate-600">{fr ? "Fraîcheur et couverture des sources utilisées par Aqlee Invest." : "Freshness and coverage of the sources used by Aqlee Invest."}</p>
      </div>
      <div className={`rounded-xl border p-5 ${status.status === "healthy" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <p className="font-semibold text-slate-900">{status.status === "healthy" ? (fr ? "Données opérationnelles" : "Data operational") : (fr ? "Couverture dégradée" : "Degraded coverage")}</p>
      </div>
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 p-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{value}</dd></div>)}
      </dl>
    </div>
  );
}
