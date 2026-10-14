/**
 * Upgrade cost aggregation. The core rule: a missing cost is UNKNOWN, never zero.
 * Totals are therefore reported as a known range plus an explicit list of unknown parts.
 */
import type { CostKind, CostSource } from "@/db/schema";
import { formatIlsRange } from "./units";

export const COST_KINDS: CostKind[] = ["part", "labour", "supporting", "shipping"];

export const COST_KIND_LABEL: Record<CostKind, string> = {
  part: "מחיר החלק",
  labour: "עבודה/התקנה",
  supporting: "חלקים נלווים",
  shipping: "משלוח/יבוא",
};

export const COST_SOURCE_LABEL: Record<CostSource, string> = {
  supplier: "מחיר ספק",
  owner: "דיווח בעלים",
  estimate: "הערכה",
  quote: "הצעת מחיר",
  receipt: "קבלה",
};

export type CostLine = {
  kind: CostKind;
  notApplicable: boolean;
  amountMin: number | null;
  amountMax: number | null;
  includesVat: boolean | null;
  source: CostSource;
};

export type CostSummary = {
  /** sum of known minimums */
  min: number;
  /** sum of known maximums (falls back to min where no max) */
  max: number;
  /** cost kinds with no line, or a line with no amount */
  unknownKinds: CostKind[];
  /** true when every kind is known or explicitly N/A */
  complete: boolean;
  /** some known lines have unknown VAT status, or VAT status is mixed */
  vatUncertain: boolean;
  hasEstimates: boolean;
  /** at least one line has a real amount or is explicitly N/A */
  anyKnown: boolean;
};

export function summarizeCosts(lines: CostLine[]): CostSummary {
  let min = 0;
  let max = 0;
  const unknownKinds: CostKind[] = [];
  const vatStates = new Set<string>();
  let hasEstimates = false;
  let anyKnown = false;
  for (const kind of COST_KINDS) {
    const line = lines.find((l) => l.kind === kind);
    if (!line) {
      unknownKinds.push(kind);
      continue;
    }
    if (line.notApplicable) {
      anyKnown = true;
      continue;
    }
    if (line.amountMin == null && line.amountMax == null) {
      unknownKinds.push(kind);
      continue;
    }
    const lo = line.amountMin ?? line.amountMax!;
    const hi = line.amountMax ?? line.amountMin!;
    anyKnown = true;
    min += Math.min(lo, hi);
    max += Math.max(lo, hi);
    vatStates.add(String(line.includesVat));
    if (line.source === "estimate") hasEstimates = true;
  }
  return {
    min,
    max,
    unknownKinds,
    complete: unknownKinds.length === 0,
    vatUncertain: vatStates.has("null") || vatStates.size > 1,
    hasEstimates,
    anyKnown,
  };
}

export type PlanTotals = {
  min: number;
  max: number;
  upgradesWithUnknowns: number;
  upgradesCount: number;
  complete: boolean;
  anyKnown: boolean;
};

export function summarizePlan(summaries: CostSummary[]): PlanTotals {
  return summaries.reduce<PlanTotals>(
    (acc, s) => ({
      min: acc.min + s.min,
      max: acc.max + s.max,
      upgradesWithUnknowns: acc.upgradesWithUnknowns + (s.complete ? 0 : 1),
      upgradesCount: acc.upgradesCount + 1,
      complete: acc.complete && s.complete,
      anyKnown: acc.anyKnown || s.anyKnown,
    }),
    { min: 0, max: 0, upgradesWithUnknowns: 0, upgradesCount: 0, complete: true, anyKnown: false },
  );
}

/** Budget status uses the *maximum* known estimate and never claims "within budget" if unknowns remain. */
export function budgetStatus(budget: number | null, totals: PlanTotals): "no_budget" | "over" | "within" | "within_known_only" | "at_risk" {
  if (budget == null) return "no_budget";
  if (!totals.anyKnown && totals.upgradesCount > 0) return "within_known_only";
  if (totals.min > budget) return "over";
  if (totals.max > budget) return "at_risk";
  return totals.complete ? "within" : "within_known_only";
}

/** Sum of quote items; unknown item amounts make the total partial. */
export function quoteTotal(items: { amount: number | null }[]): { total: number; partial: boolean } {
  let total = 0;
  let partial = false;
  for (const it of items) {
    if (it.amount == null) partial = true;
    else total += it.amount;
  }
  return { total, partial };
}

/** Human label for a plan total: never shows "0 ₪" when nothing is known. */
export function totalLabelParts(t: { min: number; max: number; complete: boolean; anyKnown: boolean }): { known: string | null; unknown: boolean } {
  if (!t.anyKnown) return { known: null, unknown: true };
  return { known: formatIlsRange(t.min, t.max), unknown: !t.complete };
}
