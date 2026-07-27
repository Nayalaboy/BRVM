import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCompanies, getMarketEvents } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; ticker?: string }>;
}) {
  const locale = await getLocale();
  const fr = locale === "fr";
  const filters = await searchParams;
  const [events, companies] = await Promise.all([
    getMarketEvents({ country: filters.country, ticker: filters.ticker }),
    getCompanies(),
  ]);

  return (
    <div className="space-y-7">
      <header className="border-b-4 border-black pb-6">
        <p className="terminal-kicker text-brand-600">GOV / UEMOA</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-6xl">
          {fr ? "Décisions publiques" : "Public decisions"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600">
          {fr
            ? "Communiqués gouvernementaux et décisions de marché officiellement publiés, relus et reliés aux sociétés concernées. Faits passés uniquement — aucune prévision d’impact."
            : "Officially published government releases and market decisions, reviewed and linked to affected companies. Past facts only—no impact predictions."}
        </p>
      </header>

      <form className="grid gap-3 border border-zinc-300 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
        <select name="country" defaultValue={filters.country ?? ""} className="border border-zinc-300 px-3 py-2 text-sm">
          <option value="">{fr ? "Tous les pays" : "All countries"}</option>
          <option value="CI">Côte d&apos;Ivoire</option>
          <option value="SN">Sénégal</option>
          <option value="BJ">Bénin</option>
          <option value="BF">Burkina Faso</option>
          <option value="GW">Guinée-Bissau</option>
          <option value="ML">Mali</option>
          <option value="NE">Niger</option>
          <option value="TG">Togo</option>
        </select>
        <select name="ticker" defaultValue={filters.ticker ?? ""} className="border border-zinc-300 px-3 py-2 text-sm">
          <option value="">{fr ? "Toutes les sociétés" : "All companies"}</option>
          {companies.map((company) => (
            <option key={company.ticker} value={company.ticker}>{company.ticker} — {company.name}</option>
          ))}
        </select>
        <button className="bg-black px-5 py-2 text-xs font-black uppercase text-white hover:bg-brand-500 hover:text-black">
          {fr ? "Filtrer" : "Filter"}
        </button>
      </form>

      {events.length === 0 ? (
        <p className="border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
          {fr ? "Aucun événement relu pour ces filtres." : "No reviewed event matches these filters."}
        </p>
      ) : (
        <div className="divide-y divide-zinc-300 border-y border-zinc-300">
          {events.map((event) => (
            <article key={event.id} className="grid gap-4 py-5 md:grid-cols-[150px_1fr]">
              <div className="font-mono text-xs uppercase text-zinc-500">
                <p className="font-bold text-black">{formatDate(event.date, locale)}</p>
                <p>{event.country ?? "UEMOA"} · {event.body}</p>
                <p className="mt-1 text-brand-700">{event.eventType.replaceAll("_", " ")}</p>
              </div>
              <div>
                <p className="font-semibold leading-relaxed text-black">
                  {locale === "en" && event.summaryEn ? event.summaryEn : event.summaryFr}
                </p>
                {event.tickers.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.tickers.map((ticker) => (
                      <Link key={ticker} href={{ pathname: "/societes/[symbol]", params: { symbol: ticker } }} className="bg-zinc-100 px-2 py-1 font-mono text-xs font-bold hover:bg-brand-500">
                        {ticker}
                      </Link>
                    ))}
                  </div>
                ) : null}
                <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-brand-700 underline">
                  {fr ? "Source officielle" : "Official source"} · {event.documentRef}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
