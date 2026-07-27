import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const referralUrl = process.env.NEXT_PUBLIC_SGI_REFERRAL_URL;

  return (
    <footer className="border-t border-brand-500/40 bg-[var(--ink)] text-white">
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="max-w-md space-y-2">
            <p className="font-mono text-sm font-bold uppercase tracking-wide text-white">
              Aqlee <span className="text-brand-400">Markets</span>
            </p>
            <p className="text-sm leading-relaxed text-zinc-400">{t("tagline")}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/conditions" className="text-zinc-400 transition hover:text-brand-300">
              {t("terms")}
            </Link>
            <Link
              href="/confidentialite"
              className="text-zinc-400 transition hover:text-brand-300"
            >
              {t("privacy")}
            </Link>
            <Link href="/methodologie" className="text-zinc-400 transition hover:text-brand-300">
              {t("methodology")}
            </Link>
            <Link href="/statut" className="text-zinc-400 transition hover:text-brand-300">
              {t("dataStatus")}
            </Link>
            {referralUrl ? (
              <span className="text-zinc-400">
                <a
                  href={referralUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-brand-400 hover:underline"
                >
                  {tNav("openAccount")} ↗
                </a>{" "}
                  <span className="text-xs text-zinc-500">
                  {t("referralNote")}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <p className="border-t border-white/10 pt-6 text-xs leading-relaxed text-zinc-500">
          {t("disclaimer")}
        </p>
      </div>
    </footer>
  );
}
