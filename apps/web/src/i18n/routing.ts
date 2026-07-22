import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // French is served at the root (no /fr prefix); English under /en.
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/dividendes": { fr: "/dividendes", en: "/dividends" },
    "/societes": { fr: "/societes", en: "/companies" },
    "/societes/[symbol]": {
      fr: "/societes/[symbol]",
      en: "/companies/[symbol]",
    },
    "/screener": "/screener",
    "/tarifs": { fr: "/tarifs", en: "/pricing" },
    "/compte": { fr: "/compte", en: "/account" },
    "/connexion": { fr: "/connexion", en: "/sign-in" },
    "/conditions": { fr: "/conditions", en: "/terms" },
    "/confidentialite": { fr: "/confidentialite", en: "/privacy" },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
