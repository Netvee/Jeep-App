import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema";
import { catalogueSeed } from "./catalogue-data";
import { realParts } from "./parts-data";
import { importCatalogue } from "./import-catalogue";

type Db = NodePgDatabase<typeof schema>;

/**
 * Seeds the reference catalogue the first time only. Later edits are made by admins
 * and are never overwritten by restarts.
 */
export async function seedCatalogue(db: Db) {
  const [{ n: makeCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.makes);
  if (makeCount === 0) await importCatalogue(db, catalogueSeed);

  const [{ n: partCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.parts)
    .where(eq(schema.parts.isDemo, false));
  if (partCount === 0) {
    for (const p of realParts) {
      await db.insert(schema.parts).values({
        category: p.category,
        componentKey: p.componentKey,
        brand: p.brand,
        nameHe: p.nameHe,
        nameEn: p.nameEn ?? null,
        partNumber: null,
        description: p.description,
        aliases: p.aliases,
        benefits: p.benefits,
        tradeoffs: p.tradeoffs,
        maintenanceNotes: p.maintenanceNotes,
        requiredSupporting: p.requiredSupporting,
        conflictsWith: p.conflictsWith ?? [],
        installComplexity: p.installComplexity ?? null,
        proInstallRecommended: p.proInstallRecommended ?? null,
        overlay: p.overlay ?? null,
        liftCm: p.liftCm ?? null,
        tyreSize: p.tyreSize ?? null,
        legalNote: p.legalNote ?? null,
        isDemo: false,
      });
    }
  }
}
