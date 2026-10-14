import { desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { resolveFitment, FITMENT_ORDER, type FitmentResult } from "@/lib/fitment";
import { formatIlsRange, formatDate } from "@/lib/units";
import type { Vehicle } from "./repo";

export type Part = typeof s.parts.$inferSelect;
export type Price = typeof s.prices.$inferSelect & { supplierName: string | null; supplierVerified: boolean | null };

export type PartWithFit = {
  part: Part;
  fit: FitmentResult;
  prices: Price[];
  bestPrice: Price | null;
  priceLabel: string;
};

const KIND_RANK = { supplier: 0, owner_reported: 1, estimate: 2 } as const;
export const PRICE_KIND_LABEL = { supplier: "מחיר ספק", owner_reported: "דיווח בעלים", estimate: "הערכה" } as const;

export function pickBestPrice(prices: Price[]): Price | null {
  return [...prices].sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.observedAt.localeCompare(a.observedAt))[0] ?? null;
}

export function priceLabel(p: Price | null): string {
  if (!p) return "מחיר לא ידוע";
  const vat = p.includesVat == null ? " · מע״מ לא ידוע" : p.includesVat ? " · כולל מע״מ" : " · לפני מע״מ";
  return `${PRICE_KIND_LABEL[p.kind]}: ${formatIlsRange(p.amountMin, p.amountMax)}${vat} · ${formatDate(p.observedAt)}`;
}

export async function loadPartsWithFitment(
  db: Db,
  opts: { vehicle: Pick<Vehicle, "variantId" | "year"> | null; variantYears?: { from: number; to: number | null } | null; showDemo: boolean; partIds?: string[] },
): Promise<PartWithFit[]> {
  let parts = opts.partIds ? (opts.partIds.length ? await db.select().from(s.parts).where(inArray(s.parts.id, opts.partIds)) : []) : await db.select().from(s.parts);
  if (!opts.showDemo) parts = parts.filter((p) => !p.isDemo);
  if (!parts.length) return [];
  const ids = parts.map((p) => p.id);
  const fits = opts.vehicle?.variantId ? await db.select().from(s.fitments).where(inArray(s.fitments.partId, ids)) : [];
  const prices = await db
    .select({ price: s.prices, supplierName: s.suppliers.name, supplierVerified: s.suppliers.verified })
    .from(s.prices)
    .leftJoin(s.suppliers, eq(s.suppliers.id, s.prices.supplierId))
    .where(inArray(s.prices.partId, ids))
    .orderBy(desc(s.prices.observedAt));
  return parts.map((part) => {
    const rows = fits
      .filter((f) => f.partId === part.id)
      .map((f) => ({ variantId: f.variantId, status: f.status, evidence: f.evidence, verifiedAt: f.verifiedAt, sourceUrl: f.sourceUrl, isDemo: f.isDemo }));
    const fit = resolveFitment(
      { variantId: opts.vehicle?.variantId ?? null, year: opts.vehicle?.year ?? null, variantYearFrom: opts.variantYears?.from, variantYearTo: opts.variantYears?.to },
      rows,
    );
    const pp = prices.filter((p) => p.price.partId === part.id).map((p) => ({ ...p.price, supplierName: p.supplierName, supplierVerified: p.supplierVerified }));
    const best = pickBestPrice(pp);
    return { part, fit, prices: pp, bestPrice: best, priceLabel: priceLabel(best) };
  });
}

export function sortByFitment(list: PartWithFit[]) {
  return [...list].sort((a, b) => FITMENT_ORDER[a.fit.status] - FITMENT_ORDER[b.fit.status] || Number(a.part.isDemo) - Number(b.part.isDemo));
}
