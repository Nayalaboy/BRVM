"use client";

import { useEffect, useState } from "react";

const KEY = "aqlee-watchlist";

export function WatchlistButton({ ticker, locale }: { ticker: string; locale: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const values = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    setSaved(values.includes(ticker));
  }, [ticker]);

  function toggle() {
    const values = new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
    if (values.has(ticker)) values.delete(ticker);
    else values.add(ticker);
    localStorage.setItem(KEY, JSON.stringify([...values]));
    setSaved(values.has(ticker));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className="border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
    >
      {saved ? "★" : "☆"}{" "}
      {locale === "fr"
        ? saved ? "Dans ma liste" : "Ajouter à ma liste"
        : saved ? "On my watchlist" : "Add to watchlist"}
    </button>
  );
}
