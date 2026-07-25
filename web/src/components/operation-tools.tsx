"use client";

import { useMemo, useState } from "react";

export function OperationTools({
  price,
  minimum,
  closeDate,
  locale,
}: {
  price: number | null;
  minimum: number | null;
  closeDate: string | null;
  locale: string;
}) {
  const [budget, setBudget] = useState(minimum ?? price ?? 0);
  const shares = price && budget >= 0 ? Math.floor(budget / price) : null;
  const days = useMemo(() => {
    if (!closeDate) return null;
    return Math.ceil((new Date(`${closeDate}T23:59:59Z`).getTime() - Date.now()) / 86_400_000);
  }, [closeDate]);

  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
      {days != null ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {locale === "fr" ? "Échéance" : "Deadline"}
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {days > 0
              ? locale === "fr" ? `${days} jour(s) restant(s)` : `${days} day(s) remaining`
              : locale === "fr" ? "Souscription clôturée" : "Subscription closed"}
          </p>
        </div>
      ) : null}
      {price ? (
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {locale === "fr" ? "Simuler un budget (FCFA)" : "Simulate a budget (FCFA)"}
          <input
            type="number"
            min={minimum ?? price}
            step={price}
            value={budget}
            onChange={(event) => setBudget(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          />
          <span className="mt-1 block normal-case text-slate-600">
            {shares != null
              ? locale === "fr" ? `Environ ${shares} titre(s), hors frais.` : `About ${shares} security(ies), excluding fees.`
              : "—"}
          </span>
        </label>
      ) : null}
    </div>
  );
}
