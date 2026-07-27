import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getDataStatus,
  getDividendCalendar,
  getIndices,
  getIntelligenceFeed,
  getMovers,
} from "@/lib/api";
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
    <span className={`tabular font-mono font-semibold ${value >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
      {value >= 0 ? "+" : ""}{formatNumber(value, 2)}%
    </span>
  );
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const tDiv = await getTranslations("dividends");
  const locale = await getLocale();
  const [{ indices, date: indexDate }, movers, calendar, intelligence, dataStatus] = await Promise.all([
    getIndices(),
    getMovers(),
    getDividendCalendar(),
    getIntelligenceFeed(6),
    getDataStatus(),
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
      <section className="market-grid -mx-4 border-b border-[var(--rule)] px-4 pb-8 sm:-mx-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div className="reveal">
            <p className="terminal-kicker mb-3 text-brand-700">{t("heroEyebrow")}</p>
            <h1 className="max-w-4xl text-4xl font-bold uppercase leading-[0.96] tracking-[-0.04em] text-[var(--ink)] sm:text-6xl lg:text-7xl">
              {t("heroTitle")}
            </h1>
          </div>
          <div className="reveal-delay border-l-2 border-brand-500 pl-4">
            <p className="text-sm leading-relaxed text-slate-600">{t("heroSubtitle")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/screener" className="bg-[var(--ink)] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-brand-600">
                {locale === "fr" ? "Explorer la cote" : "Explore the market"} →
              </Link>
              <Link href="/dividendes" className="border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)] transition hover:border-brand-500 hover:text-brand-800">
                {t("ctaCalendar")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-7">
        {nav.map(([code, href, label]) => (
          <Link key={code} href={href} className="group bg-white p-3 transition hover:bg-brand-50">
            <span className="block font-mono text-[10px] font-bold text-brand-700 group-hover:text-brand-800">{code}</span>
            <span className="mt-1 block text-xs font-semibold text-slate-700">{label}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 border-b-2 border-[var(--ink)] pb-2">
        <h2 className="text-xl font-bold uppercase tracking-tight text-[var(--ink)]">
          {locale === "fr" ? "Tableau de marché" : "Market dashboard"}
        </h2>
        <DataTrust
          date={dataStatus.latestQuoteDate ?? movers.date}
          locale={locale}
          source="BRVM"
          freshness={dataStatus.freshness}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="terminal-panel p-5 lg:col-span-4">
          <p className="terminal-kicker text-slate-500">BRVM COMPOSITE</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="tabular font-mono text-4xl font-bold tracking-tight text-[var(--ink)]">
              {composite?.value != null ? formatNumber(composite.value, 2) : "—"}
            </p>
            <Move value={composite?.changePct ?? null} />
          </div>
          <div className="mt-5 grid grid-cols-2 border-t border-[var(--rule)] pt-3">
            <div>
              <p className="terminal-kicker text-slate-400">BRVM 30</p>
              <p className="mt-1 font-mono text-lg font-semibold">{brvm30?.value != null ? formatNumber(brvm30.value, 2) : "—"}</p>
            </div>
            <div className="border-l border-[var(--rule)] pl-4">
              <p className="terminal-kicker text-slate-400">{locale === "fr" ? "Séance" : "Session"}</p>
              <p className="mt-1 text-sm font-semibold">{formatDate(indexDate, locale)}</p>
            </div>
          </div>
        </div>

        <MarketList title={t("topGainers")} rows={movers.gainers} locale={locale} className="lg:col-span-4" />
        <MarketList title={t("topLosers")} rows={movers.losers} locale={locale} className="lg:col-span-4" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
        <div>
          <SectionHeader code="DVD" title={t("upcomingDividends")} href="/dividendes" more={locale === "fr" ? "Tout voir" : "View all"} />
          <div className="overflow-x-auto border-x border-b border-[var(--rule)] bg-white">
            <table className="w-full text-xs">
              <thead className="bg-[var(--ink)] text-left font-mono uppercase text-zinc-300">
                <tr>
                  <th className="px-3 py-2.5">Ticker</th>
                  <th className="px-3 py-2.5">{locale === "fr" ? "Société" : "Company"}</th>
                  <th className="px-3 py-2.5 text-right">{locale === "fr" ? "Montant" : "Amount"}</th>
                  <th className="px-3 py-2.5 text-right">{locale === "fr" ? "Rend." : "Yield"}</th>
                  <th className="px-3 py-2.5 text-right">{tDiv("colExDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcoming.map((item) => (
                  <tr key={`${item.ticker}-${item.fiscalYear}`} className="transition hover:bg-brand-50/70">
                    <td className="px-3 py-2.5">
                      <Link href={{ pathname: "/societes/[symbol]", params: { symbol: item.ticker } }} className="font-mono font-bold text-brand-700 hover:underline">
                        {item.ticker}
                      </Link>
                    </td>
                    <td className="max-w-48 truncate px-3 py-2.5 font-medium text-slate-800">{item.company}</td>
                    <td className="tabular px-3 py-2.5 text-right font-mono">{item.amount == null ? "—" : formatFCFA(item.amount, 2)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-mono font-semibold">{item.yield == null ? "—" : formatPercent(item.yield)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{formatDate(item.exDate, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionHeader code="ACT" title={locale === "fr" ? "Plus actifs" : "Most active"} href="/screener" more="EQS →" />
          <div className="divide-y divide-slate-100 border-x border-b border-[var(--rule)] bg-white">
            {movers.mostActive.slice(0, 7).map((item, index) => (
              <div key={item.ticker} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-3 py-2.5 text-xs transition hover:bg-slate-50">
                <span className="font-mono text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <Link href={{ pathname: "/societes/[symbol]", params: { symbol: item.ticker } }} className="font-mono font-bold text-[var(--ink)] hover:text-brand-700">
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
        <div className="flex items-center justify-between bg-[var(--ink)] px-3 py-2.5 text-white">
          <h2 className="text-sm font-bold uppercase tracking-wide"><span className="mr-2 text-brand-400">INT</span>{locale === "fr" ? "Intelligence vérifiée" : "Verified intelligence"}</h2>
          <Link href="/intelligence" className="font-mono text-[10px] font-semibold uppercase text-zinc-400 transition hover:text-brand-300">
            {locale === "fr" ? "Ouvrir le fil" : "Open feed"} →
          </Link>
        </div>
        <div className="grid border-x border-b border-[var(--rule)] bg-white md:grid-cols-2">
          {intelligence.items.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href="/intelligence"
              className="border-b border-slate-100 p-4 last:border-b-0 transition hover:bg-brand-50/60 md:border-r md:[&:nth-child(even)]:border-r-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-brand-700">{item.kind.replaceAll("_", " ").toUpperCase()}</span>
                {item.ticker ? <span className="font-mono text-[10px] font-semibold text-zinc-400">{item.ticker}</span> : null}
              </div>
              <h3 className="mt-1 text-sm font-bold text-[var(--ink)]">{locale === "fr" ? item.titleFr : item.titleEn}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{locale === "fr" ? item.summaryFr : item.summaryEn}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-t-2 border-[var(--ink)] pt-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="terminal-kicker text-brand-700">BRVM BRIEF</p>
          <h2 className="mt-2 text-3xl font-bold uppercase leading-none tracking-tight text-[var(--ink)]">
            {locale === "fr" ? "L’essentiel, sans le bruit." : "The signal, without the noise."}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
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
    <div className="flex items-center justify-between bg-[var(--ink)] px-3 py-2.5 text-white">
      <h2 className="text-sm font-bold uppercase tracking-wide"><span className="mr-2 text-brand-400">{code}</span>{title}</h2>
      <Link href={href} className="font-mono text-[10px] font-semibold uppercase text-zinc-400 transition hover:text-brand-300">{more}</Link>
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
      <div className="flex items-center justify-between border-b border-[var(--rule)] bg-slate-50 px-3 py-2">
        <p className="terminal-kicker text-[var(--ink)]">{title}</p>
        <span className="font-mono text-[9px] uppercase text-zinc-400">{locale === "fr" ? "Variation séance" : "Session change"}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.slice(0, 5).map((item) => (
          <div key={item.ticker} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-xs transition hover:bg-brand-50/70">
            <Link href={{ pathname: "/societes/[symbol]", params: { symbol: item.ticker } }} className="font-mono font-bold text-[var(--ink)] hover:text-brand-700">
              {item.ticker}
            </Link>
            <span className="tabular font-mono text-slate-600">{item.close == null ? "—" : formatNumber(item.close, 0)}</span>
            <Move value={item.changePct} />
          </div>
        ))}
      </div>
    </div>
  );
}
