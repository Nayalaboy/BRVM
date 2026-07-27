"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CompanyRow } from "@/lib/api";
import { formatFCFA, formatPercent } from "@/lib/format";

type SortKey = "yield" | "lastClose" | "ytd" | "ticker";

export function ScreenerTable({ companies }: { companies: CompanyRow[] }) {
  const t = useTranslations("screener");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("");
  const [query, setQuery] = useState("");
  const [minYield, setMinYield] = useState("");
  const [sort, setSort] = useState<SortKey>("yield");

  const sectors = useMemo(
    () => [...new Set(companies.map((c) => c.sector).filter(Boolean))].sort() as string[],
    [companies],
  );
  const countries = useMemo(
    () => [...new Set(companies.map((c) => c.country).filter(Boolean))].sort() as string[],
    [companies],
  );

  const rows = useMemo(() => {
    const minY = parseFloat(minYield) / 100;
    const filtered = companies.filter((c) => {
      if (query && !`${c.ticker} ${c.name}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (sector && c.sector !== sector) return false;
      if (country && c.country !== country) return false;
      if (!Number.isNaN(minY) && (c.dividendYield ?? 0) < minY) return false;
      return true;
    });
    const val = (c: CompanyRow) =>
      sort === "yield" ? (c.dividendYield ?? -1)
      : sort === "lastClose" ? (c.lastClose ?? -1)
      : sort === "ytd" ? (c.ytdReturn ?? -Infinity)
      : 0;
    return sort === "ticker"
      ? [...filtered].sort((a, b) => a.ticker.localeCompare(b.ticker))
      : [...filtered].sort((a, b) => val(b) - val(a));
  }, [companies, query, sector, country, minYield, sort]);

  return (
    <div className="space-y-4">
      <div className="grid items-end gap-3 border border-zinc-300 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
          Ticker / {t("colSymbol")}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SGBC, Orange…"
            className="border border-zinc-400 bg-zinc-50 px-3 py-2 font-mono text-xs text-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          {t("filterSector")}
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="border border-zinc-400 bg-zinc-50 px-3 py-2 text-xs text-black"
          >
            <option value="">{t("allSectors")}</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
          Pays / Country
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="border border-zinc-400 bg-zinc-50 px-3 py-2 text-xs text-black">
            <option value="">—</option>
            {countries.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          {t("filterMinYield")}
          <input
            type="number"
            min={0}
            step={0.5}
            value={minYield}
            onChange={(e) => setMinYield(e.target.value)}
            placeholder="0"
            className="w-full border border-zinc-400 bg-zinc-50 px-3 py-2 font-mono text-xs text-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          {t("sortBy")}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="border border-zinc-400 bg-zinc-50 px-3 py-2 text-xs text-black"
          >
            <option value="yield">{t("sortYield")}</option>
            <option value="lastClose">{t("sortPrice")}</option>
            <option value="ytd">{t("sortYtd")}</option>
            <option value="ticker">{t("sortTicker")}</option>
          </select>
        </label>
        <p className="sm:col-span-2 lg:col-span-5 font-mono text-[10px] font-bold uppercase text-zinc-500">
          {t("count", { count: rows.length })} · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="overflow-x-auto border border-zinc-300 bg-white shadow-[3px_3px_0_#111]">
        <table className="w-full text-xs">
          <thead className="bg-black text-zinc-300">
            <tr className="text-left font-mono text-[10px] uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">{t("colSymbol")}</th>
              <th className="px-4 py-3 font-medium">{t("colSector")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colLastClose")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colYield")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colYtd")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
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
                <td className="px-4 py-3 text-slate-600">{c.sector}</td>
                <td className="tabular px-4 py-3 text-right text-slate-900">
                  {c.lastClose !== null ? formatFCFA(c.lastClose) : "—"}
                </td>
                <td className="tabular px-4 py-3 text-right font-semibold text-slate-900">
                  {c.dividendYield !== null ? formatPercent(c.dividendYield) : "—"}
                </td>
                <td
                  className={`tabular px-4 py-3 text-right ${
                    (c.ytdReturn ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {c.ytdReturn !== null ? formatPercent(c.ytdReturn) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
