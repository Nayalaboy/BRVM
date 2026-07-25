import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDividendCalendar, getIndices, getIntelligenceFeed, getMovers } from "@/lib/api";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { DataTrust } from "@/components/data-trust";
import {
  formatCompactFCFA,
  formatDate,
  formatFCFA,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export const dynamic = "force-dynamic";

function Move({ value }: { value: number | null }) {
  if (value == null) return <span className="text-zinc-400">—</span>;
  return (
    <span className={`tabular font-mono font-bold ${value >= 0 ? "text-emerald-700" : "text-red-600"}`}>
      {value >= 0 ? "+" : ""}{formatNumber(value, 2)}%
    </span>
  );
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const tDiv = await getTranslations("dividends");
  const locale = await getLocale();
  const [{ indices, date: indexDate }, movers, calendar, intelligence] = await Promise.all([
    getIndices(),
    getMovers(),
    getDividendCalendar(),
    getIntelligenceFeed(6),
  ]);
  const composite = indices.find((item) => item.code === "BRVM_COMPOSITE");
  const brvm30 = indices.find((item) => item.code === "BRVM_30");
  const upcoming = calendar.upcoming.slice(0, 7);
  const nav = [
    ["MKT", "/", locale === "fr" ? "Marché" : "Market"],
    ["INT", "/intelligence", locale === "fr" ? "Intelligence" : "Intelligence"],
    ["DVD", "/dividendes", tDiv("title")],
    ["EQS", "/screener", locale === "fr" ? "Screener" : "Screener"],
    ["IPO", "/operations", locale === "fr" ? "Opérations" : "Offerings"],
    ["SGI", "/verifier", locale === "fr" ? "Agrément" : "Licences"],
    ["GLO", "/lexique", locale === "fr" ? "Lexique" : "Glossary"],
  ] as const;

  return (
    <div className="space-y-8">
      <section className="market-grid -mx-4 border-b border-zinc-300 px-4 pb-7 sm:-mx-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <p className="terminal-kicker mb-3 text-brand-600">{t("heroEyebrow")}</p>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.94] tracking-[-0.045em] text-black sm:text-6xl lg:text-7xl">
              {t("heroTitle")}
            </h1>
          </div>
          <div className="border-l-4 border-brand-500 pl-4">
            <p className="text-sm leading-relaxed text-zinc-700">{t("heroSubtitle")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/screener" className="bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-brand-500 hover:text-black">
                {locale === "fr" ? "Explorer la cote" : "Explore the market"} →
              </Link>
              <Link href="/dividendes" className="border border-black bg-white px-4 py-2 text-xs font-black uppercase text-black hover:bg-zinc-100">
                {t("ctaCalendar")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-px border border-zinc-300 bg-zinc-300 sm:grid-cols-7">
        {nav.map(([code, href, label]) => (
          <Link key={code} href={href} className="group bg-white p-3 hover:bg-brand-500">
            <span className="block font-mono text-[10px] font-black text-brand-600 group-hover:text-black">{code}</span>
            <span className="mt-1 block text-xs font-bold text-zinc-800">{label}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 border-b-4 border-black pb-2">
        <h2 className="text-xl font-black uppercase tracking-tight text-black">
          {locale === "fr" ? "Tableau de marché" : "Market dashboard"}
        </h2>
        <DataTrust
          date={movers.date}
          locale={locale}
          source="BRVM"
          stale={movers.date ? Date.now() - new Date(`${movers.date}T23:59:59Z`).getTime() > 4 * 86_400_000 : true}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="terminal-panel p-5 lg:col-span-4">
          <p className="terminal-kicker text-zinc-500">BRVM COMPOSITE</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="tabular font-mono text-4xl font-black tracking-tight">
              {composite?.value != null ? formatNumber(composite.value, 2) : "—"}
            </p>
            <Move value={composite?.changePct ?? null} />
          </div>
          <div className="mt-5 grid grid-cols-2 border-t border-zinc-300 pt-3">
            <div>
              <p className="terminal-kicker text-zinc-400">BRVM 30</p>
              <p className="mt-1 font-mono text-lg font-bold">{brvm30?.value != null ? formatNumber(brvm30.value, 2) : "—"}</p>
            </div>
            <div className="border-l border-zinc-300 pl-4">
              <p className="terminal-kicker text-zinc-400">{locale === "fr" ? "Séance" : "Session"}</p>
              <p className="mt-1 text-sm font-bold">{formatDate(indexDate, locale)}</p>
            </div>
          </div>
        </div>

        <MarketList title={t("topGainers")} rows={movers.gainers} locale={locale} className="lg:col-span-4" />
        <MarketList title={t("topLosers")} rows={movers.losers} locale={locale} className="lg:col-span-4" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
        <div>
          <SectionHeader code="DVD" title={t("upcomingDividends")} href="/dividendes" more={locale === "fr" ? "Tout voir" : "View all"} />
          <div className="overflow-x-auto border-x border-b border-zinc-300 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-black text-left font-mono uppercase text-zinc-300">
                <tr>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">{locale === "fr" ? "Société" : "Company"}</th>
                  <th className="px-3 py-2 text-right">{locale === "fr" ? "Montant" : "Amount"}</th>
                  <th className="px-3 py-2 text-right">{locale === "fr" ? "Rend." : "Yield"}</th>
                  <th className="px-3 py-2 text-right">{tDiv("colExDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {upcoming.map((item) => (
                  <tr key={`${item.ticker}-${item.fiscalYear}`} className="hover:bg-brand-50">
                    <td className="px-3 py-2.5">
                      <Link href={{ pathname: "/societes/[symbol]", params: { symbol: item.ticker } }} className="font-mono font-black text-brand-600 hover:underline">
                        {item.ticker}
                      </Link>
                    </td>
                    <td className="max-w-48 truncate px-3 py-2.5 font-semibold">{item.company}</td>
                    <td className="tabular px-3 py-2.5 text-right font-mono">{item.amount == null ? "—" : formatFCFA(item.amount, 2)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-mono font-bold">{item.yield == null ? "—" : formatPercent(item.yield)}</td>
                    <td className="px-3 py-2.5 text-right">{formatDate(item.exDate, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionHeader code="ACT" title={locale === "fr" ? "Plus actifs" : "Most active"} href="/screener" more="EQS →" />
          <div className="divide-y divide-zinc-200 border-x border-b border-zinc-300 bg-white">
            {movers.mostActive.slice(0, 7).map((item, index) => (
              <div key={item.ticker} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-3 py-2.5 text-xs hover:bg-zinc-50">
                <span className="font-mono text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <Link href={{ pathname: "/societes/[symbol]", params: { symbol: item.ticker } }} className="font-mono font-black text-black hover:text-brand-600">
                    {item.ticker}
                  </Link>
                  <p className="font-mono text-[10px] text-zinc-500">{item.close == null ? "—" : formatFCFA(item.close)}</p>
                </div>
                <div className="text-right">
                  <Move value={item.changePct} />
                  <p className="font-mono text-[10px] text-zinc-500">{item.valueTraded == null ? "—" : formatCompactFCFA(item.valueTraded)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between bg-black px-3 py-2 text-white">
          <h2 className="text-sm font-black uppercase"><span className="mr-2 text-brand-400">INT</span>{locale === "fr" ? "Intelligence vérifiée" : "Verified intelligence"}</h2>
          <Link href="/intelligence" className="font-mono text-[10px] font-bold uppercase text-zinc-400 hover:text-brand-400">
            {locale === "fr" ? "Ouvrir le fil" : "Open feed"} →
          </Link>
        </div>
        <div className="grid border-x border-b border-zinc-300 bg-white md:grid-cols-2">
          {intelligence.items.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href="/intelligence"
              className="border-b border-zinc-200 p-4 last:border-b-0 hover:bg-brand-50 md:border-r md:[&:nth-child(even)]:border-r-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-black text-brand-600">{item.kind.replaceAll("_", " ").toUpperCase()}</span>
                {item.ticker ? <span className="font-mono text-[10px] font-bold text-zinc-400">{item.ticker}</span> : null}
              </div>
              <h3 className="mt-1 text-sm font-black text-black">{locale === "fr" ? item.titleFr : item.titleEn}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-600">{locale === "fr" ? item.summaryFr : item.summaryEn}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-t-4 border-black pt-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="terminal-kicker text-brand-600">BRVM BRIEF</p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-none">
            {locale === "fr" ? "L’essentiel, sans le bruit." : "The signal, without the noise."}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {(await getTranslations("newsletter"))("body")}
          </p>
        </div>
        <div className="terminal-panel p-5">
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  code,
  title,
  href,
  more,
}: {
  code: string;
  title: string;
  href: "/dividendes" | "/screener";
  more: string;
}) {
  return (
    <div className="flex items-center justify-between bg-black px-3 py-2 text-white">
      <h2 className="text-sm font-black uppercase"><span className="mr-2 text-brand-400">{code}</span>{title}</h2>
      <Link href={href} className="font-mono text-[10px] font-bold uppercase text-zinc-400 hover:text-brand-400">{more}</Link>
    </div>
  );
}

function MarketList({
  title,
  rows,
  locale,
  className,
}: {
  title: string;
  rows: { ticker: string; close: number | null; changePct: number; valueTraded: number | null }[];
  locale: string;
  className?: string;
}) {
  return (
    <div className={`terminal-panel ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-zinc-300 bg-zinc-100 px-3 py-2">
        <p className="terminal-kicker text-black">{title}</p>
        <span className="font-mono text-[9px] uppercase text-zinc-400">{locale === "fr" ? "Variation séance" : "Session change"}</span>
      </div>
      <div className="divide-y divide-zinc-200">
        {rows.slice(0, 5).map((item) => (
          <div key={item.ticker} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-xs hover:bg-brand-50">
            <Link href={{ pathname: "/societes/[symbol]", params: { symbol: item.ticker } }} className="font-mono font-black text-black hover:text-brand-600">
              {item.ticker}
            </Link>
            <span className="tabular font-mono text-zinc-600">{item.close == null ? "—" : formatNumber(item.close, 0)}</span>
            <Move value={item.changePct} />
          </div>
        ))}
      </div>
    </div>
  );
}
