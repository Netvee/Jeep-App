import { describe, it, expect } from "vitest";
import { resolveFitment, type FitmentRow } from "@/lib/fitment";

const RUBICON = "variant-jl-rubicon";
const SAHARA = "variant-jl-sahara";

const rows: FitmentRow[] = [{ variantId: RUBICON, status: "verified", evidence: "Manufacturer fitment guide p.12", verifiedAt: "2026-01-10" }];

describe("variant-specific compatibility", () => {
  it("returns the exact variant's verified status", () => {
    expect(resolveFitment({ variantId: RUBICON, year: 2021, variantYearFrom: 2018, variantYearTo: null }, rows).status).toBe("verified");
  });

  it("never inherits fitment from a sibling variant of the same model/generation", () => {
    // Sahara is the same JL generation; a Rubicon-only verification must NOT apply
    const r = resolveFitment({ variantId: SAHARA, year: 2021, variantYearFrom: 2018, variantYearTo: null }, rows);
    expect(r.status).toBe("unconfirmed");
    expect(r.row).toBeNull();
  });

  it("treats a vehicle not linked to a catalogue variant as unconfirmed with an explanation", () => {
    const r = resolveFitment({ variantId: null, year: 2021 }, rows);
    expect(r.status).toBe("unconfirmed");
    expect(r.warnings.join(" ")).toMatch(/גרסה/);
  });

  it("downgrades a 'verified' row that lacks evidence or a verification date", () => {
    const r = resolveFitment({ variantId: RUBICON, year: 2021 }, [{ variantId: RUBICON, status: "verified", evidence: null, verifiedAt: "2026-01-01" }]);
    expect(r.status).toBe("unconfirmed");
  });

  it("downgrades when the vehicle's year is outside the variant's range", () => {
    const r = resolveFitment({ variantId: RUBICON, year: 2016, variantYearFrom: 2018, variantYearTo: null }, rows);
    expect(r.status).toBe("unconfirmed");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("keeps a documented incompatibility as incompatible", () => {
    const r = resolveFitment({ variantId: SAHARA, year: 2020 }, [{ variantId: SAHARA, status: "incompatible", evidence: "requires Rubicon axle", verifiedAt: null }]);
    expect(r.status).toBe("incompatible");
  });
});
