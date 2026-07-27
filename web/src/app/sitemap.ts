import type { MetadataRoute } from "next";
import { getCompanies, getRecaps } from "@/lib/api";

/**
 * Sitemap with both locales. French is served at the root (no prefix), English
 * under /en. Localized path segments mirror src/i18n/routing.ts.
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// [frPath, enPath]
const PAGES: [string, string][] = [
  ["", "/en"],
  ["/dividendes", "/en/dividends"],
  ["/societes", "/en/companies"],
  ["/verifier", "/en/verify"],
  ["/operations", "/en/ipos"],
  ["/lexique", "/en/glossary"],
  ["/newsletter", "/en/newsletter"],
  ["/intelligence", "/en/intelligence"],
  ["/decisions", "/en/decisions"],
  ["/recap", "/en/recap"],
  ["/methodologie", "/en/methodology"],
  ["/statut", "/en/status"],
  ["/conditions", "/en/terms"],
  ["/confidentialite", "/en/privacy"],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = PAGES.flatMap(([fr, en]) => [
    { url: `${BASE}${fr}`, lastModified: now, changeFrequency: "daily", priority: fr === "" ? 1 : 0.7 },
    { url: `${BASE}${en}`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
  ]);

  try {
    const companies = await getCompanies();
    for (const c of companies) {
      entries.push({
        url: `${BASE}/societes/${c.ticker}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.6,
      });
      entries.push({
        url: `${BASE}/en/companies/${c.ticker}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.4,
      });
    }
  } catch {
    // API unavailable at build/render — ship the static pages regardless.
  }

  try {
    const recaps = await getRecaps(60);
    for (const r of recaps) {
      entries.push({
        url: `${BASE}/recap/${r.date}`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.4,
      });
    }
  } catch {
    // Same fallback as above.
  }

  return entries;
}
