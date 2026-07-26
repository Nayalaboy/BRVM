import "server-only";

/**
 * Typed client for the read-only pipeline API (Deliverable A's FastAPI).
 * The Python pipeline owns the schema and data; the website only reads from
 * here. Responses are cached with `next.revalidate` to match the API's
 * Cache-Control, so the site stays fast and the API stays lightly loaded.
 */

const BASE = process.env.PIPELINE_API_URL ?? "http://localhost:8000";
const REVALIDATE = 300; // seconds; mirrors the API's max-age

async function get<T>(path: string, revalidate = REVALIDATE): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate },
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Pipeline API ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Dividends --------------------------------------------------------------

export type DividendStatus = "announced" | "proposed" | "approved" | "paid";

export interface DividendRow {
  ticker: string;
  company: string;
  sector: string | null;
  country: string | null;
  fiscalYear: number;
  amount: number | null;
  yield: number | null;
  exDate: string | null;
  paymentDate: string | null;
  status: DividendStatus;
  source: string;
  sourceUrl: string | null;
  priceAsOf: string | null;
}

interface ApiDividend {
  ticker: string;
  company: string;
  sector: string | null;
  country: string | null;
  fiscal_year: number;
  amount: number | null;
  yield: number | null;
  ex_date: string | null;
  payment_date: string | null;
  status: DividendStatus;
  source: string;
  source_url: string | null;
  price_as_of: string | null;
}

function mapDividend(d: ApiDividend): DividendRow {
  return {
    ticker: d.ticker,
    company: d.company,
    sector: d.sector,
    country: d.country,
    fiscalYear: d.fiscal_year,
    amount: d.amount,
    yield: d.yield,
    exDate: d.ex_date,
    paymentDate: d.payment_date,
    status: d.status,
    source: d.source,
    sourceUrl: d.source_url,
    priceAsOf: d.price_as_of,
  };
}

export interface DividendCalendar {
  upcoming: DividendRow[];
  past: DividendRow[];
}

export async function getDividendCalendar(): Promise<DividendCalendar> {
  const data = await get<{ upcoming: ApiDividend[]; past: ApiDividend[] }>(
    "/dividends/calendar",
  );
  return {
    upcoming: data.upcoming.map(mapDividend),
    past: data.past.map(mapDividend),
  };
}

// --- Companies & market -----------------------------------------------------

export interface CompanyRow {
  ticker: string;
  name: string;
  sector: string | null;
  country: string | null;
  lastClose: number | null;
  dividendYield: number | null;
  ytdReturn: number | null;
}

export async function getCompanies(): Promise<CompanyRow[]> {
  const rows = await get<
    {
      ticker: string;
      name: string;
      sector: string | null;
      country: string | null;
      last_close: number | null;
      dividend_yield: number | null;
      ytd_return: number | null;
    }[]
  >("/companies");
  return rows.map((c) => ({
    ticker: c.ticker,
    name: c.name,
    sector: c.sector,
    country: c.country,
    lastClose: c.last_close,
    dividendYield: c.dividend_yield,
    ytdReturn: c.ytd_return,
  }));
}

export interface CompanyDetail {
  ticker: string;
  name: string;
  sector: string | null;
  country: string | null;
  currency: string;
  sharesOutstanding: number | null;
  descriptionFr: string | null;
  descriptionEn: string | null;
  lastClose: number | null;
  lastQuoteDate: string | null;
  source: string | null;
  marketCap: number | null;
  priceReturn1y: number | null;
  totalReturn1y: number | null;
  dividendStreakYears: number;
  metrics: {
    dividendYield: number | null;
    high52w: number | null;
    low52w: number | null;
    ytdReturn: number | null;
    avgDailyVolume20d: number | null;
    avgDailyValue20d: number | null;
  } | null;
  dividends: {
    fiscalYear: number;
    amountNet: number | null;
    amountGross: number | null;
    exDate: string | null;
    paymentDate: string | null;
    status: DividendStatus;
    source: string;
    sourceUrl: string | null;
  }[];
  peers: {
    ticker: string;
    name: string;
    lastClose: number | null;
    dividendYield: number | null;
    ytdReturn: number | null;
    avgDailyValue20d: number | null;
  }[];
  events: MarketEvent[];
}

