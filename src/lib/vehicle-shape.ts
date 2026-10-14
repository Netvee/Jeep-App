import type { Archetype, BodyStyle } from "@/db/schema";
import type { ShapeInput } from "@/components/vehicle/geometry";
import { parseTyreSize } from "./units";

/** Default archetype from body style when the vehicle isn't linked to a catalogue variant. */
export function archetypeFor(body: BodyStyle | null | undefined, variantArchetype?: Archetype | null): Archetype {
  if (variantArchetype) return variantArchetype;
  if (body?.startsWith("pickup")) return "pickup";
  if (body === "suv-2door") return "boxy-short";
  return "boxy-long";
}

export function buildShape(input: {
  archetype: Archetype;
  wheelbaseMm: number | null;
  tyreSize: string | null;
  liftCm: number | null;
  suspensionFront?: string | null;
  suspensionRear?: string | null;
  body: BodyStyle | null;
}): ShapeInput {
  const t = parseTyreSize(input.tyreSize);
  const ifs = (v?: string | null) => !!v && /עצמאי|independent|ifs/i.test(v);
  return {
    archetype: input.archetype,
    wheelbaseMm: input.wheelbaseMm,
    tyreDiameterMm: t?.diameterMm ?? null,
    tyreWidthMm: t?.widthMm ?? null,
    rimIn: t?.rimIn ?? null,
    liftCm: Math.max(0, Math.min(input.liftCm ?? 0, 20)),
    frontIfs: ifs(input.suspensionFront) || (input.archetype === "wagon" || input.archetype === "pickup") && !input.suspensionFront,
    rearIfs: ifs(input.suspensionRear),
    fourDoor: input.body ? input.body !== "suv-2door" && input.body !== "pickup-single" : input.archetype !== "boxy-short" && input.archetype !== "compact-boxy",
  };
}
