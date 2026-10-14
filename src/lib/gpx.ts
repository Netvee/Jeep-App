/**
 * GPX parsing, validation and export.
 * - Rejects DOCTYPE/ENTITY declarations (XXE / billion-laughs), oversize files and malformed XML.
 * - Validates every coordinate (range, finite) and point counts.
 * - Never renders GPX names/descriptions as HTML (callers display them as text).
 */
import { XMLParser, XMLValidator } from "fast-xml-parser";

export const GPX_MAX_BYTES = 5 * 1024 * 1024;
export const GPX_MAX_POINTS = 50_000;

export type GpxTrack = { name: string | null; points: number[][] }; // [lng, lat, ele?]
export type GpxWaypoint = { name: string | null; lat: number; lng: number; ele: number | null };
export type GpxParseResult =
  | { ok: true; name: string | null; tracks: GpxTrack[]; waypoints: GpxWaypoint[]; warnings: string[] }
  | { ok: false; error: string };

const asArray = <T,>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

function textOf(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number") return String(v).slice(0, 200);
  if (typeof v === "object" && v && "#text" in v) return String((v as Record<string, unknown>)["#text"]).slice(0, 200);
  return null;
}

function toPoint(p: Record<string, unknown>): number[] | null {
  const lat = Number(p["@_lat"]);
  const lng = Number(p["@_lon"]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const eleRaw = p["ele"];
  const ele = eleRaw == null ? NaN : Number(textOf(eleRaw));
  return Number.isFinite(ele) && ele > -1000 && ele < 9000 ? [lng, lat, ele] : [lng, lat];
}

export function parseGpx(input: string | Buffer): GpxParseResult {
  const xml = typeof input === "string" ? input : input.toString("utf8");
  if (Buffer.byteLength(xml, "utf8") > GPX_MAX_BYTES) return { ok: false, error: "הקובץ גדול מדי (מעל 5MB)" };
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return { ok: false, error: "הקובץ מכיל הגדרות DOCTYPE/ENTITY שאינן מותרות" };
  const valid = XMLValidator.validate(xml);
  if (valid !== true) return { ok: false, error: `XML לא תקין (שורה ${valid.err.line})` };

  let doc: Record<string, unknown>;
  try {
    doc = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      processEntities: false,
      htmlEntities: false,
      removeNSPrefix: true,
    }).parse(xml);
  } catch {
    return { ok: false, error: "לא ניתן לקרוא את הקובץ" };
  }
  const gpx = doc["gpx"] as Record<string, unknown> | undefined;
  if (!gpx || typeof gpx !== "object") return { ok: false, error: "זה אינו קובץ GPX (חסר אלמנט gpx)" };

  const warnings: string[] = [];
  let invalid = 0;
  let total = 0;
  const tracks: GpxTrack[] = [];

  for (const trk of asArray(gpx["trk"] as Record<string, unknown> | Record<string, unknown>[])) {
    const points: number[][] = [];
    for (const seg of asArray(trk["trkseg"] as Record<string, unknown> | Record<string, unknown>[])) {
      for (const pt of asArray(seg?.["trkpt"] as Record<string, unknown> | Record<string, unknown>[])) {
        total++;
        if (total > GPX_MAX_POINTS) return { ok: false, error: `יותר מדי נקודות (מעל ${GPX_MAX_POINTS})` };
        const p = toPoint(pt);
        if (p) points.push(p);
        else invalid++;
      }
    }
    if (points.length) tracks.push({ name: textOf(trk["name"]), points });
  }
  for (const rte of asArray(gpx["rte"] as Record<string, unknown> | Record<string, unknown>[])) {
    const points: number[][] = [];
    for (const pt of asArray(rte["rtept"] as Record<string, unknown> | Record<string, unknown>[])) {
      total++;
      if (total > GPX_MAX_POINTS) return { ok: false, error: `יותר מדי נקודות (מעל ${GPX_MAX_POINTS})` };
      const p = toPoint(pt);
      if (p) points.push(p);
      else invalid++;
    }
    if (points.length) tracks.push({ name: textOf(rte["name"]), points });
  }
  const waypoints: GpxWaypoint[] = [];
  for (const w of asArray(gpx["wpt"] as Record<string, unknown> | Record<string, unknown>[])) {
    const p = toPoint(w);
    if (!p) {
      invalid++;
      continue;
    }
    waypoints.push({ name: textOf(w["name"]), lng: p[0], lat: p[1], ele: p[2] ?? null });
  }

  if (!tracks.length && !waypoints.length) return { ok: false, error: "לא נמצאו מסלולים או נקודות תקינים בקובץ" };
  if (tracks.some((t) => t.points.length < 2)) warnings.push("מסלול עם פחות משתי נקודות — לא ניתן להציג כקו");
  if (invalid) warnings.push(`${invalid} נקודות לא תקינות הושמטו`);
  const meta = gpx["metadata"] as Record<string, unknown> | undefined;
  return { ok: true, name: textOf(meta?.["name"]) ?? tracks[0]?.name ?? null, tracks, waypoints, warnings };
}

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

export function toGpx(opts: { name: string; description?: string; coords: number[][]; waypoints?: { name: string; lat: number; lng: number }[]; creator?: string }) {
  const pts = opts.coords
    .map((c) => `      <trkpt lat="${c[1].toFixed(6)}" lon="${c[0].toFixed(6)}">${c[2] != null ? `<ele>${Math.round(c[2])}</ele>` : ""}</trkpt>`)
    .join("\n");
  const wpts = (opts.waypoints ?? [])
    .map((w) => `  <wpt lat="${w.lat.toFixed(6)}" lon="${w.lng.toFixed(6)}"><name>${esc(w.name)}</name></wpt>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${esc(opts.creator ?? "Shetach 4x4")}" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(opts.name)}</name>${opts.description ? `<desc>${esc(opts.description)}</desc>` : ""}</metadata>
${wpts}
  <trk>
    <name>${esc(opts.name)}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`;
}
