"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-slate-200 text-xs font-semibold">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() =>
            router.replace(
              // @ts-expect-error params are compatible with the current route
              { pathname, params },
              { locale: l },
            )
          }
          className={
            l === locale
              ? "bg-slate-900 px-2.5 py-1 uppercase text-white"
              : "px-2.5 py-1 uppercase text-slate-500 hover:bg-slate-100"
          }
          aria-current={l === locale ? "true" : undefined}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
