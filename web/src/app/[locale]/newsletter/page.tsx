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
      <header className="border-b-4 border-black pb-6">
        <p className="terminal-kicker text-brand-600">BRVM BRIEF</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-black sm:text-5xl">{t("archiveTitle")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("body")}</p>
      </header>

      <div className="terminal-panel max-w-2xl p-6">
        <NewsletterSignup />
      </div>

      <div className="border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        {t("archiveEmpty")}
      </div>
    </div>
  );
}
