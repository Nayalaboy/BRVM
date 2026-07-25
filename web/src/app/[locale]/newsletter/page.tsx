import { getTranslations } from "next-intl/server";
import { NewsletterSignup } from "@/components/newsletter-signup";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("newsletter");
  return { title: t("archiveTitle"), description: t("body") };
}

export default async function NewsletterArchivePage() {
  const t = await getTranslations("newsletter");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("archiveTitle")}</h1>
        <p className="text-slate-600">{t("body")}</p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <NewsletterSignup />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {t("archiveEmpty")}
      </div>
    </div>
  );
}
