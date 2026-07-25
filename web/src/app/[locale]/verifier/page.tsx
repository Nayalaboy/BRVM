import { getLocale, getTranslations } from "next-intl/server";
import { verifyEntity, type LicensedResult } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("verifier");
  return { title: t("title"), description: t("subtitle") };
}

export default async function VerifierPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string }>;
}) {
  const t = await getTranslations("verifier");
  const locale = await getLocale();
  const { q, country } = await searchParams;
  const query = (q ?? "").trim();
  const result = query.length >= 2 ? await verifyEntity(query, country) : null;

  const typeLabel: Record<string, string> = {
    sgi: t("typeSgi"),
    sgp: t("typeSgp"),
    apporteur: t("typeApporteur"),
  };
  const statusLabel: Record<string, string> = {
    active: t("statusActive"),
    suspended: t("statusSuspended"),
    withdrawn: t("statusWithdrawn"),
  };
  const statusClass: Record<string, string> = {
    active: "bg-brand-100 text-brand-800",
    suspended: "bg-amber-100 text-amber-800",
    withdrawn: "bg-red-100 text-red-800",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="max-w-2xl text-slate-600">{t("subtitle")}</p>
      </div>

      <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          minLength={2}
          required
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="min-w-0 flex-1 rounded-full border border-slate-300 px-5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          name="country"
          defaultValue={country ?? ""}
          className="rounded-full border border-slate-300 px-4 py-2.5 text-sm"
        >
          <option value="">{locale === "fr" ? "Tous les pays" : "All countries"}</option>
          {["Bénin", "Burkina Faso", "Côte d'Ivoire", "Guinée-Bissau", "Mali", "Niger", "Sénégal", "Togo"].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-brand-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          {t("search")}
        </button>
      </form>

      {result === null ? (
        <p className="text-sm text-slate-500">{t("prompt")}</p>
      ) : result.found ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700">
            {t("found", { count: result.results.length })}
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">{t("colName")}</th>
                  <th className="px-4 py-3 font-medium">{t("colType")}</th>
                  <th className="px-4 py-3 font-medium">{t("colCountry")}</th>
                  <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r: LicensedResult) => (
                  <tr key={`${r.name}-${r.approvalNumber ?? ""}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.name}
                      {r.approvalNumber ? <span className="block font-mono text-xs font-normal text-slate-400">{r.approvalNumber}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{typeLabel[r.entityType] ?? r.entityType}</td>
                    <td className="px-4 py-3 text-slate-600">{r.country ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          statusClass[r.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusLabel[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.results[0]?.refreshedAt ? (
            <p className="text-xs text-slate-400">
              {t("refreshed", { date: formatDate(result.results[0].refreshedAt.slice(0, 10), locale) })}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">{t("notFoundTitle", { query })}</p>
          <p className="mt-1 text-sm text-amber-800">{t("notFoundBody")}</p>
        </div>
      )}

      <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">{result?.note}</p>
    </div>
  );
}
