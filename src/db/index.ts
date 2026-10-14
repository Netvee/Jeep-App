import "server-only";
import { getDb as getDbInternal, type Db } from "./client";

export type { Db };

/** Lazily-initialised, migrated and seeded database (singleton per process). */
export function getDb(): Promise<Db> {
  return getDbInternal();
}
