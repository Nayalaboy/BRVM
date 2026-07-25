import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDemoPremium } from "@/lib/premium";
import { LocaleSwitcher } from "./locale-switcher";
import { MarketCommand } from "./market-command";
import { MarketTicker } from "./market-ticker";

export async function Header() {
  const t = await getTranslations("nav");
  const premium = await isDemoPremium();

  const links = [
    { href: "/intelligence", label: t("intelligence") },
    { href: "/dividendes", label: t("dividends") },
    { href: "/societes", label: t("companies") },
    { href: "/screener", label: t("screener") },
    { href: "/operations", label: t("operations") },
    { href: "/verifier", label: t("verifier") },
    { href: "/lexique", label: t("lexicon") },
  ] as const;

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-black text-white">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="flex shrink-0 items-center font-black uppercase tracking-tight">
              <span className="bg-brand-500 px-2 py-1 text-sm text-black">Aqlee</span>
              <span className="border border-zinc-700 px-2 py-1 text-sm text-white">Markets</span>
            </Link>
            <MarketCommand />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-zinc-500 sm:inline">
              BRVM / UEMOA
            </span>
            {premium ? (
              <Link href="/screener" className="bg-brand-500 px-2 py-1 text-[10px] font-black uppercase text-black">
                {t("premiumDemo")}
              </Link>
            ) : null}
            <LocaleSwitcher />
          </div>
        </div>
      </div>
      <nav className="overflow-x-auto border-b border-zinc-300 bg-white [scrollbar-width:none]">
        <div className="mx-auto flex min-w-max max-w-[1440px] px-4 sm:px-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="border-r border-zinc-200 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-700 first:border-l hover:bg-brand-500 hover:text-black"
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
