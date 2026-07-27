import { getLocale, getTranslations } from "next-intl/server";
import { getOperations, type Operation } from "@/lib/api";
import { formatDate, formatFCFA } from "@/lib/format";
import { DataTrust } from "@/components/data-trust";
import { OperationTools } from "@/components/operation-tools";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("operations");
  return { title: t("title"), description: t("subtitle") };
}

const STATUS_CLASS: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800",
  announced: "bg-amber-100 text-amber-800",
  closed: "bg-slate-100 text-slate-600",
  settled: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-800",
};

export default async function OperationsPage() {
  const t = await getTranslations("operations");
  const locale = await getLocale();
  const operations = await getOperations();

  const statusLabel: Record<string, string> = {
    announced: t("statusAnnounced"),
    open: t("statusOpen"),
    closed: t("statusClosed"),
    settled: t("statusSettled"),
    cancelled: t("statusCancelled"),
  };
  const labels = {
    window: t("window"),
    price: t("price"),
    minSubscription: t("minSubscription"),
    sgiLead: t("sgiLead"),
    eligibility: t("eligibility"),
    notice: t("notice"),
  };

  function card(op: Operation) {
    const price =
      op.priceMin != null && op.priceMax != null && op.priceMin !== op.priceMax
        ? `${formatFCFA(op.priceMin)} – ${formatFCFA(op.priceMax)}`
        : op.priceMin != null
          ? formatFCFA(op.priceMin)
          : "—";
    const rows: [string, string][] = [
      [
        labels.window,
        op.openDate && op.closeDate
          ? `${formatDate(op.openDate, locale)} → ${formatDate(op.closeDate, locale)}`
          : "—",
      ],
      [labels.price, price],
      [labels.minSubscription, op.minSubscription != null ? formatFCFA(op.minSubscription) : "—"],
      [labels.sgiLead, op.sgiLead ?? "—"],
    ];
    return (
      <article key={op.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{op.title}</h2>
            <p className="text-sm text-slate-500">{op.issuer}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_CLASS[op.status] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {statusLabel[op.status] ?? op.status}
          </span>
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-1">
              <dt className="text-slate-500">{label}</dt>
              <dd className="tabular text-right font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        {op.eligibilityNotesFr ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {labels.eligibility}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {op.eligibilityNotesFr}
            </p>
          </div>
        ) : null}

        {op.tranches && op.tranches.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-600">
            {op.tranches.map((tr) => (
              <li key={tr.name}>
                <span className="font-medium text-slate-800">{tr.name}</span> — {tr.eligibility}
              </li>
            ))}
          </ul>
        ) : null}

        <OperationTools
          price={op.priceMin}
          minimum={op.minSubscription}
          closeDate={op.closeDate}
          locale={locale}
        />

        <DataTrust
          date={op.updatedAt?.slice(0, 10) ?? null}
          locale={locale}
          source="CREPMF"
          sourceUrl={op.noticeUrl ?? op.sourceUrl}
        />

        {op.noticeUrl ? (
          <a
            href={op.noticeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            {labels.notice} ↗
          </a>
        ) : null}
      </article>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="max-w-2xl text-slate-600">{t("subtitle")}</p>
      </div>

      {operations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("emptyBody")}</p>
        </div>
      ) : (
        <div className="space-y-6">{operations.map(card)}</div>
      )}

      <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">{t("disclaimer")}</p>
    </div>
  );
}
