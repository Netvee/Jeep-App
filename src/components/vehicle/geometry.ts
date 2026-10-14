/**
 * Parametric geometry for the generic vehicle illustration.
 *
 * Proportions come from an archetype (boxy short/long, compact, wagon, pickup) scaled by the
 * vehicle's wheelbase and tyre diameter, with the body raised by lift and tyre growth.
 * This is a COSMETIC illustration: it is not a drawing of a specific trim and it does not
 * model clearance, articulation or suspension geometry.
 */
import type { Archetype } from "@/db/schema";

export type ArchetypeDims = {
  label: string;
  wb: number; // default wheelbase, mm
  fo: number; // front overhang
  ro: number; // rear overhang
  rocker: number; // body bottom height above ground (stock)
  hoodF: number; // top of nose
  cowl: number; // hood height at windshield base
  belt: number; // window sill
  roof: number;
  hoodLen: number; // from body front to windshield base
  rake: number; // windshield horizontal run
  tyre: number; // stock tyre diameter
  track: number;
  width: number;
  rearStyle: "vertical" | "slant" | "bed";
  cabLen?: number; // pickups: front of body → back of cab
  bedTop?: number;
  spareRear: boolean;
  flares: boolean;
  roundLights: boolean;
};

export const ARCHETYPES: Record<Archetype, ArchetypeDims> = {
  "boxy-long": { label: "שטח מרובע ארוך", wb: 3008, fo: 800, ro: 880, rocker: 470, hoodF: 1080, cowl: 1150, belt: 1260, roof: 1850, hoodLen: 1300, rake: 330, tyre: 790, track: 1600, width: 1890, rearStyle: "vertical", spareRear: true, flares: true, roundLights: true },
  "boxy-short": { label: "שטח מרובע קצר", wb: 2459, fo: 800, ro: 800, rocker: 470, hoodF: 1080, cowl: 1150, belt: 1260, roof: 1850, hoodLen: 1300, rake: 330, tyre: 790, track: 1600, width: 1890, rearStyle: "vertical", spareRear: true, flares: true, roundLights: true },
  "compact-boxy": { label: "שטח קומפקטי", wb: 2250, fo: 560, ro: 620, rocker: 400, hoodF: 950, cowl: 1000, belt: 1100, roof: 1720, hoodLen: 880, rake: 240, tyre: 693, track: 1400, width: 1650, rearStyle: "vertical", spareRear: true, flares: true, roundLights: true },
  wagon: { label: "רכב שטח סטיישן", wb: 2790, fo: 880, ro: 1050, rocker: 470, hoodF: 950, cowl: 1100, belt: 1200, roof: 1860, hoodLen: 1250, rake: 560, tyre: 780, track: 1590, width: 1885, rearStyle: "slant", spareRear: false, flares: false, roundLights: false },
  pickup: { label: "טנדר קבינה כפולה", wb: 3085, fo: 900, ro: 1300, rocker: 480, hoodF: 1000, cowl: 1120, belt: 1180, roof: 1800, hoodLen: 1300, rake: 520, tyre: 775, track: 1550, width: 1855, rearStyle: "bed", cabLen: 2600, bedTop: 1170, spareRear: false, flares: false, roundLights: false },
};

export type ShapeInput = {
  archetype: Archetype;
  wheelbaseMm: number | null;
  tyreDiameterMm: number | null;
  tyreWidthMm: number | null;
  rimIn: number | null;
  liftCm: number;
  frontIfs: boolean;
  rearIfs: boolean;
  fourDoor: boolean;
};

export const W = 1000;
export const H = 480;
export const GROUND = 420;

export function sideGeometry(sh: ShapeInput) {
  const a = ARCHETYPES[sh.archetype];
  const wb = sh.wheelbaseMm ?? a.wb;
  const len = a.fo + wb + a.ro;
  const s = Math.min(0.175, 840 / len);
  const D = sh.tyreDiameterMm ?? a.tyre;
  const R = (D / 2) * s;
  const Rstock = (a.tyre / 2) * s;
  const liftPx = sh.liftCm * 10 * s;
  const raise = R - Rstock + liftPx;
  const x0 = (W - len * s) / 2;
  const fx = x0 + a.fo * s;
  const rx = fx + wb * s;
  const xEnd = x0 + len * s;
  const axleY = GROUND - R;
  const y = (mm: number) => GROUND - mm * s - raise;
  const X = (mm: number) => x0 + mm * s; // mm from body front
  const archR = Math.max(Rstock * 1.2, R * 1.06);
  const archCY = GROUND - Rstock - raise;
  const rimR = sh.rimIn ? ((sh.rimIn * 25.4) / 2) * s : R * 0.58;
  return { a, s, wb, len, D, R, Rstock, liftPx, raise, x0, fx, rx, xEnd, axleY, y, X, archR, archCY, rimR };
}
export type SideGeo = ReturnType<typeof sideGeometry>;

