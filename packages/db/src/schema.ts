import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

// ---------------------------------------------------------------------------
// Auth (Auth.js v5 Drizzle adapter tables, extended with role + locale)
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("user"),
  locale: text("locale").notNull().default("fr"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// ---------------------------------------------------------------------------
// Billing (Stripe-driven entitlements)
// ---------------------------------------------------------------------------

export const planEnum = pgEnum("plan", ["free", "premium"]);
export const entitlementStatusEnum = pgEnum("entitlement_status", [
  "active",
  "grace",
  "expired",
]);

/** Maps our users to Stripe customers. */
export const billingCustomers = pgTable("billing_customers", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Mirror of Stripe subscriptions, updated exclusively by the webhook. */
export const subscriptions = pgTable("subscriptions", {
  /** Stripe subscription id (sub_...) */
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  priceId: text("price_id").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Single source of truth for feature access. Derived from subscriptions by
 * the Stripe webhook — application code must only read this table.
 */
export const entitlements = pgTable("entitlements", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("free"),
  status: entitlementStatusEnum("status").notNull().default("active"),
  /** While set and in the future, premium access is kept despite failed payment. */
  graceUntil: timestamp("grace_until", { mode: "date" }),
  stripeSubscriptionId: text("stripe_subscription_id"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Market data (Phase 0)
// ---------------------------------------------------------------------------

export const companies = pgTable("companies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** BRVM ticker, e.g. SNTS */
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  country: text("country").notNull(),
  descriptionFr: text("description_fr"),
  descriptionEn: text("description_en"),
  website: text("website"),
  sharesOutstanding: bigint("shares_outstanding", { mode: "number" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const quotesDaily = pgTable(
  "quotes_daily",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    open: numeric("open", { precision: 14, scale: 2 }),
    high: numeric("high", { precision: 14, scale: 2 }),
    low: numeric("low", { precision: 14, scale: 2 }),
    close: numeric("close", { precision: 14, scale: 2 }).notNull(),
    volume: bigint("volume", { mode: "number" }),
    /** Total value traded in FCFA */
    valueTraded: bigint("value_traded", { mode: "number" }),
  },
  (table) => [
    uniqueIndex("quotes_daily_company_date_idx").on(table.companyId, table.date),
    index("quotes_daily_date_idx").on(table.date),
  ],
);

export const dividendStatusEnum = pgEnum("dividend_status", [
  "proposed",
  "approved",
  "paid",
]);

export const dividends = pgTable(
  "dividends",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    fiscalYear: integer("fiscal_year").notNull(),
    /** Gross dividend per share, in FCFA */
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    exDate: date("ex_date", { mode: "string" }),
    paymentDate: date("payment_date", { mode: "string" }),
    status: dividendStatusEnum("status").notNull().default("paid"),
    source: text("source"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("dividends_company_idx").on(table.companyId)],
);

// ---------------------------------------------------------------------------
// Documents (ingestion pipeline; chunk/embedding tables land with the RAG step)
// ---------------------------------------------------------------------------

export const docTypeEnum = pgEnum("doc_type", [
  "boc_bulletin",
  "annual_report",
  "earnings_release",
  "agm_notice",
  "other",
]);

export const ingestStatusEnum = pgEnum("ingest_status", [
  "pending",
  "processing",
  "ingested",
  "failed",
]);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: text("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    docType: docTypeEnum("doc_type").notNull(),
    title: text("title").notNull(),
    /** ISO 639-1: fr | en */
    language: text("language").notNull().default("fr"),
    /** e.g. "FY2024", "S1-2025" */
    fiscalPeriod: text("fiscal_period"),
    publicationDate: date("publication_date", { mode: "string" }),
    sourceUrl: text("source_url"),
    storagePath: text("storage_path"),
    status: ingestStatusEnum("status").notNull().default("pending"),
    pageCount: integer("page_count"),
    error: text("error"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("documents_company_idx").on(table.companyId),
    index("documents_status_idx").on(table.status),
  ],
);

// ---------------------------------------------------------------------------
// Analytics (typed events, see @brvm/analytics)
// ---------------------------------------------------------------------------

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id"),
    name: text("name").notNull(),
    properties: jsonb("properties").notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("analytics_events_name_idx").on(table.name),
    index("analytics_events_created_idx").on(table.createdAt),
  ],
);
