import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LEXICON } from "@/lib/lexicon";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("lexicon");
  return { title: t("title"), description: t("subtitle") };
}

export default async function LexiconPage() {
  const t = await getTranslations("lexicon");
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {LEXICON.map((e) => (
          <a
            key={e.slug}
            href={`#${e.slug}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 hover:border-brand-300 hover:text-brand-800"
          >
            {e.term[locale]}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {LEXICON.map((e) => (
          <article key={e.slug} id={e.slug} className="scroll-mt-24 space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">{e.question[locale]}</h2>
            <p className="text-xs font-medium uppercase tracking-wide text-accent-700">
              {e.term[locale]}
            </p>
            <p className="leading-relaxed text-slate-600">{e.body[locale]}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-900">
        {t("verifierCta")}{" "}
        <Link href="/verifier" className="font-semibold underline">
          {t("verifierLink")}
        </Link>
      </div>
    </div>
  );
}
