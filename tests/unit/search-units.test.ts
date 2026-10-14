import { describe, it, expect } from "vitest";
import { normalize, scoreMatch, searchItems } from "@/lib/search";
import { parseTyreSize, compareTyres, psiToBar, barToPsi, formatIlsRange } from "@/lib/units";
import { catalogueSeed } from "@/db/seed/catalogue-data";
import { realParts } from "@/db/seed/parts-data";

describe("bilingual search", () => {
  it("normalizes geresh variants, niqqud and final letters", () => {
    expect(normalize("ג׳ימני")).toBe(normalize("ג'ימני"));
    expect(normalize("ג'ימני")).toBe(normalize("גימני"));
    expect(normalize("שָׁלוֹם")).toBe(normalize("שלום"));
    expect(normalize("פטרולן")).toBe("פטרולנ");
  });

  const gens = catalogueSeed.makes.flatMap((mk) =>
    (mk.models ?? []).flatMap((md) => (md.generations ?? []).map((g) => ({ slug: g.slug, terms: [mk.nameEn, mk.nameHe, ...(mk.aliases ?? []), md.nameEn, md.nameHe, ...(md.aliases ?? []), g.code, g.name, ...(g.aliases ?? [])] }))),
  );
  const find = (q: string) => searchItems(gens, q, (g) => g.terms).map((g) => g.slug);

  it.each([
    ["רנגלר", "jeep-wrangler-jl"],
    ["wrangler jl", "jeep-wrangler-jl"],
    ["ג'ימני", "suzuki-jimny-jb74"],
    ["גימני", "suzuki-jimny-jb74"],
    ["jimny", "suzuki-jimny-jb74"],
    ["פראדו", "toyota-prado-j150"],
    ["lc150", "toyota-prado-j150"],
    ["היילקס", "toyota-hilux-an120"],
    ["פג׳רו", "mitsubishi-pajero-v80"],
    ["montero", "mitsubishi-pajero-v80"],
    ["dmax", "isuzu-d-max-3"],
    ["די מקס", "isuzu-d-max-3"],
  ])("finds %s", (q, slug) => {
    expect(find(q)).toContain(slug);
  });

  it("uses AND semantics across tokens", () => {
    expect(scoreMatch("טויוטה רנגלר", ["Toyota", "Hilux"])).toBe(0);
  });

  it("finds parts by Hebrew and English aliases", () => {
    const f = (q: string) => searchItems(realParts, q, (p) => [p.nameHe, p.nameEn, p.brand, ...p.aliases]).map((p) => p.key);
    expect(f("כננת")).toContain("warn-vr-evo-10s");
    expect(f("winch")).toContain("warn-vr-evo-10s");
    expect(f("מגביה")).toContain("ome-suspension");
    expect(f("שנורקל")).toContain("safari-snorkel");
    expect(f("מגן גחון")).toContain("generic-skid-plates");
  });
});

describe("tyre and pressure units", () => {
  it("parses metric and flotation sizes", () => {
    const m = parseTyreSize("LT285/70R17")!;
    expect(m.system).toBe("metric");
    expect(m.lightTruck).toBe(true);
    expect(Math.round(m.diameterMm)).toBe(831);
    const f = parseTyreSize("35x12.50R17")!;
    expect(f.system).toBe("flotation");
    expect(Math.round(f.diameterMm)).toBe(889);
    expect(parseTyreSize("265/65 R17")?.label).toBe("265/65R17");
    expect(parseTyreSize("hello")).toBeNull();
    expect(parseTyreSize("17x35R33")).toBeNull();
  });

  it("compares diameters and speedometer effect", () => {
    const c = compareTyres("255/75R17", "285/70R17")!;
    expect(c.diameterDiffMm).toBeCloseTo(16.5, 1); // 830.8mm − 814.3mm
    expect(c.actualSpeedAtShown100).toBeGreaterThan(100);
  });

  it("converts PSI and bar", () => {
    expect(psiToBar(29.0076)).toBeCloseTo(2, 3);
    expect(barToPsi(1)).toBeCloseTo(14.5038, 3);
  });

  it("formats shekel ranges with an unknown fallback", () => {
    expect(formatIlsRange(null, null)).toBe("לא ידוע");
    expect(formatIlsRange(1000, 2000)).toContain("₪");
  });
});
