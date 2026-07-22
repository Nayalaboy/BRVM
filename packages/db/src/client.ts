import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __brvmDb: { pool: pg.Pool; db: Db } | undefined;
}

function create() {
  const pool = new pg.Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://brvm:brvm@localhost:5432/brvm",
    max: 10,
  });
  return { pool, db: drizzle(pool, { schema }) };
}

// Reuse the pool across Next.js hot reloads in dev.
const cached = globalThis.__brvmDb ?? create();
if (process.env.NODE_ENV !== "production") globalThis.__brvmDb = cached;

export const pool = cached.pool;
export const db = cached.db;
