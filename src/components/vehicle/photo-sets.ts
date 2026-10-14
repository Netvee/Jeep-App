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
const RANGER = "/vehicles/ford-ranger-p703";
const BRONCO = "/vehicles/ford-bronco-u725";
const DMAX = "/vehicles/isuzu-d-max-3";

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
  "ford-ranger-p703": {
    key: "ford-ranger-p703",
    label: "פורד ריינג׳ר P703",
    note: "איור להמחשה של ריינג׳ר P703 קבינה כפולה (חזית ואחור במבט אלכסוני) — לא תמונה של הרכב שלכם ולא של גרסה מסוימת.",
    views: {
      side: {
        src: `${RANGER}/side.webp`,
        w: 781,
        h: 320,
        zones: [
          ["roof_rack", 0.26, 0.08, 0.67, 0.18],
          ["rear_storage", 0.68, 0.28, 0.95, 0.6],
          ["engine", 0.03, 0.3, 0.27, 0.44],
          ["lighting", 0, 0.42, 0.06, 0.57],
          ["lighting", 0.95, 0.35, 1, 0.55],
          ["front_bumper", 0, 0.57, 0.06, 0.78],
          ["tyres", 0.07, 0.58, 0.24, 1],
          ["tyres", 0.7, 0.58, 0.87, 1],
          ["front_suspension", 0.07, 0.5, 0.24, 0.6],
          ["rear_suspension", 0.7, 0.5, 0.87, 0.6],
          ["brakes", 0.13, 0.72, 0.17, 0.88],
          ["brakes", 0.76, 0.72, 0.8, 0.88],
          ["rock_sliders", 0.27, 0.74, 0.67, 0.82],
          ["recovery_points", 0.88, 0.6, 1, 0.74],
        ],
      },
      front: {
        // three-quarter front view
        src: `${RANGER}/front.webp`,
        w: 781,
        h: 450,
        zones: [
          ["roof_rack", 0.35, 0.05, 0.82, 0.18],
          ["rear_storage", 0.8, 0.2, 1, 0.47],
          ["engine", 0.08, 0.3, 0.5, 0.44],
          ["cooling", 0.04, 0.45, 0.28, 0.63],
          ["lighting", 0.28, 0.47, 0.39, 0.62],
          ["lighting", 0.01, 0.44, 0.05, 0.58],
          ["front_bumper", 0, 0.63, 0.4, 0.85],
          ["skid_plates", 0.17, 0.85, 0.36, 0.92],
          ["tyres", 0.36, 0.62, 0.55, 1],
          ["tyres", 0.81, 0.47, 0.94, 0.79],
          ["tyres", 0.02, 0.85, 0.17, 0.93],
          ["front_suspension", 0.38, 0.52, 0.56, 0.62],
          ["brakes", 0.43, 0.73, 0.5, 0.86],
          ["rock_sliders", 0.56, 0.66, 0.81, 0.77],
        ],
      },
      rear: {
        // three-quarter rear view
        src: `${RANGER}/rear.webp`,
        w: 684,
        h: 412,
        zones: [
          ["roof_rack", 0.25, 0, 0.75, 0.12],
          ["rear_storage", 0.05, 0.25, 0.4, 0.6],
          ["lighting", 0, 0.37, 0.05, 0.58],
          ["lighting", 0.38, 0.42, 0.46, 0.6],
          ["recovery_points", 0, 0.62, 0.44, 0.77],
          ["tyres", 0.46, 0.6, 0.62, 1],
          ["tyres", 0.85, 0.45, 0.99, 0.8],
          ["tyres", 0.07, 0.79, 0.21, 0.95],
          ["rear_axle", 0.22, 0.77, 0.44, 0.86],
          ["recovery_points", 0.16, 0.74, 0.22, 0.82],
          ["rear_suspension", 0.47, 0.5, 0.6, 0.6],
          ["rock_sliders", 0.62, 0.63, 0.86, 0.73],
          ["brakes", 0.52, 0.72, 0.58, 0.86],
        ],
      },
      under: {
        // seen from below, front of the vehicle on the left like the side view
        src: `${RANGER}/under.webp`,
        w: 704,
        h: 294,
        zones: [
          ["tyres", 0.09, 0, 0.27, 0.17],
          ["tyres", 0.09, 0.83, 0.27, 1],
          ["tyres", 0.65, 0, 0.83, 0.17],
          ["tyres", 0.65, 0.83, 0.83, 1],
          ["front_bumper", 0, 0.15, 0.06, 0.85],
          ["steering", 0.06, 0.3, 0.11, 0.7],
          ["front_suspension", 0.12, 0.15, 0.3, 0.29],
          ["front_suspension", 0.12, 0.71, 0.3, 0.85],
          ["engine", 0.11, 0.29, 0.2, 0.71],
          ["transmission", 0.2, 0.32, 0.33, 0.64],
          ["transfer_case", 0.33, 0.4, 0.4, 0.6],
          ["driveshafts", 0.4, 0.45, 0.7, 0.55],
          ["rear_suspension", 0.62, 0.17, 0.92, 0.27],
          ["rear_suspension", 0.62, 0.73, 0.92, 0.83],
          ["rear_axle", 0.71, 0.27, 0.77, 0.73],
          ["spare", 0.78, 0.3, 0.95, 0.72],
        ],
      },
    },
  },
  "ford-bronco-u725": {
    key: "ford-bronco-u725",
    label: "פורד ברונקו U725",
    note: "איור להמחשה של ברונקו U725 ארבע דלתות (חזית ואחור במבט אלכסוני) — לא תמונה של הרכב שלכם ולא של גרסה מסוימת.",
    views: {
      side: {
        src: `${BRONCO}/side.webp`,
        w: 750,
        h: 317,
        zones: [
          ["roof_rack", 0.38, 0, 0.92, 0.09],
          ["rear_storage", 0.71, 0.08, 0.92, 0.32],
          ["engine", 0.03, 0.27, 0.3, 0.42],
          ["lighting", 0, 0.38, 0.05, 0.55],
          ["lighting", 0.91, 0.35, 0.95, 0.53],
          ["front_bumper", 0, 0.55, 0.07, 0.73],
          ["tyres", 0.06, 0.54, 0.27, 1],
          ["tyres", 0.66, 0.54, 0.87, 1],
          ["spare", 0.92, 0.2, 1, 0.65],
          ["front_suspension", 0.07, 0.46, 0.27, 0.56],
          ["rear_suspension", 0.66, 0.46, 0.87, 0.56],
          ["brakes", 0.14, 0.71, 0.19, 0.85],
          ["brakes", 0.75, 0.71, 0.79, 0.85],
          ["rock_sliders", 0.29, 0.71, 0.65, 0.78],
          ["recovery_points", 0.87, 0.6, 0.97, 0.71],
        ],
      },
      front: {
        // three-quarter front view
        src: `${BRONCO}/front.webp`,
        w: 746,
        h: 415,
        zones: [
          ["roof_rack", 0.36, 0, 0.95, 0.1],
          ["spare", 0.95, 0.25, 1, 0.55],
          ["engine", 0.05, 0.27, 0.55, 0.41],
          ["cooling", 0.04, 0.42, 0.38, 0.57],
          ["lighting", 0.01, 0.4, 0.06, 0.56],
          ["lighting", 0.31, 0.42, 0.38, 0.56],
          ["front_bumper", 0, 0.57, 0.43, 0.73],
          ["recovery_points", 0.06, 0.61, 0.1, 0.7],
          ["recovery_points", 0.23, 0.63, 0.27, 0.71],
          ["skid_plates", 0.08, 0.73, 0.38, 0.8],
          ["tyres", 0.37, 0.56, 0.58, 1],
          ["tyres", 0.82, 0.49, 0.97, 0.87],
          ["tyres", 0.01, 0.8, 0.2, 0.93],
          ["front_suspension", 0.42, 0.47, 0.58, 0.57],
          ["brakes", 0.47, 0.72, 0.53, 0.84],
          ["rock_sliders", 0.58, 0.66, 0.82, 0.75],
        ],
      },
      rear: {
        // three-quarter rear view
        src: `${BRONCO}/rear.webp`,
        w: 708,
        h: 422,
        zones: [
          ["roof_rack", 0.24, 0, 0.92, 0.1],
          ["rear_storage", 0.59, 0.06, 0.93, 0.2],
          ["spare", 0.66, 0.2, 0.92, 0.66],
          ["lighting", 0.53, 0.34, 0.59, 0.52],
          ["lighting", 0.94, 0.34, 0.99, 0.52],
          ["recovery_points", 0.47, 0.6, 0.99, 0.74],
          ["tyres", 0, 0.54, 0.16, 0.93],
          ["tyres", 0.34, 0.54, 0.55, 1],
          ["tyres", 0.79, 0.74, 0.97, 0.96],
          ["rear_axle", 0.55, 0.74, 0.79, 0.84],
          ["rear_suspension", 0.35, 0.46, 0.53, 0.55],
          ["rock_sliders", 0.13, 0.69, 0.34, 0.77],
          ["brakes", 0.4, 0.72, 0.46, 0.86],
        ],
      },
      under: {
        // seen from below, front of the vehicle on the left like the side view
        src: `${BRONCO}/under.webp`,
        w: 722,
        h: 337,
        zones: [
          ["tyres", 0.07, 0, 0.25, 0.15],
          ["tyres", 0.07, 0.85, 0.25, 1],
          ["tyres", 0.68, 0, 0.86, 0.15],
          ["tyres", 0.68, 0.85, 0.86, 1],
          ["front_bumper", 0, 0.12, 0.06, 0.88],
          ["spare", 0.95, 0.25, 1, 0.75],
          ["steering", 0.06, 0.3, 0.11, 0.7],
          ["front_suspension", 0.1, 0.15, 0.3, 0.3],
          ["front_suspension", 0.1, 0.7, 0.3, 0.85],
          ["front_axle", 0.11, 0.3, 0.21, 0.65],
          ["skid_plates", 0.33, 0.1, 0.6, 0.33],
          ["skid_plates", 0.33, 0.7, 0.6, 0.9],
          ["transmission", 0.23, 0.38, 0.34, 0.6],
          ["transfer_case", 0.34, 0.4, 0.39, 0.58],
          ["driveshafts", 0.39, 0.44, 0.72, 0.54],
          ["rear_axle", 0.72, 0.3, 0.78, 0.7],
          ["rear_suspension", 0.68, 0.15, 0.78, 0.3],
          ["rear_suspension", 0.68, 0.7, 0.78, 0.85],
        ],
      },
    },
  },
  "isuzu-d-max-3": {
    key: "isuzu-d-max-3",
    label: "איסוזו די-מקס RG",
    note: "איור להמחשה של די-מקס RG קבינה כפולה (חזית ואחור במבט אלכסוני) — לא תמונה של הרכב שלכם ולא של גרסה מסוימת.",
    views: {
      side: {
        src: `${DMAX}/side.webp`,
        w: 788,
        h: 298,
        zones: [
          ["roof_rack", 0.28, 0.02, 0.67, 0.09],
          ["rear_storage", 0.68, 0.25, 0.94, 0.55],
          ["engine", 0.02, 0.27, 0.27, 0.42],
          ["lighting", 0, 0.38, 0.08, 0.48],
          ["lighting", 0.94, 0.28, 0.99, 0.55],
          ["front_bumper", 0, 0.48, 0.07, 0.72],
          ["tyres", 0.07, 0.55, 0.25, 1],
          ["tyres", 0.68, 0.55, 0.86, 1],
          ["front_suspension", 0.07, 0.47, 0.25, 0.56],
          ["rear_suspension", 0.68, 0.47, 0.86, 0.56],
          ["brakes", 0.14, 0.71, 0.18, 0.87],
          ["brakes", 0.75, 0.71, 0.79, 0.87],
          ["rock_sliders", 0.26, 0.73, 0.67, 0.81],
          ["recovery_points", 0.94, 0.58, 1, 0.72],
        ],
      },
      front: {
        // three-quarter front view
        src: `${DMAX}/front.webp`,
        w: 781,
        h: 416,
        zones: [
          ["roof_rack", 0.3, 0, 0.8, 0.1],
          ["rear_storage", 0.82, 0.18, 1, 0.47],
          ["engine", 0.04, 0.27, 0.5, 0.44],
          ["cooling", 0.04, 0.47, 0.23, 0.68],
          ["lighting", 0.23, 0.44, 0.37, 0.56],
          ["lighting", 0.27, 0.6, 0.33, 0.72],
          ["front_bumper", 0, 0.68, 0.38, 0.82],
          ["skid_plates", 0.18, 0.82, 0.35, 0.88],
          ["tyres", 0.35, 0.58, 0.53, 1],
          ["tyres", 0.8, 0.47, 0.94, 0.8],
          ["tyres", 0.03, 0.8, 0.18, 0.88],
          ["front_suspension", 0.38, 0.5, 0.53, 0.59],
          ["brakes", 0.43, 0.73, 0.49, 0.86],
          ["rock_sliders", 0.54, 0.64, 0.8, 0.79],
        ],
      },
      rear: {
        // three-quarter rear view
        src: `${DMAX}/rear.webp`,
        w: 701,
        h: 396,
        zones: [
          ["roof_rack", 0.16, 0, 0.67, 0.08],
          ["rear_storage", 0.36, 0.27, 0.96, 0.63],
          ["lighting", 0.55, 0.39, 0.63, 0.63],
          ["lighting", 0.96, 0.33, 1, 0.56],
          ["recovery_points", 0.58, 0.63, 0.98, 0.79],
          ["tyres", 0, 0.42, 0.13, 0.73],
          ["tyres", 0.35, 0.58, 0.51, 1],
          ["tyres", 0.73, 0.79, 0.88, 0.92],
          ["rear_axle", 0.6, 0.79, 0.73, 0.86],
          ["rear_suspension", 0.35, 0.5, 0.5, 0.58],
          ["rock_sliders", 0.11, 0.62, 0.35, 0.73],
          ["brakes", 0.38, 0.73, 0.44, 0.86],
        ],
      },
      under: {
        // seen from below, front of the vehicle on the left like the side view
        src: `${DMAX}/under.webp`,
        w: 712,
        h: 307,
        zones: [
          ["tyres", 0.08, 0, 0.27, 0.14],
          ["tyres", 0.08, 0.86, 0.27, 1],
          ["tyres", 0.68, 0, 0.87, 0.14],
          ["tyres", 0.68, 0.86, 0.87, 1],
          ["front_bumper", 0, 0.1, 0.06, 0.9],
          ["steering", 0.06, 0.3, 0.11, 0.7],
          ["front_suspension", 0.1, 0.14, 0.3, 0.3],
          ["front_suspension", 0.1, 0.7, 0.3, 0.86],
          ["engine", 0.12, 0.33, 0.2, 0.68],
          ["transmission", 0.2, 0.35, 0.34, 0.66],
          ["transfer_case", 0.34, 0.4, 0.4, 0.6],
          ["driveshafts", 0.4, 0.45, 0.72, 0.55],
          ["rear_suspension", 0.66, 0.17, 0.95, 0.28],
          ["rear_suspension", 0.66, 0.72, 0.95, 0.83],
          ["rear_axle", 0.73, 0.28, 0.78, 0.72],
          ["spare", 0.8, 0.3, 0.95, 0.7],
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
  // the P703 Ranger arrived in Israel as a 2023 model; earlier years are the T6/PX
  if (/ranger|ריינג/i.test(text) && (input.year ?? 0) >= 2023) return "ford-ranger-p703";
  if (/d-?max|די.?מקס|דימקס/i.test(text) && (input.year ?? 0) >= 2021) return "isuzu-d-max-3";
  if (/bronco|ברונקו/i.test(text) && !/sport|ספורט/i.test(text) && (input.year ?? 0) >= 2021) return "ford-bronco-u725";
  return null;
}
