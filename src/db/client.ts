/**
 * Database client factory. Not marked server-only so scripts and tests can import it.
 *
 * - DATABASE_URL set  → node-postgres pool (production: Supabase/Neon/RDS/self-hosted Postgres)
 * - DATABASE_URL empty → embedded PGlite (real Postgres compiled to WASM) persisted in ./.data/pglite
 *
 * Both use the same Drizzle pg schema and SQL migrations in ./drizzle.
 */
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCatalogue } from "./seed/catalogue";
import { seedDemo } from "./seed/demo";

export type Db = NodePgDatabase<typeof schema>;

type Holder = { promise?: Promise<Db>; close?: () => Promise<void> };
const g = globalThis as unknown as { __shetachDb?: Holder };

const migrationsFolder = path.join(process.cwd(), "drizzle");

export async function createDb(opts: { url?: string; memory?: boolean; dataDir?: string; seed?: boolean; demo?: boolean } = {}) {
  let db: Db;
  let close: () => Promise<void>;
  if (opts.url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: opts.url, max: 10 });
    db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    close = () => pool.end();
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    let client;
    if (opts.memory) {
      client = new PGlite();
    } else {
      const dir = opts.dataDir ?? process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
      fs.mkdirSync(dir, { recursive: true });
      client = new PGlite(dir);
    }
    const pdb = drizzle(client, { schema });
    await migrate(pdb, { migrationsFolder });
    db = pdb as unknown as Db;
    close = () => client.close();
  }
  if (opts.seed !== false) {
    await seedCatalogue(db);
    if (opts.demo) await seedDemo(db);
  }
  return { db, close };
}

export function getDb(): Promise<Db> {
  const holder = (g.__shetachDb ??= {});
  if (!holder.promise) {
    holder.promise = createDb({
      url: process.env.DATABASE_URL || undefined,
      demo: process.env.SEED_DEMO_DATA !== "false",
    })
      .then(({ db, close }) => {
        holder.close = close;
        return db;
      })
      .catch((err) => {
        holder.promise = undefined;
        throw err;
      });
  }
  return holder.promise;
}