export function frontGeometry(sh: ShapeInput) {
  const a = ARCHETYPES[sh.archetype];
  const s = 0.19;
  const cx = W / 2;
  const D = sh.tyreDiameterMm ?? a.tyre;
  const R = (D / 2) * s;
  const Rstock = (a.tyre / 2) * s;
  const raise = R - Rstock + sh.liftCm * 10 * s;
  const tw = (sh.tyreWidthMm ?? 265) * s;
  const halfTrack = (a.track / 2) * s;
  const halfW = (a.width / 2) * s;
  const y = (mm: number) => GROUND - mm * s - raise;
  const axleY = GROUND - R;
  return { a, s, cx, D, R, raise, tw, halfTrack, halfW, y, axleY };
}
export type FrontGeo = ReturnType<typeof frontGeometry>;

export function underGeometry(sh: ShapeInput) {
  const a = ARCHETYPES[sh.archetype];
  const wb = sh.wheelbaseMm ?? a.wb;
  const len = a.fo + wb + a.ro;
  const s = Math.min(0.2, 860 / len, 400 / a.width);
  const x0 = (W - len * s) / 2;
  const fx = x0 + a.fo * s;
  const rx = fx + wb * s;
  const cy = H / 2;
  const halfW = (a.width / 2) * s;
  const halfTrack = (a.track / 2) * s;
  const D = (sh.tyreDiameterMm ?? a.tyre) * s;
  const tw = (sh.tyreWidthMm ?? 265) * s;
  const rail = halfTrack * 0.42;
  return { a, s, wb, len, x0, fx, rx, cy, halfW, halfTrack, D, tw, rail, xEnd: x0 + len * s };
}
export type UnderGeo = ReturnType<typeof underGeometry>;

export type Hotspot = { key: string; x: number; y: number; w: number; h: number };

