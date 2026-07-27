import { getLocale } from "next-intl/server";
import { getDataStatus, type DataFreshness, type MarketState } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function formatTimestamp(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Abidjan",
    timeZoneName: "short",
  }).format(new Date(value));
}

export default async function StatusPage() {
  const locale = await getLocale();
  const fr = locale === "fr";
  const status = await getDataStatus();

  const headlines: Record<DataFreshness, string> = {
    current: fr ? "Dernière clôture disponible" : "Latest close available",
    awaiting_close: fr
      ? "Clôture officielle du jour en attente"
      : "Today’s official close is pending",
    delayed: fr ? "Mise à jour du marché retardée" : "Market update delayed",
    unavailable: fr ? "Données de marché indisponibles" : "Market data unavailable",
  };
  const explanations: Record<string, string> = {
    awaiting_official_close: fr
      ? "La séance du jour n’est pas encore officiellement publiée. Les cours affichés sont ceux de la dernière clôture disponible."
      : "Today’s session has not been officially published yet. Displayed prices are from the latest available close.",
    latest_business_day_available: fr
      ? "Le marché est fermé aujourd’hui. Les cours affichés correspondent à la dernière séance ouvrée."
      : "The market is closed today. Displayed prices are from the latest business session.",
    official_source_checked: fr
      ? "La source officielle a été contrôlée et la dernière séance disponible est chargée."
      : "The official source was checked and the latest available session is loaded.",
    expected_session_available: fr
      ? "La séance attendue est chargée."
      : "The expected session is loaded.",
    expected_session_missing: fr
      ? "La séance attendue n’a pas encore été chargée. Les derniers cours connus restent datés explicitement."
      : "The expected session has not been loaded yet. The latest known prices remain explicitly dated.",
    quote_index_session_mismatch: fr
      ? "Les actions et les indices ne correspondent pas à la même séance."
      : "Equity prices and indices do not correspond to the same session.",
    missing_market_data: fr
      ? "Les cours ou les indices nécessaires ne sont pas disponibles."
      : "Required equity or index data is unavailable.",
  };
  const marketStateLabels: Record<MarketState, string> = {
    pre_close: fr ? "Avant publication de la clôture" : "Before close publication",
    post_close: fr ? "Après publication de la clôture" : "After close publication",
    weekend: fr ? "Marché fermé · week-end" : "Market closed · weekend",
  };
  const runStatus = (value: string | null) => {
    if (!value) return fr ? "Aucun" : "None";
    const labels: Record<string, string> = fr
      ? { success: "Réussie", partial: "Partielle", failed: "Échec", running: "En cours" }
      : { success: "Successful", partial: "Partial", failed: "Failed", running: "Running" };
    return labels[value] ?? value;
  };
  const runJob = (value: string | null) => {
    if (!value) return null;
    const labels: Record<string, string> = fr
      ? { daily: "quotidien", market_refresh: "marché" }
      : { daily: "daily", market_refresh: "market" };
    return labels[value] ?? value.replaceAll("_", " ");
  };
  const yesNoPending = (value: boolean | null, yes: string, no: string) =>
    value === null ? (fr ? "En attente" : "Pending") : (value ? yes : no);
  const latestMarketRun = status.latestMarketRunAt
    ? [
        formatTimestamp(status.latestMarketRunAt, locale),
        runJob(status.latestMarketRunJob),
        runStatus(status.latestMarketRunStatus),
      ].filter(Boolean).join(" · ")
    : "—";
  const latestDailyRun = status.lastDailyRunAt
    ? `${formatTimestamp(status.lastDailyRunAt, locale)} · ${runStatus(status.lastDailyRunStatus)}`
    : "—";
  const rows = [
    [fr ? "Dernière séance actions" : "Latest equity session", status.latestQuoteDate ? formatDate(status.latestQuoteDate, locale) : "—"],
    [fr ? "Dernière séance indices" : "Latest index session", status.latestIndexDate ? formatDate(status.latestIndexDate, locale) : "—"],
    [fr ? "Séance attendue" : "Expected session", status.expectedSessionDate ? formatDate(status.expectedSessionDate, locale) : "—"],
    [fr ? "Séance annoncée par la source" : "Source-reported session", status.sourceSessionDate ? formatDate(status.sourceSessionDate, locale) : "—"],
    [fr ? "État du marché" : "Market state", marketStateLabels[status.marketState]],
    [
      fr ? "Retard en séances ouvrées" : "Business sessions behind",
      status.businessDaysBehind == null ? "—" : String(status.businessDaysBehind),
    ],
    [fr ? "Couverture de la cote" : "Market coverage", `${status.quotedCompanies}/${status.activeCompanies} · ${status.coveragePct.toFixed(1)}%`],
    [fr ? "Dernier rafraîchissement marché" : "Latest market refresh", latestMarketRun],
    [fr ? "Dernier pipeline quotidien" : "Latest daily pipeline", latestDailyRun],
    [
      fr ? "Contrôles qualité" : "Quality checks",
      yesNoPending(status.qualityPassed, fr ? "Validés" : "Passed", fr ? "Échec" : "Failed"),
    ],
    [
      fr ? "Récapitulatif publié" : "Recap published",
      yesNoPending(status.recapPublished, fr ? "Oui" : "Yes", fr ? "Non" : "No"),
    ],
  ];
  const tone: Record<DataFreshness, string> = {
    current: "border-emerald-200 bg-emerald-50",
    awaiting_close: "border-sky-200 bg-sky-50",
    delayed: "border-amber-200 bg-amber-50",
    unavailable: "border-zinc-300 bg-zinc-100",
  };
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{fr ? "État des données" : "Data status"}</h1>
        <p className="mt-2 text-slate-600">{fr ? "Fraîcheur et couverture des sources utilisées par Aqlee Invest." : "Freshness and coverage of the sources used by Aqlee Invest."}</p>
      </div>
      <div className={`rounded-xl border p-5 ${tone[status.freshness]}`}>
        <p className="font-semibold text-slate-900">{headlines[status.freshness]}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {explanations[status.reason] ?? status.reason}
        </p>
      </div>
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 p-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{value}</dd></div>)}
      </dl>
      <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
        {fr
          ? `La BRVM publie des cours de clôture, pas un flux intrajournalier en temps réel. État calculé le ${formatTimestamp(status.generatedAt, locale)}.`
          : `The BRVM data shown here are closing prices, not a real-time intraday feed. Status calculated ${formatTimestamp(status.generatedAt, locale)}.`}
      </p>
    </div>
  );
}
