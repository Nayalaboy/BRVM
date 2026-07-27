"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CompanyRow, DividendRow } from "@/lib/api";
import { formatDate, formatFCFA, formatPercent } from "@/lib/format";

const STORAGE_KEY = "aqlee-watchlist";

export function WatchlistView({
  companies,
  upcoming,
  locale,
}: {
  companies: CompanyRow[];
  upcoming: DividendRow[];
  locale: string;
}) {
  const t = useTranslations("watchlist");
  // Read after mount: localStorage is unavailable during SSR.
  const [tickers, setTickers] = useState<string[] | null>(null);

  useEffect(() => {
    setTickers(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  }, []);

  function remove(ticker: string) {
    const next = (tickers ?? []).filter((value) => value !== ticker);
    setTickers(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  if (tickers === null) {
    return <div className="border border-zinc-300 bg-white p-8 text-sm text-zinc-500">…</div>;
  }

  const rows = tickers
    .map((ticker) => companies.find((c) => c.ticker === ticker))
    .filter((c): c is CompanyRow => c !== undefined);

  if (rows.length === 0) {
    return (
      <div className="border border-zinc-300 bg-white p-10 text-center">
        <p className="text-lg font-black uppercase">{t("emptyTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">{t("emptyBody")}</p>
        <Link
          href="/societes"
          className="mt-5 inline-block bg-black px-5 py-2 text-xs font-black uppercase text-white hover:bg-brand-500 hover:text-black"
        >
          {t("browse")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] font-bold uppercase text-zinc-500">
        {t("count", { count: rows.length })}
      </p>
      <div className="overflow-x-auto border border-zinc-300 bg-white shadow-[3px_3px_0_#111]">
        <table className="w-full text-xs">
          <thead className="bg-black text-left font-mono text-[10px] uppercase tracking-wide text-zinc-300">
            <tr>
              <th className="px-4 py-3 font-medium">{t("colCompany")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colLastClose")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colYield")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colYtd")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colNextDividend")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const next = upcoming.find((d) => d.ticker === c.ticker);
              return (
                <tr key={c.ticker} className="border-b border-zinc-200 last:border-0 hover:bg-brand-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={{ pathname: "/societes/[symbol]", params: { symbol: c.ticker } }}
                      className="font-mono font-black text-brand-600 hover:underline"
                    >
                      {c.ticker}
                    </Link>
                    <span className="ml-2 font-semibold text-zinc-700">{c.name}</span>
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-mono">
                    {c.lastClose !== null ? formatFCFA(c.lastClose) : "—"}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-mono font-bold">
                    {c.dividendYield !== null ? formatPercent(c.dividendYield) : "—"}
                  </td>
                  <td
                    className={`tabular px-4 py-2.5 text-right font-mono ${
                      c.ytdReturn === null ? "text-zinc-400" : c.ytdReturn >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {c.ytdReturn !== null ? formatPercent(c.ytdReturn) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {next?.exDate ? (
                      <span>
                        {formatDate(next.exDate, locale)}
                        {next.amount != null ? (
                          <span className="ml-1 font-mono text-zinc-500">· {formatFCFA(next.amount, 2)}</span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => remove(c.ticker)}
                      className="border border-zinc-300 px-2 py-1 font-mono text-[10px] font-bold uppercase text-zinc-600 hover:border-red-400 hover:text-red-600"
                    >
                      {t("remove")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
