import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDemoPremium } from "@/lib/premium";
import { LocaleSwitcher } from "./locale-switcher";
import { MarketCommand } from "./market-command";
import { MarketTicker } from "./market-ticker";
import { auth } from "@/lib/auth";

export async function Header() {
  const t = await getTranslations("nav");
  const premium = await isDemoPremium();
  const session = await auth();

  const links = [
    { href: "/intelligence", label: t("intelligence") },
    { href: "/decisions", label: t("decisions") },
    { href: "/dividendes", label: t("dividends") },
    { href: "/societes", label: t("companies") },
    { href: "/screener", label: t("screener") },
    { href: "/operations", label: t("operations") },
    { href: "/verifier", label: t("verifier") },
    { href: "/lexique", label: t("lexicon") },
  ] as const;

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[var(--ink)] text-white">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="flex shrink-0 items-center font-semibold uppercase tracking-tight">
              <span className="bg-brand-500 px-2.5 py-1 text-sm text-[var(--ink)]">Aqlee</span>
              <span className="border border-white/15 px-2.5 py-1 text-sm text-white">Markets</span>
            </Link>
            <MarketCommand />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-zinc-500 sm:inline">
              BRVM / UEMOA
            </span>
            {premium ? (
              <Link href="/screener" className="bg-brand-500 px-2 py-1 text-[10px] font-bold uppercase text-[var(--ink)]">
                {t("premiumDemo")}
              </Link>
            ) : null}
            <LocaleSwitcher />
            <Link
              href={session?.user ? "/compte" : "/connexion"}
              className="border border-white/20 px-2 py-1 text-[10px] font-semibold uppercase text-white transition hover:border-brand-400 hover:text-brand-300"
            >
              {session?.user ? t("account") : t("signIn")}
            </Link>
          </div>
        </div>
      </div>
      <nav className="overflow-x-auto border-b border-[var(--rule)] bg-white/95 backdrop-blur [scrollbar-width:none]">
        <div className="mx-auto flex min-w-max max-w-[1440px] px-4 sm:px-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="border-r border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 first:border-l hover:bg-brand-50 hover:text-brand-800"
              >
                {l.label}
              </Link>
            ))}
        </div>
      </nav>
      <MarketTicker />
    </header>
  );
}
