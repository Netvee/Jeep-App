import { describe, it, expect } from "vitest";
import { matchTrail, type VehicleCapability } from "@/lib/trails";
import { triage } from "@/lib/triage";
import { sniff, stripJpegMetadata, stripPngMetadata } from "@/server/uploads";
import { buildChecklist } from "@/lib/checklists";
import { checkPlan, type PlanItem } from "@/lib/plan-checks";

const capable: VehicleCapability = { groundClearanceCm: 26, hasLowRange: true, lockers: "front_rear", tyreType: "mt", hasRecoveryGear: true, driverExperience: "advanced" };

describe("trail matching", () => {
  const hard = { difficulty: 4, requirements: { minGroundClearanceCm: 25, lowRange: true, tyres: "mt" as const, lockersRecommended: true }, driverExperience: "advanced" as const };

  it("matches a capable vehicle and explains each check", () => {
    const m = matchTrail(hard, capable);
    expect(m.verdict).toBe("suitable");
    expect(m.checks.every((c) => c.state === "met")).toBe(true);
  });

  it("reports missing information instead of guessing", () => {
    const m = matchTrail(hard, { ...capable, groundClearanceCm: null, lockers: null });
    expect(m.verdict).toBe("caution");
    expect(m.missing).toEqual(expect.arrayContaining(["מרווח גחון של הרכב", "נעילות דיפרנציאל"]));
  });

  it("does not recommend a hard trail for a beginner without low range", () => {
    const m = matchTrail(hard, { ...capable, hasLowRange: false, driverExperience: "beginner" });
    expect(m.verdict).toBe("not_recommended");
  });

  it("flags an unrated trail as insufficient information", () => {
    expect(matchTrail({ difficulty: null, requirements: {}, driverExperience: null }, capable).verdict).toBe("insufficient_info");
  });
});

describe("triage safety", () => {
  it.each([
    ["warning_light", { light: "oil_pressure" }],
    ["warning_light", { light: "temperature" }],
    ["warning_light", { light: "check_engine", flashing: "yes" }],
    ["leak_smell", { type: "fuel" }],
    ["leak_smell", { type: "brake_fluid" }],
    ["overheating", { gauge: "red" }],
    ["behaviour", { symptom: "brakes" }],
    ["starting", { water: "yes", symptom: "cranks" }],
    ["noise", { when: "braking", type: "grinding" }],
  ])("%s %o → stop safely", (cat, answers) => {
    const r = triage(cat, answers as Record<string, string>);
    expect(r.urgency).toBe("stop");
    expect(r.nextSteps.join(" ")).toMatch(/עצרו/);
  });

  it("does not escalate a benign TPMS light", () => {
    expect(triage("warning_light", { light: "tpms", color: "amber" }).urgency).toBe("observe");
  });

  it("labels causes as possibilities, never a diagnosis", () => {
    const r = triage("overheating", { gauge: "high", context: "mud" });
    expect(r.urgency).toBe("workshop");
    expect(r.possibleCauses.length).toBeGreaterThan(0);
  });
});

describe("upload validation", () => {
  it("identifies files by magic bytes, not by name", () => {
    expect(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe("image/jpeg");
    expect(sniff(Buffer.from("%PDF-1.7 hello world"))?.kind).toBe("pdf");
    expect(sniff(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(sniff(Buffer.from("MZ\x90\x00 executable......."))).toBeNull();
  });

  it("strips EXIF (incl. GPS) segments from JPEG", () => {
    const exif = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, 0x0b]), Buffer.from("Exif\0\0GPS")]);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), exif, Buffer.from([0xff, 0xda, 0x00, 0x04, 0x01, 0x02, 0xaa, 0xbb, 0xff, 0xd9])]);
    const out = stripJpegMetadata(jpeg);
    expect(out.includes(Buffer.from("Exif"))).toBe(false);
    expect(out.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(out.includes(Buffer.from([0xff, 0xda]))).toBe(true);
  });

  it("strips text/EXIF chunks from PNG", () => {
    const chunk = (type: string, data: Buffer) => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length);
      return Buffer.concat([len, Buffer.from(type, "latin1"), data, Buffer.alloc(4)]);
    };
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", Buffer.alloc(13)), chunk("eXIf", Buffer.from("GPSDATA")), chunk("IEND", Buffer.alloc(0))]);
    const out = stripPngMetadata(png);
    expect(out.includes(Buffer.from("GPSDATA"))).toBe(false);
    expect(out.includes(Buffer.from("IHDR"))).toBe(true);
  });
});

describe("post-trip checks depend on conditions and equipment", () => {
  it("adds water-crossing checks only after water", () => {
    expect(buildChecklist("post", ["dust"]).join(" ")).not.toMatch(/דיפרנציאל/);
    expect(buildChecklist("post", ["water"]).join(" ")).toMatch(/דיפרנציאל/);
  });
  it("adds winch care only when a winch is installed", () => {
    expect(buildChecklist("post", [], {}).join(" ")).not.toMatch(/כננת/);
    expect(buildChecklist("post", [], { winch: true }).join(" ")).toMatch(/כננת/);
  });
});

describe("plan dependency checks", () => {
  const item = (p: Partial<PlanItem>): PlanItem => ({
    id: Math.random().toString(),
    name: "x",
    status: "planned",
    componentKey: "front_bumper",
    overlay: null,
    requiredSupporting: [],
    conflictsWith: [],
    tyreSize: null,
    liftCm: null,
    fitment: "verified",
    alternativeGroup: null,
    ...p,
  });
  const facts = { tyreSize: "255/75R17", liftCm: 0, lockers: "none" as const, intendedUse: [], driverExperience: null };

  it("warns about a winch without a compatible bumper", () => {
    const w = item({ overlay: "winch", name: "winch" });
    expect(checkPlan([w], facts).some((c) => c.level === "warning" && c.itemId === w.id)).toBe(true);
    expect(checkPlan([w, item({ overlay: "bumper" })], facts).some((c) => c.level === "warning" && c.itemId === w.id)).toBe(false);
  });

  it("warns about much bigger tyres without lift", () => {
    const t = item({ componentKey: "tyres", tyreSize: "35x12.50R17" });
    expect(checkPlan([t], facts).some((c) => c.level === "warning")).toBe(true);
  });

  it("reports documented incompatibility as a conflict", () => {
    const x = item({ fitment: "incompatible" });
    expect(checkPlan([x], facts).some((c) => c.level === "conflict")).toBe(true);
  });
});
