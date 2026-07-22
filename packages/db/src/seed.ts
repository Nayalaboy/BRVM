/**
 * One-command local seed: inserts fixture companies, dividend history and
 * ~90 days of synthetic quotes. Idempotent (truncates market-data tables
 * first; never touches users/billing).
 */
import { sql } from "drizzle-orm";
import { db, pool } from "./client";
import { companies, dividends, documents, quotesDaily } from "./schema";
import { COMPANIES, mulberry32 } from "./fixtures";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Next occurrence of a plausible ex-date for the given fiscal year. */
function exDateFor(fiscalYear: number, symbol: string): string {
  // Spread ex-dates across April–August of fiscalYear + 1.
  const hash = [...symbol].reduce((a, c) => a + c.charCodeAt(0), 0);
  const month = 4 + (hash % 5); // 4..8
  const day = 1 + (hash % 25);
  return `${fiscalYear + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function main() {
  console.log("Seeding fixture data…");

  await db.execute(
    sql`TRUNCATE TABLE quotes_daily, dividends, documents, companies RESTART IDENTITY CASCADE`,
  );

  const today = new Date();
  const currentYear = today.getUTCFullYear();

  for (const fixture of COMPANIES) {
    const [company] = await db
      .insert(companies)
      .values({
        symbol: fixture.symbol,
        name: fixture.name,
        sector: fixture.sector,
        country: fixture.country,
        descriptionFr: fixture.descriptionFr,
        descriptionEn: fixture.descriptionEn,
        sharesOutstanding: fixture.sharesOutstanding,
      })
      .returning();

    // Dividend history. The most recent fiscal year is always scheduled at a
    // future ex-date (status "approved") so the calendar's upcoming section
    // is populated no matter when the seed runs.
    const years = Object.keys(fixture.dividends)
      .map(Number)
      .sort((a, b) => a - b);
    const hash = [...fixture.symbol].reduce((a, c) => a + c.charCodeAt(0), 0);
    for (const year of years) {
      const amount = fixture.dividends[year];
      const isLatest = year === years[years.length - 1];
      let exDate: string;
      if (isLatest) {
        const upcoming = new Date(today);
        upcoming.setUTCDate(upcoming.getUTCDate() + 7 + (hash % 60));
        exDate = isoDate(upcoming);
      } else {
        exDate = exDateFor(year, fixture.symbol);
      }
      const payment = new Date(exDate);
      payment.setUTCDate(payment.getUTCDate() + 14);
      await db.insert(dividends).values({
        companyId: company.id,
        fiscalYear: year,
        amount: String(amount),
        exDate,
        paymentDate: isoDate(payment),
        status: isLatest ? "approved" : "paid",
        source: "fixture",
      });
    }

    // ~90 calendar days of synthetic quotes (weekdays only), deterministic.
    const rand = mulberry32(
      [...fixture.symbol].reduce((a, c) => a * 31 + c.charCodeAt(0), 7),
    );
    let price = fixture.refPrice;
    const rows: (typeof quotesDaily.$inferInsert)[] = [];
    for (let i = 90; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const drift = (rand() - 0.48) * 0.02; // slight upward bias
      const open = price;
      price = Math.max(1, Math.round(price * (1 + drift) * 100) / 100);
      const high = Math.max(open, price) * (1 + rand() * 0.01);
      const low = Math.min(open, price) * (1 - rand() * 0.01);
      const volume = Math.round(rand() * 20000 + 500);
      rows.push({
        companyId: company.id,
        date: isoDate(d),
        open: open.toFixed(2),
        high: high.toFixed(2),
        low: low.toFixed(2),
        close: price.toFixed(2),
        volume,
        valueTraded: Math.round(volume * price),
      });
    }
    await db.insert(quotesDaily).values(rows);

    console.log(`  ${fixture.symbol} — ${fixture.name}`);
  }

  // A pending fixture document so the ingestion pipeline has work to pick up.
  const sonatel = await db.query.companies.findFirst({
    where: (c, { eq }) => eq(c.symbol, "SNTS"),
  });
  if (sonatel) {
    await db.insert(documents).values({
      companyId: sonatel.id,
      docType: "annual_report",
      title: "Sonatel — Rapport annuel (fixture)",
      language: "fr",
      fiscalPeriod: `FY${currentYear - 1}`,
      publicationDate: isoDate(today),
      storagePath: "services/ingestion/fixtures/sonatel_rapport_annuel_fixture.pdf",
      status: "pending",
    });
  }

  console.log("Seed complete.");
  await pool.end();
}

await main();
