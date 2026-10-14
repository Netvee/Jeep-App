import { describe, it, expect } from "vitest";
import { parseGpx, toGpx, GPX_MAX_POINTS } from "@/lib/gpx";

const VALID = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Test route</name></metadata>
  <wpt lat="31.5" lon="35.1"><name>Start</name></wpt>
  <trk><name>T</name><trkseg>
    <trkpt lat="31.500" lon="35.100"><ele>400</ele></trkpt>
    <trkpt lat="31.510" lon="35.110"><ele>420</ele></trkpt>
    <trkpt lat="31.520" lon="35.120"></trkpt>
  </trkseg></trk>
</gpx>`;

describe("GPX validation", () => {
  it("parses tracks, elevations and waypoints as [lng, lat, ele]", () => {
    const r = parseGpx(VALID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.name).toBe("Test route");
    expect(r.tracks[0].points).toEqual([
      [35.1, 31.5, 400],
      [35.11, 31.51, 420],
      [35.12, 31.52],
    ]);
    expect(r.waypoints[0]).toMatchObject({ lat: 31.5, lng: 35.1, name: "Start" });
  });

  it("rejects DOCTYPE / ENTITY declarations (XXE, entity expansion)", () => {
    const evil = `<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY x SYSTEM "file:///etc/passwd">]><gpx><trk><trkseg><trkpt lat="1" lon="1"/></trkseg></trk></gpx>`;
    const r = parseGpx(evil);
    expect(r.ok).toBe(false);
  });

  it("rejects malformed XML", () => {
    expect(parseGpx("<gpx><trk><trkseg>").ok).toBe(false);
  });

  it("rejects non-GPX XML", () => {
    expect(parseGpx("<kml><Document/></kml>").ok).toBe(false);
  });

  it("drops out-of-range coordinates and reports them", () => {
    const r = parseGpx(`<gpx><trk><trkseg><trkpt lat="91" lon="35"/><trkpt lat="31" lon="35"/><trkpt lat="31.1" lon="abc"/><trkpt lat="31.2" lon="35.2"/></trkseg></trk></gpx>`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tracks[0].points).toHaveLength(2);
    expect(r.warnings.join(" ")).toMatch(/2/);
  });

  it("rejects files with no valid geometry", () => {
    expect(parseGpx(`<gpx><trk><trkseg><trkpt lat="200" lon="35"/></trkseg></trk></gpx>`).ok).toBe(false);
  });

  it("rejects oversized point counts", () => {
    const pts = Array.from({ length: GPX_MAX_POINTS + 1 }, () => `<trkpt lat="31" lon="35"/>`).join("");
    expect(parseGpx(`<gpx><trk><trkseg>${pts}</trkseg></trk></gpx>`).ok).toBe(false);
  });

  it("exports valid, escaped GPX that round-trips", () => {
    const xml = toGpx({ name: `A & B <"route">`, coords: [[35.1, 31.5, 400], [35.2, 31.6]] });
    expect(xml).toContain("A &amp; B &lt;&quot;route&quot;&gt;");
    const r = parseGpx(xml);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tracks[0].points.length).toBe(2);
  });
});
