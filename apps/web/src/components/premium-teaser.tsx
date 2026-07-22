import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Teaser panel shown to free users in place of a premium module.
 * Renders the (blurred) children behind an upgrade call-to-action.
 */
export async function PremiumTeaser({
  title,
  body,
  children,
  signedIn,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
  signedIn: boolean;
}) {
  const t = await getTranslations("premiumGate");

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
      {children ? (
        <div
          aria-hidden
          className="pointer-events-none select-none opacity-60 blur-sm"
        >
          {children}
        </div>
      ) : (
        <div className="h-40" aria-hidden />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 p-6 text-center backdrop-blur-[2px]">
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-800">
          {t("badge")}
        </span>
        <p className="max-w-md text-base font-semibold text-slate-900">{title}</p>
        <p className="max-w-md text-sm text-slate-600">{body}</p>
        <Link
          href={signedIn ? "/tarifs" : "/connexion"}
          className="mt-1 rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          {signedIn ? t("cta") : t("signInCta")}
        </Link>
      </div>
    </div>
  );
}
