import { getLocale } from "next-intl/server";
import { getIndices, getMovers } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

export async function MarketTicker() {
  const locale = await getLocale();
  const [{ indices, date: indexDate }, movers] = await Promise.all([getIndices(), getMovers()]);
  const sessionDate = movers.date ?? indexDate;
  const items = [
    ...indices.slice(0, 4).map((item) => ({
      code: item.code.replaceAll("_", " "),
      value: item.value,
      change: item.changePct,
    })),
    ...movers.mostActive.slice(0, 5).map((item) => ({
      code: item.ticker,
      value: item.close,
      change: item.changePct,
    })),
  ];
  const tapeItems = [...items, ...items];
  return (
    <div className="border-b border-white/10 bg-[var(--ink)] text-white">
      <div className="mx-auto flex max-w-[1440px]">
        <div className="z-10 flex shrink-0 items-center gap-2 whitespace-nowrap bg-brand-500 px-3 font-mono text-[10px] font-bold uppercase text-[var(--ink)] shadow-[8px_0_16px_rgba(0,0,0,0.45)]">
          <span className="live-pulse" aria-hidden />
          <span>{locale === "fr" ? "BRVM · DERNIÈRE CLÔTURE" : "BRVM · LAST CLOSE"}</span>
          {sessionDate ? (
            <span className="border-l border-black/25 pl-2 font-semibold">
              {formatDate(sessionDate, locale)}
            </span>
          ) : null}
        </div>
        <div
          className="market-tape min-w-0 flex-1"
          role="region"
          aria-label={locale === "fr" ? "Derniers cours de clôture BRVM" : "Latest BRVM closing prices"}
          tabIndex={0}
        >
          <div className="market-tape-track">
            {tapeItems.map((item, index) => (
              <div
                key={`${index < items.length ? "a" : "b"}-${item.code}`}
                className="flex shrink-0 items-center gap-2 border-r border-white/10 px-5 py-2 font-mono text-[11px]"
                aria-hidden={index >= items.length}
              >
                <span className="font-semibold text-zinc-300">{item.code}</span>
                <span>{item.value == null ? "—" : formatNumber(item.value, 2)}</span>
                <span className={(item.change ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {item.change == null ? "—" : `${item.change >= 0 ? "+" : ""}${formatNumber(item.change, 2)}%`}
                  <span className="ml-1" aria-hidden>{(item.change ?? 0) >= 0 ? "▲" : "▼"}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
