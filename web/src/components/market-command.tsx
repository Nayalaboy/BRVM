"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const DESTINATIONS = [
  { code: "MKT", fr: "Vue marché", en: "Market overview", href: "/" },
  { code: "INT", fr: "Intelligence vérifiée", en: "Verified intelligence", href: "/intelligence" },
  { code: "DVD", fr: "Calendrier dividendes", en: "Dividend calendar", href: "/dividendes" },
  { code: "EQS", fr: "Screener actions", en: "Equity screener", href: "/screener" },
  { code: "SEC", fr: "Sociétés cotées", en: "Listed companies", href: "/societes" },
  { code: "IPO", fr: "Marché primaire", en: "Primary market", href: "/operations" },
  { code: "SGI", fr: "Vérifier un agrément", en: "Verify a licence", href: "/verifier" },
] as const;

export interface CommandCompany {
  ticker: string;
  name: string;
}

export function MarketCommand({ companies = [] }: { companies?: CommandCompany[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const locale = useLocale();
  const router = useRouter();
  const q = query.trim().toLowerCase();
  const filtered = DESTINATIONS.filter((item) =>
    `${item.code} ${item.fr} ${item.en}`.toLowerCase().includes(q),
  );
  // Ticker prefix matches first (terminal habit: type "SG" → SGBC), then names.
  const matchedCompanies = q
    ? [
        ...companies.filter((c) => c.ticker.toLowerCase().startsWith(q)),
        ...companies.filter(
          (c) => !c.ticker.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q),
        ),
      ].slice(0, 8)
    : [];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  function go(href: (typeof DESTINATIONS)[number]["href"]) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function goCompany(ticker: string) {
    setOpen(false);
    setQuery("");
    router.push({ pathname: "/societes/[symbol]", params: { symbol: ticker } });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-56 items-center justify-between border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-left text-xs text-zinc-300 hover:border-brand-400 lg:flex"
      >
        <span>{locale === "fr" ? "Rechercher une fonction" : "Search functions"}</span>
        <kbd className="border border-zinc-600 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={locale === "fr" ? "Navigation rapide" : "Quick navigation"}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-xl border-2 border-brand-500 bg-black shadow-2xl">
            <div className="flex items-center border-b border-zinc-700">
              <span className="bg-brand-500 px-3 py-3 font-mono text-xs font-black text-black">GO</span>
              <input
                ref={input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  if (matchedCompanies[0]) goCompany(matchedCompanies[0].ticker);
                  else if (filtered[0]) go(filtered[0].href);
                }}
                placeholder={locale === "fr" ? "Ticker, société ou fonction…" : "Ticker, company or function…"}
                className="w-full bg-black px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {matchedCompanies.length > 0 ? (
                <li className="px-3 pb-1 pt-2 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {locale === "fr" ? "Sociétés" : "Companies"}
                </li>
              ) : null}
              {matchedCompanies.map((company) => (
                <li key={company.ticker}>
                  <button
                    type="button"
                    onClick={() => goCompany(company.ticker)}
                    className="group flex w-full items-center gap-4 px-3 py-3 text-left text-sm text-zinc-200 hover:bg-brand-500 hover:text-black"
                  >
                    <span className="w-14 font-mono font-black text-brand-400 group-hover:text-black">{company.ticker}</span>
                    <span className="truncate">{company.name}</span>
                  </button>
                </li>
              ))}
              {matchedCompanies.length > 0 && filtered.length > 0 ? (
                <li className="px-3 pb-1 pt-2 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {locale === "fr" ? "Fonctions" : "Functions"}
                </li>
              ) : null}
              {filtered.map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    onClick={() => go(item.href)}
                    className="flex w-full items-center gap-4 px-3 py-3 text-left text-sm text-zinc-200 hover:bg-brand-500 hover:text-black"
                  >
                    <span className="w-14 font-mono font-black">{item.code}</span>
                    <span>{locale === "fr" ? item.fr : item.en}</span>
                  </button>
                </li>
              ))}
              {matchedCompanies.length === 0 && filtered.length === 0 ? (
                <li className="px-3 py-4 text-sm text-zinc-500">
                  {locale === "fr" ? "Aucun résultat." : "No results."}
                </li>
              ) : null}
            </ul>
            <p className="border-t border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
              ↑↓ {locale === "fr" ? "naviguer" : "navigate"} · Enter {locale === "fr" ? "ouvrir" : "open"} · Esc {locale === "fr" ? "fermer" : "close"}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
