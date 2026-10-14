/**
 * Illustrated photo views for specific generations. Each view is a transparent image plus
 * tap zones in normalised image coordinates ([x0, y0, x1, y1], 0–1), laid out inside the same
 * W×H stage as the parametric drawing so zoom, pan and the component panel work unchanged.
 *
 * Zones are hand-placed approximations of where each system sits in the illustration — they
 * are for navigation, not a technical drawing.
 */
import { W, H, GROUND, type Hotspot } from "./geometry";
import type { ViewKey } from "@/lib/components";

type Zone = [key: string, x0: number, y0: number, x1: number, y1: number];
type PhotoView = { src: string; w: number; h: number; zones: Zone[] };
export type PhotoSet = { key: string; label: string; note: string; views: Record<ViewKey, PhotoView> };

const JL = "/vehicles/jeep-wrangler-jl";

/** Later zones sit on top of earlier ones, so small parts come after the large areas around them. */
export const PHOTO_SETS: Record<string, PhotoSet> = {
  "jeep-wrangler-jl": {
    key: "jeep-wrangler-jl",
    label: "ג׳יפ רנגלר JL",
    note: "איור להמחשה של רנגלר JL ארבע דלתות (חזית ואחור במבט אלכסוני) — לא תמונה של הרכב שלכם ולא של גרסה מסוימת.",
    views: {
      side: {
        src: `${JL}/side.webp`,
        w: 770,
        h: 414,
        zones: [
          ["roof_rack", 0.39, 0, 0.88, 0.12],
          ["rear_storage", 0.7, 0.14, 0.88, 0.42],
          ["engine", 0.1, 0.25, 0.29, 0.44],
          ["air_intake", 0.29, 0.2, 0.36, 0.36],
          ["lighting", 0.07, 0.35, 0.13, 0.58],
          ["front_bumper", 0, 0.45, 0.08, 0.75],
          ["tyres", 0.08, 0.58, 0.31, 1],
          ["tyres", 0.66, 0.58, 0.88, 1],
          ["front_suspension", 0.1, 0.5, 0.3, 0.6],
          ["rear_suspension", 0.65, 0.5, 0.88, 0.6],
          ["brakes", 0.17, 0.74, 0.22, 0.88],
          ["brakes", 0.75, 0.74, 0.8, 0.88],
          ["spare", 0.9, 0.22, 1, 0.62],
          ["rock_sliders", 0.32, 0.71, 0.66, 0.79],
          ["skid_plates", 0.32, 0.79, 0.66, 0.86],
        ],
      },
      front: {
        // three-quarter front view
        src: `${JL}/front.webp`,
        w: 715,
        h: 544,
        zones: [
          ["roof_rack", 0.36, 0, 0.92, 0.2],
          ["spare", 0.94, 0.2, 1, 0.48],
          ["engine", 0.24, 0.32, 0.55, 0.45],
          ["air_intake", 0.36, 0.32, 0.5, 0.41],
          ["cooling", 0.16, 0.46, 0.33, 0.65],
          ["lighting", 0.11, 0.45, 0.18, 0.57],
          ["lighting", 0.32, 0.53, 0.39, 0.64],
          ["front_bumper", 0, 0.57, 0.42, 0.82],
          ["skid_plates", 0.12, 0.82, 0.37, 0.9],
          ["tyres", 0.38, 0.66, 0.6, 1],
          ["tyres", 0.76, 0.48, 0.98, 0.82],
          ["tyres", 0.01, 0.68, 0.12, 0.84],
          ["front_suspension", 0.42, 0.56, 0.6, 0.66],
          ["brakes", 0.47, 0.8, 0.55, 0.92],
          ["rock_sliders", 0.6, 0.66, 0.78, 0.76],
        ],
      },
      rear: {
        // three-quarter rear view
        src: `${JL}/rear.webp`,
        w: 682,
        h: 504,
        zones: [
          ["roof_rack", 0.28, 0, 0.9, 0.22],
          ["rear_storage", 0.62, 0.22, 0.92, 0.36],
          ["spare", 0.67, 0.36, 0.92, 0.7],
          ["lighting", 0.55, 0.52, 0.62, 0.65],
          ["lighting", 0.92, 0.4, 0.98, 0.52],
          ["recovery_points", 0.5, 0.7, 0.98, 0.8],
          ["tyres", 0, 0.4, 0.2, 0.75],
          ["tyres", 0.36, 0.66, 0.58, 1],
          ["tyres", 0.84, 0.8, 0.98, 0.9],
          ["rear_suspension", 0.36, 0.55, 0.55, 0.66],
          ["rock_sliders", 0.17, 0.58, 0.36, 0.7],
          ["brakes", 0.42, 0.78, 0.5, 0.9],
        ],
      },
      under: {
        // seen from below, front of the vehicle on the left like the side view
        src: `${JL}/under.webp`,
        w: 677,
        h: 349,
        zones: [
          ["tyres", 0.06, 0, 0.27, 0.22],
          ["tyres", 0.06, 0.78, 0.27, 1],
          ["tyres", 0.7, 0, 0.92, 0.22],
          ["tyres", 0.7, 0.78, 0.92, 1],
          ["front_bumper", 0, 0.2, 0.05, 0.8],
          ["rock_sliders", 0.28, 0.1, 0.7, 0.22],
          ["rock_sliders", 0.28, 0.78, 0.7, 0.9],
          ["steering", 0.05, 0.25, 0.12, 0.75],
          ["front_axle", 0.12, 0.22, 0.22, 0.78],
          ["rear_axle", 0.76, 0.22, 0.85, 0.78],
          ["brakes", 0.13, 0.18, 0.21, 0.27],
          ["brakes", 0.77, 0.18, 0.84, 0.27],
          ["skid_plates", 0.29, 0.27, 0.46, 0.46],
          ["skid_plates", 0.29, 0.57, 0.46, 0.75],
          ["transmission", 0.27, 0.46, 0.4, 0.57],
          ["transfer_case", 0.4, 0.44, 0.5, 0.58],
          ["driveshafts", 0.21, 0.47, 0.27, 0.55],
          ["driveshafts", 0.62, 0.47, 0.76, 0.55],
        ],
      },
    },
  },
};

/** Where the image sits in the W×H stage: as large as fits, wheels on the ground line. */
export function photoBox(v: PhotoView) {
  const maxW = W - 40;
  const maxH = GROUND + 20 - 20;
  const k = Math.min(maxW / v.w, maxH / v.h);
  const w = v.w * k;
  const h = v.h * k;
  const bottom = Math.min(GROUND + 20, H);
  return { x: (W - w) / 2, y: bottom - h, w, h };
}

export function photoHotspots(v: PhotoView): Hotspot[] {
  const b = photoBox(v);
  return v.zones.map(([key, x0, y0, x1, y1]) => ({ key, x: b.x + x0 * b.w, y: b.y + y0 * b.h, w: (x1 - x0) * b.w, h: (y1 - y0) * b.h }));
}

/** Picks a photo set for a catalogue generation, or for free-text make/model when not linked. */
export function photoSetFor(input: { generationSlug?: string | null; make?: string | null; model?: string | null; year?: number | null }): string | null {
  if (input.generationSlug) return PHOTO_SETS[input.generationSlug] ? input.generationSlug : null;
  const text = `${input.make ?? ""} ${input.model ?? ""}`;
  // JL replaced the JK for model year 2018–19; only claim JL when the year rules out a JK
  if (/wrangler|רנגלר|ראנגלר/i.test(text) && (input.year ?? 0) >= 2019) return "jeep-wrangler-jl";
  return null;
}
