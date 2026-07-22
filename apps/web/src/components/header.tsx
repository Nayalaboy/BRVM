import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getCurrentEntitlement } from "@/lib/entitlements";
import { LocaleSwitcher } from "./locale-switcher";

export async function Header() {
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const session = await auth();
  const entitlement = session ? await getCurrentEntitlement() : null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded bg-brand-700 px-1.5 py-0.5 text-sm font-bold tracking-tight text-white">
              BRVM
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Research
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/dividendes" className="hover:text-slate-900">
              {t("dividends")}
            </Link>
            <Link href="/societes" className="hover:text-slate-900">
              {t("companies")}
            </Link>
            <Link href="/screener" className="hover:text-slate-900">
              {t("screener")}
            </Link>
            <Link href="/tarifs" className="hover:text-slate-900">
              {t("pricing")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {session?.user ? (
            <Link
              href="/compte"
              className="flex items-center gap-2 rounded-full border border-slate-200 py-1.5 pl-3 pr-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("account")}
              <span
                className={
                  entitlement?.isPremium
                    ? "rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800"
                    : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                }
              >
                {entitlement?.isPremium ? tCommon("premium") : tCommon("free")}
              </span>
            </Link>
          ) : (
            <Link
              href="/connexion"
              className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              {t("signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
