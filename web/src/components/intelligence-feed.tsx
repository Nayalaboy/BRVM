"use client";

import { useMemo, useState } from "react";
import type { IntelligenceItem, IntelligenceKind } from "@/lib/api";
import { formatDate } from "@/lib/format";

const KIND_CODES: Record<IntelligenceKind, string> = {
  market_move: "MOV",
  unusual_volume: "VOL",
  dividend: "DVD",
  operation: "IPO",
  official_document: "DOC",
};

export function IntelligenceFeedView({
  items,
  locale,
}: {
  items: IntelligenceItem[];
  locale: string;
}) {
  const [kind, setKind] = useState<IntelligenceKind | "all">("all");
  const [shown, setShown] = useState(20);
  const [followedOnly, setFollowedOnly] = useState(false);
  const [followed, setFollowed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem("aqlee-watchlist") ?? "[]") as string[];
  });
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (kind === "all" || item.kind === kind) &&
          (!followedOnly || (item.ticker != null && followed.includes(item.ticker))),
      ),
    [items, kind, followedOnly, followed],
  );

  function toggleTicker(ticker: string) {
    const next = followed.includes(ticker)
      ? followed.filter((value) => value !== ticker)
      : [...followed, ticker];
    setFollowed(next);
    localStorage.setItem("aqlee-watchlist", JSON.stringify(next));
  }

  async function share(item: IntelligenceItem) {
    const title = locale === "fr" ? item.titleFr : item.titleEn;
    const text = locale === "fr" ? item.summaryFr : item.summaryEn;
    const payload = `${title}\n${text}\nSource: ${item.source}${item.sourceUrl ? `\n${item.sourceUrl}` : ""}`;
    if (navigator.share) {
      await navigator.share({ title, text: payload, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(payload);
    }
  }

  const filters: [IntelligenceKind | "all", string][] = [
    ["all", locale === "fr" ? "Tout" : "All"],
    ["market_move", locale === "fr" ? "Marché" : "Market"],
    ["unusual_volume", "Volume"],
    ["dividend", locale === "fr" ? "Dividendes" : "Dividends"],
    ["operation", locale === "fr" ? "Opérations" : "Offerings"],
    ["official_document", "Documents"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border border-zinc-300 bg-white p-3">
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`px-3 py-1.5 font-mono text-[10px] font-black uppercase ${
              kind === value ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-zinc-600">
          <input type="checkbox" checked={followedOnly} onChange={(event) => setFollowedOnly(event.target.checked)} />
          {locale === "fr" ? "Ma liste uniquement" : "My watchlist only"}
        </label>
      </div>

      <div className="border-x border-t border-zinc-300 bg-white">
        {visible.slice(0, shown).map((item) => {
          const isFollowed = item.ticker ? followed.includes(item.ticker) : false;
          return (
            <article
              id={item.id}
              key={item.id}
              className={`grid gap-3 border-b border-zinc-300 p-4 hover:bg-brand-50 sm:grid-cols-[72px_1fr_auto] ${
                item.importance === "important" ? "border-l-4 border-l-brand-500" : ""
              }`}
            >
              <div>
                <span className="inline-block bg-black px-2 py-1 font-mono text-[10px] font-black text-brand-400">
                  {KIND_CODES[item.kind]}
                </span>
                <p className="mt-2 font-mono text-[10px] text-zinc-500">{formatDate(item.date, locale)}</p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.ticker ? <span className="font-mono text-xs font-black text-brand-600">{item.ticker}</span> : null}
                  <h2 className="font-black text-zinc-950">{locale === "fr" ? item.titleFr : item.titleEn}</h2>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  {locale === "fr" ? item.summaryFr : item.summaryEn}
                </p>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-mono text-[10px] font-bold uppercase text-zinc-500 hover:text-brand-600">
                    Source · {item.source} ↗
                  </a>
                ) : (
                  <span className="mt-2 inline-block font-mono text-[10px] uppercase text-zinc-400">Source · {item.source}</span>
                )}
              </div>
              <div className="flex items-start gap-2">
                {item.ticker ? (
                  <button type="button" onClick={() => toggleTicker(item.ticker!)} className="border border-zinc-300 px-2 py-1 text-xs font-bold hover:border-brand-500" aria-pressed={isFollowed}>
                    {isFollowed ? "★" : "☆"}
                  </button>
                ) : null}
                <button type="button" onClick={() => void share(item)} className="border border-zinc-300 px-2 py-1 font-mono text-[10px] font-bold uppercase hover:border-brand-500">
                  {locale === "fr" ? "Partager" : "Share"}
                </button>
              </div>
            </article>
          );
        })}
        {visible.length === 0 ? (
          <p className="border-b border-zinc-300 p-8 text-center text-sm text-zinc-500">
            {locale === "fr" ? "Aucun signal pour ce filtre." : "No signals match this filter."}
          </p>
        ) : null}
      </div>
      {visible.length > shown ? (
        <button
          type="button"
          onClick={() => setShown((value) => value + 20)}
          className="w-full border border-zinc-300 bg-white px-4 py-3 font-mono text-[10px] font-black uppercase hover:border-brand-500 hover:bg-brand-50"
        >
          {locale === "fr" ? `Afficher 20 signaux de plus (${visible.length - shown} restants)` : `Show 20 more signals (${visible.length - shown} remaining)`}
        </button>
      ) : null}
    </div>
  );
}
