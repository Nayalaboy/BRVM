import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRecaps } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("recapIndex");
  return { title: t("title"), description: t("subtitle") };
}

export default async function RecapIndexPage() {
  const t = await getTranslations("recapIndex");
  const locale = await getLocale();
  const recaps = await getRecaps(120);

  return (
    <div className="space-y-7">
      <header className="border-b-4 border-black pb-6">
        <p className="terminal-kicker text-brand-600">BOC / BRVM</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{t("subtitle")}</p>
      </header>

      {recaps.length === 0 ? (
        <p className="border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto border border-zinc-300 bg-white shadow-[3px_3px_0_#111]">
          <table className="w-full text-xs">
            <thead className="bg-black text-left font-mono text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colDate")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("colComposite")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("colChange")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("colBreadth")}</th>
              </tr>
            </thead>
            <tbody>
              {recaps.map((r) => (
                <tr key={r.date} className="border-b border-zinc-200 last:border-0 hover:bg-brand-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={{ pathname: "/recap/[date]", params: { date: r.date } }}
                      className="font-mono font-black text-brand-600 hover:underline"
                    >
                      {formatDate(r.date, locale)}
                    </Link>
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-mono">
                    {r.compositeValue != null ? formatNumber(r.compositeValue, 2) : "—"}
                  </td>
                  <td
                    className={`tabular px-4 py-2.5 text-right font-mono font-bold ${
                      r.compositeChangePct == null
                        ? "text-zinc-400"
                        : r.compositeChangePct >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                    }`}
                  >
                    {r.compositeChangePct != null
                      ? `${r.compositeChangePct >= 0 ? "+" : ""}${formatNumber(r.compositeChangePct, 2)} %`
                      : "—"}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-mono text-zinc-600">
                    <span className="text-emerald-700">{r.advancers ?? "—"}</span>
                    {" / "}
                    <span className="text-red-600">{r.decliners ?? "—"}</span>
                    {" / "}
                    {r.unchanged ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
