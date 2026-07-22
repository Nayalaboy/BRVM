import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { companies, db, dividends, quotesDaily } from "@brvm/db";

export interface DividendRow {
  id: string;
  symbol: string;
  companyName: string;
  fiscalYear: number;
  amount: number;
  exDate: string | null;
  paymentDate: string | null;
  status: "proposed" | "approved" | "paid";
}

function mapDividend(row: {
  dividend: typeof dividends.$inferSelect;
  company: typeof companies.$inferSelect;
}): DividendRow {
  return {
    id: row.dividend.id,
    symbol: row.company.symbol,
    companyName: row.company.name,
    fiscalYear: row.dividend.fiscalYear,
    amount: Number(row.dividend.amount),
    exDate: row.dividend.exDate,
    paymentDate: row.dividend.paymentDate,
    status: row.dividend.status,
  };
}

export async function getUpcomingDividends(limit = 20): Promise<DividendRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({ dividend: dividends, company: companies })
    .from(dividends)
    .innerJoin(companies, eq(dividends.companyId, companies.id))
    .where(sql`${dividends.exDate} >= ${today}`)
    .orderBy(dividends.exDate)
    .limit(limit);
  return rows.map(mapDividend);
}

export async function getPastDividends(limit = 30): Promise<DividendRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({ dividend: dividends, company: companies })
    .from(dividends)
    .innerJoin(companies, eq(dividends.companyId, companies.id))
    .where(sql`${dividends.exDate} < ${today}`)
    .orderBy(desc(dividends.exDate))
    .limit(limit);
  return rows.map(mapDividend);
}

export interface CompanyListRow {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  country: string;
  lastClose: number | null;
  lastDividend: number | null;
  yield: number | null;
}

export async function getCompaniesWithStats(): Promise<CompanyListRow[]> {
  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.symbol,
      c.name,
      c.sector,
      c.country,
      q.close AS last_close,
      d.amount AS last_dividend
    FROM companies c
    LEFT JOIN LATERAL (
      SELECT close FROM quotes_daily
      WHERE company_id = c.id
      ORDER BY date DESC LIMIT 1
    ) q ON TRUE
    LEFT JOIN LATERAL (
      SELECT amount FROM dividends
      WHERE company_id = c.id
      ORDER BY fiscal_year DESC LIMIT 1
    ) d ON TRUE
    ORDER BY c.symbol
  `);

  return rows.rows.map((r) => {
    const lastClose = r.last_close === null ? null : Number(r.last_close);
    const lastDividend =
      r.last_dividend === null ? null : Number(r.last_dividend);
    return {
      id: String(r.id),
      symbol: String(r.symbol),
      name: String(r.name),
      sector: String(r.sector),
      country: String(r.country),
      lastClose,
      lastDividend,
      yield:
        lastClose && lastDividend && lastClose > 0
          ? lastDividend / lastClose
          : null,
    };
  });
}

export interface CompanyDetail {
  company: typeof companies.$inferSelect;
  dividends: (typeof dividends.$inferSelect)[];
  lastClose: number | null;
  lastQuoteDate: string | null;
  avgDailyValueTraded30d: number | null;
}

export async function getCompanyDetail(
  symbol: string,
): Promise<CompanyDetail | null> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.symbol, symbol.toUpperCase()),
  });
  if (!company) return null;

  const [divs, lastQuote, liquidity] = await Promise.all([
    db.query.dividends.findMany({
      where: eq(dividends.companyId, company.id),
      orderBy: desc(dividends.fiscalYear),
    }),
    db.query.quotesDaily.findFirst({
      where: eq(quotesDaily.companyId, company.id),
      orderBy: desc(quotesDaily.date),
    }),
    db.execute(sql`
      SELECT AVG(value_traded)::float8 AS avg_value
      FROM (
        SELECT value_traded FROM quotes_daily
        WHERE company_id = ${company.id}
        ORDER BY date DESC LIMIT 30
      ) t
    `),
  ]);

  const avgValue = liquidity.rows[0]?.avg_value;
  return {
    company,
    dividends: divs,
    lastClose: lastQuote ? Number(lastQuote.close) : null,
    lastQuoteDate: lastQuote?.date ?? null,
    avgDailyValueTraded30d: avgValue == null ? null : Number(avgValue),
  };
}
