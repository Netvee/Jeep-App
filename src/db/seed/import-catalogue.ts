import { eq, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema";
import { catalogueImportSchema, type CatalogueImport } from "@/lib/catalogue-format";

type Db = NodePgDatabase<typeof schema>;

export type ImportReport = { makes: number; models: number; generations: number; variants: number; specs: number };

/** Validates and upserts a catalogue import (by slug). Throws ZodError on invalid input. */
export async function importCatalogue(db: Db, input: CatalogueImport | unknown): Promise<ImportReport> {
  const data = catalogueImportSchema.parse(input);
  const report: ImportReport = { makes: 0, models: 0, generations: 0, variants: 0, specs: 0 };

  await db.transaction(async (tx) => {
    for (const mk of data.makes) {
      const [make] = await tx
        .insert(schema.makes)
        .values({ slug: mk.slug, nameEn: mk.nameEn, nameHe: mk.nameHe, aliases: mk.aliases })
        .onConflictDoUpdate({
          target: schema.makes.slug,
          set: { nameEn: mk.nameEn, nameHe: mk.nameHe, aliases: mk.aliases },
        })
        .returning();
      report.makes++;
      for (const md of mk.models) {
        const [model] = await tx
          .insert(schema.models)
          .values({ makeId: make.id, slug: md.slug, nameEn: md.nameEn, nameHe: md.nameHe, aliases: md.aliases, segment: md.segment })
          .onConflictDoUpdate({
            target: schema.models.slug,
            set: { makeId: make.id, nameEn: md.nameEn, nameHe: md.nameHe, aliases: md.aliases, segment: md.segment },
          })
          .returning();
        report.models++;
        for (const gn of md.generations) {
          const genValues = {
            modelId: model.id,
            slug: gn.slug,
            code: gn.code,
            name: gn.name,
            yearFrom: gn.yearFrom,
            yearTo: gn.yearTo ?? null,
            coverage: gn.coverage,
            aliases: gn.aliases,
            notes: gn.notes ?? null,
            updatedAt: new Date(),
          };
          const [gen] = await tx
            .insert(schema.generations)
            .values(genValues)
            .onConflictDoUpdate({ target: schema.generations.slug, set: genValues })
            .returning();
          report.generations++;
          for (const vr of gn.variants) {
            const varValues = {
              generationId: gen.id,
              slug: vr.slug,
              name: vr.name,
              trim: vr.trim ?? null,
              yearFrom: vr.yearFrom,
              yearTo: vr.yearTo ?? null,
              body: vr.body,
              engine: vr.engine ?? null,
              fuel: vr.fuel ?? null,
              transmission: vr.transmission ?? null,
              drivetrain: vr.drivetrain ?? null,
              archetype: vr.archetype,
              aliases: vr.aliases,
              notes: vr.notes ?? null,
              updatedAt: new Date(),
            };
            const [variant] = await tx
              .insert(schema.variants)
              .values(varValues)
              .onConflictDoUpdate({ target: schema.variants.slug, set: varValues })
              .returning();
            report.variants++;
            for (const sp of vr.specs) {
              // one value per key per variant: replace the existing one
              await tx
                .delete(schema.variantSpecs)
                .where(and(eq(schema.variantSpecs.variantId, variant.id), eq(schema.variantSpecs.key, sp.key)));
              await tx.insert(schema.variantSpecs).values({
                variantId: variant.id,
                key: sp.key,
                value: sp.value,
                unit: sp.unit ?? null,
                source: sp.source,
                sourceRef: sp.sourceRef ?? null,
                confidence: sp.confidence,
                verifiedAt: sp.verifiedAt ?? null,
              });
              report.specs++;
            }
          }
        }
      }
    }
  });
  return report;
}
