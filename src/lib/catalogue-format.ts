/**
 * Structured import format for the vehicle catalogue.
 * Used by the built-in seed and by the admin JSON import (src/app/admin/catalogue).
 * Rows are upserted by slug, so imports are idempotent.
 */
import { z } from "zod";

const slug = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "slug: lowercase latin letters, digits and dashes only");
const year = z.number().int().min(1940).max(2100);

export const specSchema = z.object({
  key: z.string().min(1).max(60),
  value: z.string().min(1).max(300),
  unit: z.string().max(20).optional(),
  source: z.enum(["manufacturer_document", "editorial", "owner_reported", "importer"]),
  sourceRef: z.string().max(500).optional(),
  confidence: z.enum(["high", "medium", "low"]),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine((s) => s.source !== "manufacturer_document" || (s.sourceRef && s.verifiedAt), {
  message: "manufacturer_document specs require sourceRef and verifiedAt",
});

export const variantSchema = z.object({
  slug,
  name: z.string().min(1).max(120),
  trim: z.string().max(60).optional(),
  yearFrom: year,
  yearTo: year.nullable().optional(),
  body: z.enum(["suv-2door", "suv-4door", "pickup-double", "pickup-single", "pickup-extended"]),
  engine: z.string().max(120).optional(),
  fuel: z.enum(["petrol", "diesel", "hybrid", "phev", "electric"]).optional(),
  transmission: z.string().max(120).optional(),
  drivetrain: z.string().max(200).optional(),
  archetype: z.enum(["boxy-short", "boxy-long", "wagon", "pickup", "compact-boxy"]),
  aliases: z.array(z.string().max(60)).default([]),
  notes: z.string().max(1000).optional(),
  specs: z.array(specSchema).default([]),
});

export const generationSchema = z.object({
  slug,
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(120),
  yearFrom: year,
  yearTo: year.nullable().optional(),
  coverage: z.enum(["listed", "basic", "deep"]),
  aliases: z.array(z.string().max(60)).default([]),
  notes: z.string().max(1000).optional(),
  variants: z.array(variantSchema).default([]),
});

export const modelSchema = z.object({
  slug,
  nameEn: z.string().min(1).max(60),
  nameHe: z.string().min(1).max(60),
  aliases: z.array(z.string().max(60)).default([]),
  segment: z.enum(["suv", "pickup", "compact"]),
  generations: z.array(generationSchema).default([]),
});

export const makeSchema = z.object({
  slug,
  nameEn: z.string().min(1).max(60),
  nameHe: z.string().min(1).max(60),
  aliases: z.array(z.string().max(60)).default([]),
  models: z.array(modelSchema).default([]),
});

export const catalogueImportSchema = z.object({
  version: z.literal(1),
  makes: z.array(makeSchema),
});

export type CatalogueImport = z.input<typeof catalogueImportSchema>;
export type CatalogueImportParsed = z.output<typeof catalogueImportSchema>;
export type VariantInput = z.input<typeof variantSchema>;
