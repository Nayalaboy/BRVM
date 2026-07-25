import { getLocale } from "next-intl/server";
import { getIntelligenceFeed } from "@/lib/api";
import { DataTrust } from "@/components/data-trust";
import { IntelligenceFeedView } from "@/components/intelligence-feed";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const locale = await getLocale();
  const feed = await getIntelligenceFeed();
  const fr = locale === "fr";
  return (
    <div className="space-y-6">
      <header className="market-grid border-b-4 border-black pb-6">
        <p className="terminal-kicker text-brand-600">INT / BRVM</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black sm:text-6xl">
              {fr ? "Intelligence vérifiée" : "Verified intelligence"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
              {fr
                ? "Mouvements, volumes, dividendes, opérations et documents officiels — observés, résumés et reliés à leur source. Aucun signal d’achat ou de vente."
                : "Moves, volumes, dividends, offerings and official documents—observed, summarized and linked to their source. No buy or sell signals."}
            </p>
          </div>
          <DataTrust date={feed.asOf} locale={locale} source="BRVM" />
        </div>
      </header>
      <IntelligenceFeedView items={feed.items} locale={locale} />
      <p className="border-t border-zinc-300 pt-4 text-xs text-zinc-500">
        {fr
          ? "Méthode : événements observables uniquement. Les causes ne sont jamais déduites sans document officiel."
          : "Method: observable events only. Causes are never inferred without an official document."}
      </p>
    </div>
  );
}