/** Hotspot rectangles per view, positioned from the same geometry as the drawing. */
export function hotspots(view: "side" | "front" | "rear" | "under", sh: ShapeInput): Hotspot[] {
  if (view === "side") {
    const g = sideGeometry(sh);
    const { a, y, X, fx, rx, R, axleY } = g;
    const box = (key: string, x1: number, y1: number, x2: number, y2: number): Hotspot => ({ key, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
    const roofEnd = a.rearStyle === "bed" ? X(a.cabLen! - 60) : X(g.len - 80);
    return [
      box("tyres", fx - R, axleY - R, fx + R, axleY + R),
      box("tyres", rx - R, axleY - R, rx + R, axleY + R),
      box("front_suspension", fx - R * 0.5, y(a.rocker + 60), fx + R * 0.5, axleY - R * 0.2),
      box("rear_suspension", rx - R * 0.5, y(a.rocker + 60), rx + R * 0.5, axleY - R * 0.2),
      box("engine", X(200), y(a.hoodF - 80), X(a.hoodLen - 150), y(a.rocker + 250)),
      box("roof_rack", X(a.hoodLen + a.rake + 40), y(a.roof + 160), roofEnd, y(a.roof - 30)),
      box("front_bumper", X(-110), y(a.rocker + 260), X(170), y(a.rocker - 80)),
      box("rock_sliders", fx + R * 1.25, y(a.rocker + 70), rx - R * 1.25, y(a.rocker - 60)),
      box("air_intake", X(a.hoodLen - 250), y(a.roof + 100), X(a.hoodLen + a.rake * 0.6), y(a.cowl - 150)),
      box("skid_plates", fx + R * 0.9, y(a.rocker - 30), fx + g.wb * g.s * 0.55, y(a.rocker - 170)),
      box("rear_storage", a.rearStyle === "bed" ? X(a.cabLen! + 80) : X(g.len - 700), y(a.belt + 200), X(g.len - 30), y(a.rocker + 220)),
      box("lighting", X(-10), y(a.hoodF - 30), X(180), y(a.hoodF - 260)),
    ].filter((h) => h.w > 4 && h.h > 4);
  }
  if (view === "front" || view === "rear") {
    const g = frontGeometry(sh);
    const { a, cx, y, R, tw, halfTrack, halfW, axleY } = g;
    const box = (key: string, x1: number, y1: number, x2: number, y2: number): Hotspot => ({ key, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
    const common = [
      box("tyres", cx - halfTrack - tw / 2, axleY - R, cx - halfTrack + tw / 2, axleY + R),
      box("tyres", cx + halfTrack - tw / 2, axleY - R, cx + halfTrack + tw / 2, axleY + R),
      box("roof_rack", cx - halfW * 0.85, y(a.roof + 170), cx + halfW * 0.85, y(a.roof - 20)),
    ];
    if (view === "front")
      return [
        ...common,
        box("front_axle", cx - halfTrack + tw * 0.6, axleY - 26, cx + halfTrack - tw * 0.6, axleY + 26),
        box("front_suspension", cx + halfTrack - tw * 1.5, y(a.rocker + 40), cx + halfTrack - tw * 0.55, axleY - 10),
        box("steering", cx - halfTrack + tw * 0.6, axleY + 18, cx + halfTrack - tw * 0.6, axleY + 44),
        box("cooling", cx - halfW * 0.32, y(a.hoodF - 40), cx + halfW * 0.32, y(a.rocker + 260)),
        box("front_bumper", cx - halfW * 0.98, y(a.rocker + 230), cx + halfW * 0.98, y(a.rocker - 60)),
        box("lighting", cx - halfW * 0.95, y(a.hoodF - 50), cx - halfW * 0.5, y(a.rocker + 300)),
        box("lighting", cx + halfW * 0.5, y(a.hoodF - 50), cx + halfW * 0.95, y(a.rocker + 300)),
        box("battery", cx + halfW * 0.4, y(a.cowl + 10), cx + halfW * 0.8, y(a.hoodF - 40)),
        box("air_intake", cx - halfW * 1.08, y(a.roof + 120), cx - halfW * 0.88, y(a.cowl - 200)),
        box("recovery_points", cx - halfW * 0.75, y(a.rocker + 40), cx - halfW * 0.5, y(a.rocker - 90)),
      ].filter((h) => h.w > 4 && h.h > 4);
    return [
      ...common,
      box("rear_axle", cx - halfTrack + tw * 0.6, axleY - 26, cx + halfTrack - tw * 0.6, axleY + 26),
      box("rear_suspension", cx + halfTrack - tw * 1.5, y(a.rocker + 40), cx + halfTrack - tw * 0.55, axleY - 10),
      box("spare", cx - R * 0.95, y(a.belt + 60) , cx + R * 0.95, y(a.belt + 60) + 2 * R * 0.95),
      box("rear_storage", cx - halfW * 0.8, y(a.belt - 40), cx + halfW * 0.8, y(a.rocker + 200)),
      box("recovery_kit", cx + halfW * 0.25, y(a.roof + 40), cx + halfW * 0.85, y(a.belt + 120)),
      box("recovery_points", cx + halfW * 0.5, y(a.rocker + 40), cx + halfW * 0.75, y(a.rocker - 90)),
    ].filter((h) => h.w > 4 && h.h > 4);
  }
  // under
  const g = underGeometry(sh);
  const { fx, rx, cy, halfTrack, D, tw, s, wb, rail, x0, xEnd } = g;
  const box = (key: string, x1: number, y1: number, x2: number, y2: number): Hotspot => ({ key, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
  const tc = fx + wb * s * 0.5;
  return [
    box("tyres", fx - D / 2, cy - halfTrack - tw / 2, fx + D / 2, cy - halfTrack + tw / 2),
    box("tyres", fx - D / 2, cy + halfTrack - tw / 2, fx + D / 2, cy + halfTrack + tw / 2),
    box("tyres", rx - D / 2, cy - halfTrack - tw / 2, rx + D / 2, cy - halfTrack + tw / 2),
    box("tyres", rx - D / 2, cy + halfTrack - tw / 2, rx + D / 2, cy + halfTrack + tw / 2),
    box("front_axle", fx - 18, cy - halfTrack + tw / 2 + 4, fx + 18, cy + halfTrack - tw / 2 - 4),
    box("rear_axle", rx - 18, cy - halfTrack + tw / 2 + 4, rx + 18, cy + halfTrack - tw / 2 - 4),
    box("engine", fx + 22, cy - rail * 0.95, fx + wb * s * 0.3, cy + rail * 0.95),
    box("transmission", fx + wb * s * 0.3, cy - rail * 0.5, tc - 14, cy + rail * 0.5),
    box("transfer_case", tc - 14, cy - rail * 0.55, tc + 22, cy + rail * 0.55),
    box("driveshafts", tc + 22, cy - 8, rx - 24, cy + 14),
    box("skid_plates", fx + 20, cy + rail + 2, tc + 30, cy + rail + 20),
    box("rock_sliders", fx + D / 2 + 8, cy - halfTrack - tw / 2 - 2, rx - D / 2 - 8, cy - halfTrack + tw / 2 - 6),
    box("brakes", fx - 12, cy + halfTrack - tw / 2 - 16, fx + 12, cy + halfTrack - tw / 2 - 2),
    box("steering", fx - 34, cy - halfTrack + tw, fx - 20, cy + halfTrack - tw),
    box("recovery_points", x0 - 6, cy - rail - 14, x0 + 18, cy - rail + 14),
    box("recovery_points", xEnd - 18, cy + rail - 14, xEnd + 6, cy + rail + 14),
  ].filter((h) => h.w > 4 && h.h > 4);
}
