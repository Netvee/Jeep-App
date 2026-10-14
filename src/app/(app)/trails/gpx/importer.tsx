"use client";

import { useState } from "react";
import { LazyTrailMap } from "@/components/map/lazy-map";
import { Card, Notice } from "@/components/ui";

type Result =
  | { ok: true; name: string | null; warnings: string[]; waypoints: { name: string | null; lat: number; lng: number }[]; tracks: { name: string | null; points: number[][]; lengthKm: number }[] }
  | { ok: false; error: string };

export function GpxImporter() {
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/gpx/validate", { method: "POST", body: fd });
      setRes((await r.json()) as Result);
    } catch {
      setRes({ ok: false, error: "שגיאת רשת — נסו שוב" });
    } finally {
      setBusy(false);
    }
  };
  const all = res?.ok ? res.tracks.flatMap((t) => t.points) : null;
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <label htmlFor="gpx" className="font-medium block mb-2">
          בחירת קובץ GPX (עד 5MB)
        </label>
        <input id="gpx" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-4 file:py-2.5 file:font-medium" />
        <p role="status" className="text-sm text-charcoal-500 mt-2">
          {busy ? "בודק…" : ""}
        </p>
      </Card>
      {res && !res.ok && <Notice tone="danger" title="הקובץ נדחה">{res.error}</Notice>}
      {res && res.ok && (
        <>
          <Notice tone="olive" title={res.name ?? "קובץ תקין"}>
            {res.tracks.length} מסלולים · {res.waypoints.length} נקודות ציון
            {res.tracks.map((t, i) => (
              <span key={i} className="block">
                {t.name ?? `מסלול ${i + 1}`}: {t.lengthKm} ק״מ · {t.points.length} נקודות
              </span>
            ))}
            {res.warnings.map((w) => (
              <span key={w} className="block text-warn-700">
                {w}
              </span>
            ))}
          </Notice>
          <LazyTrailMap
            trails={res.waypoints.slice(0, 200).map((w, i) => ({ slug: `w${i}`, name: w.name ?? "נקודה", kind: "pin" as const, isDemo: false, geometry: null, start: [w.lng, w.lat] as [number, number], difficulty: null }))}
            preview={all}
            height="min(65vh, 520px)"
          />
        </>
      )}
    </div>
  );
}
