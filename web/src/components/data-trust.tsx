import { formatDate } from "@/lib/format";

export function DataTrust({
  date,
  locale,
  source = "BRVM",
  sourceUrl,
  stale = false,
}: {
  date: string | null;
  locale: string;
  source?: string | null;
  sourceUrl?: string | null;
  stale?: boolean;
}) {
  const label = locale === "fr" ? "Données" : "Data";
  const asOf = locale === "fr" ? "au" : "as of";
  const staleLabel = locale === "fr" ? "mise à jour retardée" : "delayed update";
  const content = (
    <>
      <span className={`h-2 w-2 rounded-full ${stale ? "bg-amber-500" : "bg-emerald-500"}`} />
      {label} {source ? `· ${source.toUpperCase()}` : ""} {date ? `· ${asOf} ${formatDate(date, locale)}` : ""}
      {stale ? ` · ${staleLabel}` : ""}
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
