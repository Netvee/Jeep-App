import { asc } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";

export type TreeVariant = { id: string; slug: string; name: string; yearFrom: number; yearTo: number | null; body: s.BodyStyle; engine: string | null; aliases: string[] };
export type TreeGeneration = {
  id: string;
  slug: string;
  code: string;
  name: string;
  yearFrom: number;
  yearTo: number | null;
  coverage: "listed" | "basic" | "deep";
  aliases: string[];
  makeEn: string;
  makeHe: string;
  makeAliases: string[];
  modelEn: string;
  modelHe: string;
  modelAliases: string[];
  variants: TreeVariant[];
};

export async function getCatalogueTree(db: Db): Promise<TreeGeneration[]> {
  const [makes, models, gens, vars] = await Promise.all([
    db.select().from(s.makes),
    db.select().from(s.models),
    db.select().from(s.generations).orderBy(asc(s.generations.yearFrom)),
    db.select().from(s.variants).orderBy(asc(s.variants.yearFrom)),
  ]);
  const makeById = new Map(makes.map((m) => [m.id, m]));
  const modelById = new Map(models.map((m) => [m.id, m]));
  return gens
    .map((g) => {
      const model = modelById.get(g.modelId)!;
      const make = makeById.get(model.makeId)!;
      return {
        id: g.id,
        slug: g.slug,
        code: g.code,
        name: g.name,
        yearFrom: g.yearFrom,
        yearTo: g.yearTo,
        coverage: g.coverage,
        aliases: g.aliases,
        makeEn: make.nameEn,
        makeHe: make.nameHe,
        makeAliases: make.aliases,
        modelEn: model.nameEn,
        modelHe: model.nameHe,
        modelAliases: model.aliases,
        variants: vars
          .filter((v) => v.generationId === g.id)
          .map((v) => ({ id: v.id, slug: v.slug, name: v.name, yearFrom: v.yearFrom, yearTo: v.yearTo, body: v.body, engine: v.engine, aliases: v.aliases })),
      };
    })
    .sort((a, b) => a.makeEn.localeCompare(b.makeEn) || a.modelEn.localeCompare(b.modelEn) || b.yearFrom - a.yearFrom);
}
