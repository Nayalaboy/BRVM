import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const referralUrl = process.env.NEXT_PUBLIC_SGI_REFERRAL_URL;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              BRVM Research
            </p>
            <p className="text-sm text-slate-500">{t("tagline")}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/conditions" className="text-slate-500 hover:text-slate-900">
              {t("terms")}
            </Link>
            <Link
              href="/confidentialite"
              className="text-slate-500 hover:text-slate-900"
            >
              {t("privacy")}
            </Link>
            {referralUrl ? (
              <span className="text-slate-500">
                <a
                  href={referralUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-brand-700 hover:underline"
                >
                  {tNav("openAccount")} ↗
                </a>{" "}
                <span className="text-xs text-slate-400">
                  {t("referralNote")}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <p className="border-t border-slate-100 pt-6 text-xs leading-relaxed text-slate-400">
          {t("disclaimer")}
        </p>
      </div>
    </footer>
  );
}
