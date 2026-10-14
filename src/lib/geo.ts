/** Small geo helpers. Coordinates are [lng, lat] (GeoJSON order) unless named otherwise. */

const R = 6371.0088; // mean Earth radius, km

export function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function lineLengthKm(coords: number[][]): number {
  let d = 0;
  for (let i = 1; i < coords.length; i++) {
    d += haversineKm([coords[i - 1][0], coords[i - 1][1]], [coords[i][0], coords[i][1]]);
  }
  return d;
}

export function elevationStats(coords: number[][]): { gain: number; min: number; max: number } | null {
  const els = coords.map((c) => c[2]).filter((e): e is number => typeof e === "number" && Number.isFinite(e));
  if (els.length < 2) return null;
  let gain = 0;
  for (let i = 1; i < els.length; i++) if (els[i] > els[i - 1]) gain += els[i] - els[i - 1];
  return { gain: Math.round(gain), min: Math.round(Math.min(...els)), max: Math.round(Math.max(...els)) };
}

export function bbox(coords: number[][]): [[number, number], [number, number]] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const c of coords) {
    minLng = Math.min(minLng, c[0]);
    maxLng = Math.max(maxLng, c[0]);
    minLat = Math.min(minLat, c[1]);
    maxLat = Math.max(maxLat, c[1]);
  }
  return [[minLat, minLng], [maxLat, maxLng]];
}

/** Rough bounding box covering Israel, Judea & Samaria, Golan (used for sanity checks). */
export const ISRAEL_BOUNDS = { minLat: 29.4, maxLat: 33.4, minLng: 34.2, maxLng: 35.95 };

export function isInIsraelRegion(lat: number, lng: number) {
  return (
    lat >= ISRAEL_BOUNDS.minLat && lat <= ISRAEL_BOUNDS.maxLat && lng >= ISRAEL_BOUNDS.minLng && lng <= ISRAEL_BOUNDS.maxLng
  );
}

export function formatCoord(lat: number, lng: number, digits = 5) {
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`;
}

/** Nearest distance (km) from a point to a polyline (approximate, vertex-based + segment projection). */
export function distanceToLineKm(p: [number, number], coords: number[][]): number {
  if (!coords.length) return Infinity;
  let best = Infinity;
  const cosLat = Math.cos((p[1] * Math.PI) / 180);
  const toXY = (c: number[]) => [c[0] * 111.32 * cosLat, c[1] * 110.574];
  const P = toXY(p);
  for (let i = 0; i < coords.length; i++) {
    const A = toXY(coords[i]);
    if (i === 0) {
      best = Math.min(best, Math.hypot(P[0] - A[0], P[1] - A[1]));
      continue;
    }
    const B = toXY(coords[i - 1]);
    const dx = A[0] - B[0], dy = A[1] - B[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((P[0] - B[0]) * dx + (P[1] - B[1]) * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(P[0] - (B[0] + t * dx), P[1] - (B[1] + t * dy)));
  }
  return best;
}
