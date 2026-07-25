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
    "/verifier": { fr: "/verifier", en: "/verify" },
    "/screener": "/screener",
    "/operations": { fr: "/operations", en: "/ipos" },
    "/lexique": { fr: "/lexique", en: "/glossary" },
    "/recap/[date]": "/recap/[date]",
    "/newsletter": "/newsletter",
    "/intelligence": { fr: "/intelligence", en: "/intelligence" },
    "/methodologie": { fr: "/methodologie", en: "/methodology" },
    "/statut": { fr: "/statut", en: "/status" },
    "/conditions": { fr: "/conditions", en: "/terms" },
    "/confidentialite": { fr: "/confidentialite", en: "/privacy" },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
