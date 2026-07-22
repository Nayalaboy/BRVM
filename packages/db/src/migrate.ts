import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db, pool } from "./client";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
);

await migrate(db, { migrationsFolder });
console.log("Migrations applied.");
await pool.end();
