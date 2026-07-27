import { formatDate } from "@/lib/format";
import type { DataFreshness } from "@/lib/api";

export function DataTrust({
  date,
  locale,
  source = "BRVM",
  sourceUrl,
  freshness,
}: {
  date: string | null;
  locale: string;
  source?: string | null;
  sourceUrl?: string | null;
  freshness?: DataFreshness | null;
}) {
  const state: DataFreshness = !date || freshness === null
    ? "unavailable"
    : (freshness ?? "current");
  const label = locale === "fr" ? "Données" : "Data";
  const asOf = locale === "fr" ? "au" : "as of";
  const stateLabel: Record<DataFreshness, string | null> = {
    current: null,
    awaiting_close: locale === "fr"
      ? "clôture officielle du jour en attente"
      : "today’s official close pending",
    delayed: locale === "fr" ? "mise à jour retardée" : "delayed update",
    unavailable: locale === "fr" ? "indisponibles" : "unavailable",
  };
  const dotClass: Record<DataFreshness, string> = {
    current: "bg-emerald-500",
    awaiting_close: "bg-sky-500",
    delayed: "bg-amber-500",
    unavailable: "bg-zinc-400",
  };
  const content = (
    <>
      <span className={`h-2 w-2 rounded-full ${dotClass[state]}`} />
      {label} {source ? `· ${source.toUpperCase()}` : ""} {date ? `· ${asOf} ${formatDate(date, locale)}` : ""}
      {stateLabel[state] ? ` · ${stateLabel[state]}` : ""}
    </>
  );

  const cls = "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600";
  return sourceUrl ? (
    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-brand-300`}>
      {content} ↗
    </a>
  ) : (
    <span className={cls}>{content}</span>
  );
}
