import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Logic to determine driver
const isReplit = !!process.env.REPL_ID;
const isNeon = process.env.DATABASE_URL.includes("neon.tech");

let db: ReturnType<typeof drizzle> | ReturnType<typeof drizzlePg>;
let pool: Pool | pg.Pool;

if (isReplit || isNeon) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool, { schema });
}

export { db, pool };