export async function getCompany(ticker: string): Promise<CompanyDetail | null> {
  const res = await fetch(`${BASE}/companies/${encodeURIComponent(ticker.toUpperCase())}`, {
    next: { revalidate: REVALIDATE },
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Pipeline API /companies/${ticker} → ${res.status}`);
  const d = (await res.json()) as {
    ticker: string; name: string; sector: string | null; country: string | null;
    currency: string; shares_outstanding: number | null;
    description_fr: string | null; description_en: string | null;
    last_close: number | null; last_quote_date: string | null;
    source: string | null; market_cap: number | null;
    price_return_1y: number | null; total_return_1y: number | null;
    dividend_streak_years: number;
    metrics: {
      dividend_yield: number | null; high_52w: number | null; low_52w: number | null;
      ytd_return: number | null; avg_daily_volume_20d: number | null;
      avg_daily_value_20d: number | null;
    } | null;
    dividends: {
      fiscal_year: number; amount_net: number | null; amount_gross: number | null;
      ex_date: string | null; payment_date: string | null; status: DividendStatus;
      source: string; source_url: string | null;
    }[];
    peers: {
      ticker: string; name: string; last_close: number | null;
      dividend_yield: number | null; ytd_return: number | null;
      avg_daily_value_20d: number | null;
    }[];
    events?: ApiMarketEvent[];
  };
  return {
    ticker: d.ticker, name: d.name, sector: d.sector, country: d.country,
    currency: d.currency, sharesOutstanding: d.shares_outstanding,
    descriptionFr: d.description_fr, descriptionEn: d.description_en,
    lastClose: d.last_close, lastQuoteDate: d.last_quote_date,
    source: d.source, marketCap: d.market_cap,
    priceReturn1y: d.price_return_1y, totalReturn1y: d.total_return_1y,
    dividendStreakYears: d.dividend_streak_years,
    metrics: d.metrics && {
      dividendYield: d.metrics.dividend_yield, high52w: d.metrics.high_52w,
      low52w: d.metrics.low_52w, ytdReturn: d.metrics.ytd_return,
      avgDailyVolume20d: d.metrics.avg_daily_volume_20d,
      avgDailyValue20d: d.metrics.avg_daily_value_20d,
    },
    dividends: d.dividends.map((x) => ({
      fiscalYear: x.fiscal_year, amountNet: x.amount_net, amountGross: x.amount_gross,
      exDate: x.ex_date, paymentDate: x.payment_date, status: x.status,
      source: x.source, sourceUrl: x.source_url,
    })),
    peers: d.peers.map((x) => ({
      ticker: x.ticker, name: x.name, lastClose: x.last_close,
      dividendYield: x.dividend_yield, ytdReturn: x.ytd_return,
      avgDailyValue20d: x.avg_daily_value_20d,
    })),
    events: (d.events ?? []).map(mapMarketEvent),
  };
}

export interface MarketEvent {
  id: number;
  date: string;
  eventType: string;
  summaryFr: string;
  summaryEn: string | null;
  country: string | null;
  body: string;
  tickers: string[];
  sourceTitle: string;
  sourceUrl: string;
  documentRef: string;
}

interface ApiMarketEvent {
  id: number;
  date: string;
  event_type: string;
  summary_fr: string;
  summary_en: string | null;
  country: string | null;
  body: string;
  tickers: string[];
  source_title: string;
  source_url: string;
  document_ref: string;
}

function mapMarketEvent(event: ApiMarketEvent): MarketEvent {
  return {
    id: event.id,
    date: event.date,
    eventType: event.event_type,
    summaryFr: event.summary_fr,
    summaryEn: event.summary_en,
    country: event.country,
    body: event.body,
    tickers: event.tickers,
    sourceTitle: event.source_title,
    sourceUrl: event.source_url,
    documentRef: event.document_ref,
  };
}

export async function getMarketEvents(filters?: {
  country?: string;
  ticker?: string;
  limit?: number;
}): Promise<MarketEvent[]> {
  const params = new URLSearchParams();
  if (filters?.country) params.set("country", filters.country);
  if (filters?.ticker) params.set("ticker", filters.ticker);
  params.set("limit", String(filters?.limit ?? 100));
  const rows = await get<ApiMarketEvent[]>(`/events?${params.toString()}`, 300);
  return rows.map(mapMarketEvent);
}

export interface Quote {
  date: string;
  close: number | null;
}

export async function getQuotes(ticker: string, limit = 260): Promise<Quote[]> {
  const rows = await get<{ date: string; close: number | null }[]>(
    `/quotes/${encodeURIComponent(ticker.toUpperCase())}?limit=${limit}`,
  );
  return rows.map((q) => ({ date: q.date, close: q.close }));
}

export interface Mover {
  ticker: string;
  close: number | null;
  changePct: number;
  valueTraded: number | null;
}

export interface Movers {
  date: string | null;
  gainers: Mover[];
  losers: Mover[];
  mostActive: Mover[];
}

export async function getMovers(): Promise<Movers> {
  const d = await get<{
    date: string | null;
    gainers: { ticker: string; close: number; change_pct: number; value_traded: number }[];
    losers: { ticker: string; close: number; change_pct: number; value_traded: number }[];
    most_active: { ticker: string; close: number; change_pct: number; value_traded: number }[];
  }>("/movers");
  const map = (m: { ticker: string; close: number; change_pct: number; value_traded: number }): Mover => ({
    ticker: m.ticker,
    close: m.close,
    changePct: m.change_pct,
    valueTraded: m.value_traded,
  });
  return {
    date: d.date,
    gainers: d.gainers.map(map),
    losers: d.losers.map(map),
    mostActive: d.most_active.map(map),
  };
}

export interface IndexRow {
  code: string;
  value: number | null;
  changePct: number | null;
}

export async function getIndices(): Promise<{ date: string | null; indices: IndexRow[] }> {
  const d = await get<{
    date: string | null;
    indices: { code: string; value: number; change_pct: number }[];
  }>("/indices");
  return {
    date: d.date,
    indices: d.indices.map((i) => ({ code: i.code, value: i.value, changePct: i.change_pct })),
  };
}

// --- Agrément (licensed-entity) checker -------------------------------------

export interface LicensedResult {
  name: string;
  entityType: string;
  country: string | null;
  approvalNumber: string | null;
  status: string;
  sourceUrl: string | null;
  refreshedAt: string | null;
}

export interface VerifierResponse {
  query: string;
  found: boolean;
  results: LicensedResult[];
  note: string;
}

// --- Daily recap ------------------------------------------------------------

export interface Recap {
  date: string;
  compositeValue: number | null;
  compositeChangePct: number | null;
  advancers: number | null;
  decliners: number | null;
  unchanged: number | null;
  topMovers: { ticker: string; change_pct: number }[];
  mostActive: { ticker: string; value_traded: number }[];
  source: string;
  sourceUrl: string | null;
  nonTraded: string[];
  coveragePct: number;
  breadthRatio: number | null;
}

export async function getRecap(date: string): Promise<Recap | null> {
  const res = await fetch(`${BASE}/recap/${date}`, {
    next: { revalidate: 3600 },
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Pipeline API /recap/${date} → ${res.status}`);
  const d = (await res.json()) as {
    date: string; composite_value: number | null; composite_change_pct: number | null;
    advancers: number | null; decliners: number | null; unchanged: number | null;
    top_movers: { ticker: string; change_pct: number }[];
    most_active: { ticker: string; value_traded: number }[]; source: string;
    source_url: string | null; non_traded: string[]; coverage_pct: number;
    breadth_ratio: number | null;
  };
  return {
    date: d.date, compositeValue: d.composite_value, compositeChangePct: d.composite_change_pct,
    advancers: d.advancers, decliners: d.decliners, unchanged: d.unchanged,
    topMovers: d.top_movers, mostActive: d.most_active, source: d.source,
    sourceUrl: d.source_url, nonTraded: d.non_traded, coveragePct: d.coverage_pct,
    breadthRatio: d.breadth_ratio,
  };
}

// --- Primary market operations ---------------------------------------------

export interface Operation {
  id: number;
  issuer: string;
  type: string;
  title: string;
  status: string;
  openDate: string | null;
  closeDate: string | null;
  priceMin: number | null;
  priceMax: number | null;
  minSubscription: number | null;
  tranches: { name: string; eligibility: string }[] | null;
  eligibilityNotesFr: string | null;
  sgiLead: string | null;
  noticeUrl: string | null;
  sourceUrl: string | null;
  updatedAt: string | null;
}

export async function getOperations(): Promise<Operation[]> {
  const rows = await get<
    {
      id: number; issuer: string; type: string; title: string; status: string;
      open_date: string | null; close_date: string | null;
      price_min: number | null; price_max: number | null; min_subscription: number | null;
      tranches: { name: string; eligibility: string }[] | null;
      eligibility_notes_fr: string | null; sgi_lead: string | null; notice_url: string | null;
      source_url: string | null; updated_at: string | null;
    }[]
  >("/operations");
  return rows.map((o) => ({
    id: o.id, issuer: o.issuer, type: o.type, title: o.title, status: o.status,
    openDate: o.open_date, closeDate: o.close_date, priceMin: o.price_min,
    priceMax: o.price_max, minSubscription: o.min_subscription, tranches: o.tranches,
    eligibilityNotesFr: o.eligibility_notes_fr, sgiLead: o.sgi_lead, noticeUrl: o.notice_url,
    sourceUrl: o.source_url, updatedAt: o.updated_at,
  }));
}

export interface DataStatus {
  generatedAt: string;
  latestQuoteDate: string | null;
  latestIndexDate: string | null;
  latestRegistryRefresh: string | null;
  lastSuccessfulRun: string | null;
  activeCompanies: number;
  quotedCompanies: number;
  coveragePct: number;
  status: "healthy" | "degraded";
}

export async function getDataStatus(): Promise<DataStatus> {
  const d = await get<{
    generated_at: string; latest_quote_date: string | null; latest_index_date: string | null;
    latest_registry_refresh: string | null; last_successful_run: string | null;
    active_companies: number; quoted_companies: number; coverage_pct: number;
    status: "healthy" | "degraded";
  }>("/status", 60);
  return {
    generatedAt: d.generated_at, latestQuoteDate: d.latest_quote_date,
    latestIndexDate: d.latest_index_date, latestRegistryRefresh: d.latest_registry_refresh,
    lastSuccessfulRun: d.last_successful_run, activeCompanies: d.active_companies,
    quotedCompanies: d.quoted_companies, coveragePct: d.coverage_pct, status: d.status,
  };
}

export type IntelligenceKind =
  | "market_move"
  | "unusual_volume"
  | "dividend"
  | "operation"
  | "official_document";

export interface IntelligenceItem {
  id: string;
  kind: IntelligenceKind;
  date: string;
  ticker: string | null;
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  source: string;
  sourceUrl: string | null;
  importance: "normal" | "important";
}

export interface IntelligenceFeed {
  generatedAt: string;
  asOf: string | null;
  methodology: string;
  items: IntelligenceItem[];
}

export async function getIntelligenceFeed(limit = 100): Promise<IntelligenceFeed> {
  const d = await get<{
    generated_at: string;
    as_of: string | null;
    methodology: string;
    items: {
      id: string; kind: IntelligenceKind; date: string; ticker: string | null;
      title_fr: string; title_en: string; summary_fr: string; summary_en: string;
      source: string; source_url: string | null; importance: "normal" | "important";
    }[];
  }>(`/intelligence?limit=${limit}`, 300);
  return {
    generatedAt: d.generated_at,
    asOf: d.as_of,
    methodology: d.methodology,
    items: d.items.map((item) => ({
      id: item.id, kind: item.kind, date: item.date, ticker: item.ticker,
      titleFr: item.title_fr, titleEn: item.title_en,
      summaryFr: item.summary_fr, summaryEn: item.summary_en,
      source: item.source, sourceUrl: item.source_url, importance: item.importance,
    })),
  };
}

export async function verifyEntity(query: string, country?: string): Promise<VerifierResponse> {
  const d = await get<{
    query: string;
    found: boolean;
    note: string;
    results: {
      name: string;
      entity_type: string;
      country: string | null;
      approval_number: string | null;
      status: string;
      source_url: string | null;
      refreshed_at: string | null;
    }[];
  }>(`/verifier?q=${encodeURIComponent(query)}${country ? `&country=${encodeURIComponent(country)}` : ""}`, 3600);
  return {
    query: d.query,
    found: d.found,
    note: d.note,
    results: d.results.map((r) => ({
      name: r.name,
      entityType: r.entity_type,
      country: r.country,
      approvalNumber: r.approval_number,
      status: r.status,
      sourceUrl: r.source_url,
      refreshedAt: r.refreshed_at,
    })),
  };
}
