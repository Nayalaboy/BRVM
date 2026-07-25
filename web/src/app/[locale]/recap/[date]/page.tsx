import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRecap } from "@/lib/api";
import { formatCompactFCFA, formatDate, formatNumber } from "@/lib/format";
import { DataTrust } from "@/components/data-trust";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const t = await getTranslations("recap");
  return { title: `${t("title")} — ${date}` };
}

export default async function RecapPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const t = await getTranslations("recap");
  const locale = await getLocale();
  const recap = await getRecap(date);
  if (!recap) notFound();

  const breadth = [
    { label: t("advancers"), value: recap.advancers, cls: "text-brand-700" },
    { label: t("decliners"), value: recap.decliners, cls: "text-red-600" },
    { label: t("unchanged"), value: recap.unchanged, cls: "text-slate-500" },
  ];
  const up = (recap.compositeChangePct ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("title")} — {formatDate(recap.date, locale)}
        </h1>
        {/* Traceability: every figure sourced from the official BOC bulletin. */}
        <DataTrust date={recap.date} locale={locale} source="BOC" sourceUrl={recap.sourceUrl} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {t("composite")}
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="tabular text-3xl font-bold text-slate-900">
            {recap.compositeValue != null ? formatNumber(recap.compositeValue, 2) : "—"}
          </span>
          {recap.compositeChangePct != null ? (
            <span className={`tabular text-lg font-semibold ${up ? "text-brand-700" : "text-red-600"}`}>
              {up ? "+" : ""}
              {formatNumber(recap.compositeChangePct, 2)}&nbsp;%
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">
          {locale === "fr" ? "Lecture de la séance" : "Session overview"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {locale === "fr"
            ? `${recap.coveragePct.toFixed(1)} % de la cote active est couverte. ${recap.advancers ?? 0} valeur(s) progressent contre ${recap.decliners ?? 0} en baisse.`
            : `${recap.coveragePct.toFixed(1)}% of active listings are covered. ${recap.advancers ?? 0} securities advanced versus ${recap.decliners ?? 0} declining.`}
        </p>
        {recap.nonTraded.length > 0 ? (
          <p className="mt-2 text-sm text-amber-700">
            {locale === "fr" ? "Sans cotation reçue : " : "No quote received: "}
            <span className="font-mono">{recap.nonTraded.join(", ")}</span>
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-3 gap-4">
        {breadth.map((b) => (
          <div key={b.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className={`tabular text-2xl font-bold ${b.cls}`}>{b.value ?? "—"}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{b.label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">{t("topMovers")}</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {recap.topMovers.map((m) => (
              <li key={m.ticker} className="flex items-center justify-between px-4 py-2 text-sm">
                <Link
                  href={{ pathname: "/societes/[symbol]", params: { symbol: m.ticker } }}
                  className="font-mono font-semibold text-brand-700 hover:underline"
                >
                  {m.ticker}
                </Link>
                <span className={`tabular font-semibold ${m.change_pct >= 0 ? "text-brand-700" : "text-red-600"}`}>
                  {m.change_pct >= 0 ? "+" : ""}
                  {formatNumber(m.change_pct, 2)}&nbsp;%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">{t("mostActive")}</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {recap.mostActive.map((m) => (
              <li key={m.ticker} className="flex items-center justify-between px-4 py-2 text-sm">
                <Link
                  href={{ pathname: "/societes/[symbol]", params: { symbol: m.ticker } }}
                  className="font-mono font-semibold text-brand-700 hover:underline"
                >
                  {m.ticker}
                </Link>
                <span className="tabular text-slate-600">{formatCompactFCFA(m.value_traded)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
