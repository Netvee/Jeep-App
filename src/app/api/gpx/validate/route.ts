import { getCurrentUser } from "@/server/auth";
import { parseGpx, GPX_MAX_BYTES } from "@/lib/gpx";
import { lineLengthKm } from "@/lib/geo";

/** Validates an uploaded GPX file server-side and returns sanitized geometry for preview. Nothing is stored. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "נדרשת התחברות" }, { status: 401 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > GPX_MAX_BYTES + 4096) return Response.json({ ok: false, error: "הקובץ גדול מדי (מעל 5MB)" }, { status: 413 });
  let text: string;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    if (!(f instanceof File)) return Response.json({ ok: false, error: "לא נבחר קובץ" }, { status: 400 });
    if (f.size > GPX_MAX_BYTES) return Response.json({ ok: false, error: "הקובץ גדול מדי (מעל 5MB)" }, { status: 413 });
    text = await f.text();
  } catch {
    return Response.json({ ok: false, error: "בקשה לא תקינה" }, { status: 400 });
  }
  const r = parseGpx(text);
  if (!r.ok) return Response.json(r, { status: 422 });
  return Response.json({
    ok: true,
    name: r.name,
    warnings: r.warnings,
    waypoints: r.waypoints.slice(0, 500),
    tracks: r.tracks.map((t) => ({ name: t.name, points: t.points, lengthKm: Math.round(lineLengthKm(t.points) * 10) / 10 })),
  });
}
