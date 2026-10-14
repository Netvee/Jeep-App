import { describe, it, expect } from "vitest";
import { summarizeCosts, summarizePlan, budgetStatus, quoteTotal, totalLabelParts, type CostLine } from "@/lib/costs";

const line = (kind: CostLine["kind"], min: number | null, max: number | null = min, extra: Partial<CostLine> = {}): CostLine => ({
  kind,
  amountMin: min,
  amountMax: max,
  includesVat: true,
  source: "quote",
  notApplicable: false,
  ...extra,
});

describe("incomplete price totals", () => {
  it("never counts a missing cost kind as zero", () => {
    const s = summarizeCosts([line("part", 5000, 7000)]);
    expect(s.min).toBe(5000);
    expect(s.max).toBe(7000);
    expect(s.complete).toBe(false);
    expect(s.unknownKinds).toEqual(["labour", "supporting", "shipping"]);
  });

  it("is complete only when every kind is known or explicitly not applicable", () => {
    const s = summarizeCosts([
      line("part", 5000),
      line("labour", 1200, 1500),
      line("supporting", null, null, { notApplicable: true }),
      line("shipping", null, null, { notApplicable: true }),
    ]);
    expect(s.complete).toBe(true);
    expect(s.min).toBe(6200);
    expect(s.max).toBe(6500);
  });

  it("treats a line without any amount as unknown", () => {
    const s = summarizeCosts([line("part", null, null)]);
    expect(s.unknownKinds).toContain("part");
    expect(s.anyKnown).toBe(false);
  });

  it("flags unknown or mixed VAT status", () => {
    expect(summarizeCosts([line("part", 100, 100, { includesVat: null })]).vatUncertain).toBe(true);
    expect(summarizeCosts([line("part", 100), line("labour", 100, 100, { includesVat: false })]).vatUncertain).toBe(true);
    expect(summarizeCosts([line("part", 100), line("labour", 100)]).vatUncertain).toBe(false);
  });

  it("never displays 0 ₪ when nothing is known", () => {
    const plan = summarizePlan([summarizeCosts([]), summarizeCosts([])]);
    expect(plan.anyKnown).toBe(false);
    expect(totalLabelParts(plan).known).toBeNull();
  });

  it("does not claim 'within budget' while unknown costs remain", () => {
    const plan = summarizePlan([summarizeCosts([line("part", 1000)])]);
    expect(budgetStatus(5000, plan)).toBe("within_known_only");
    const full = summarizePlan([
      summarizeCosts([line("part", 1000), line("labour", 0, 0), line("supporting", null, null, { notApplicable: true }), line("shipping", null, null, { notApplicable: true })]),
    ]);
    expect(budgetStatus(5000, full)).toBe("within");
    expect(budgetStatus(800, full)).toBe("over");
    const ranged = summarizePlan([summarizeCosts([line("part", 4000, 6000)])]);
    expect(budgetStatus(5000, ranged)).toBe("at_risk");
  });

  it("marks quote totals with missing line amounts as partial", () => {
    expect(quoteTotal([{ amount: 100 }, { amount: null }])).toEqual({ total: 100, partial: true });
    expect(quoteTotal([{ amount: 100 }, { amount: 50 }])).toEqual({ total: 150, partial: false });
  });
});
