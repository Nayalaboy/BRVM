import { getLocale } from "next-intl/server";

export default async function MethodologyPage() {
  const locale = await getLocale();
  const fr = locale === "fr";
  const sections = fr
    ? [
        ["Cours et fraîcheur", "Les cours proviennent de la BRVM. La date affichée est celle de la dernière séance reçue, pas nécessairement la date du jour. Une valeur sans transaction peut conserver un ancien dernier cours."],
        ["Rendement du dividende", "Somme des dividendes nets détachés sur douze mois, divisée par le dernier cours disponible. À défaut, le dernier exercice connu est utilisé. Ce rendement n'est ni garanti ni prévisionnel."],
        ["Performance et fourchette", "La performance YTD compare le dernier cours au premier cours disponible de l'année. Les plus hauts et plus bas utilisent les clôtures des 365 derniers jours."],
        ["Liquidité", "La liquidité correspond à la moyenne sur les 20 dernières séances du volume ou de la valeur échangée disponible. Elle ne garantit pas qu'un ordre puisse être exécuté au dernier cours."],
        ["Récap vérifié", "Un récap n'est publié que si les contrôles de prix et de couverture passent et si un Bulletin Officiel de la Cote de la même séance est archivé."],
        ["Corrections", "Les collectes sont idempotentes et peuvent corriger une ligne existante. La source officielle prévaut sur les données de démarrage et les recoupements secondaires."],
      ]
    : [
        ["Prices and freshness", "Prices come from the BRVM. The displayed date is the latest session received, not necessarily today. An untraded security may retain an older last price."],
        ["Dividend yield", "Net dividends detached over twelve months divided by the latest available price. The latest known fiscal year is used as a fallback. Yield is neither guaranteed nor forecast."],
        ["Performance and range", "YTD return compares the latest price with the first available price of the year. Highs and lows use closing prices from the past 365 days."],
        ["Liquidity", "Liquidity is the available average volume or traded value over the latest 20 sessions. It does not guarantee execution at the last price."],
        ["Verified recap", "A recap is published only when price and market-coverage checks pass and a same-session Official Price Bulletin is archived."],
        ["Corrections", "Collection is idempotent and may correct an existing row. Official sources take precedence over seed data and secondary cross-checks."],
      ];
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div><h1 className="text-3xl font-bold text-slate-900">{fr ? "Méthodologie" : "Methodology"}</h1>
        <p className="mt-2 text-slate-600">{fr ? "Comment les indicateurs sont calculés, vérifiés et présentés." : "How indicators are calculated, verified, and presented."}</p></div>
      <div className="space-y-4">{sections.map(([title, body]) => (
        <section key={title} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
        </section>
      ))}</div>
    </div>
  );
}
