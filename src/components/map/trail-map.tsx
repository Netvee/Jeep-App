"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { OBSTACLE_LABEL, STALE_REPORT_DAYS } from "@/lib/trails";
import type { ObstacleCategory } from "@/db/schema";

export type MapTrail = {
  slug: string;
  name: string;
  kind: "route" | "pin";
  isDemo: boolean;
  geometry: number[][] | null;
  start: [number, number];
  difficulty: number | null;
};

export type MapReport = {
  id: string;
  lat: number;
  lng: number;
  category: ObstacleCategory;
  description: string;
  observedOn: string;
  status: string;
  verified: boolean;
  isDemo: boolean;
  ageDays: number;
};

const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || "© OpenStreetMap contributors";

const ISRAEL_CENTER: [number, number] = [31.5, 35.0];

function reportIcon(r: MapReport) {
  const stale = r.ageDays > STALE_REPORT_DAYS;
  const bg = r.verified ? "#8a2f23" : r.status === "pending" ? "#8b9095" : stale ? "#a8946c" : "#c4561a";
  const glyph = { water: "≈", sand: "∴", mud: "≋", rock_step: "▲", boulders: "●", locked_gate: "⊘", closure: "✕", steep: "◢", off_camber: "◣", ruts: "‖", damage: "!", other: "?" }[r.category];
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${bg};color:white;display:flex;align-items:center;justify-content:center;font:700 14px system-ui;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.35);${stale ? "opacity:.75;" : ""}">${glyph}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitTo({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [map, bounds]);
  return null;
}

function ClickToPick({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function TrailMap({
  trails,
  reports = [],
  selected,
  onSelect,
  pick,
  onPick,
  userPos,
  height = 480,
  preview,
}: {
  trails: MapTrail[];
  reports?: MapReport[];
  selected?: string | null;
  onSelect?: (slug: string) => void;
  pick?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  userPos?: [number, number] | null;
  height?: number | string;
  preview?: number[][] | null;
}) {
  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    const pts: [number, number][] = [];
    const focus = selected ? trails.filter((t) => t.slug === selected) : trails;
    for (const t of focus) {
      if (t.geometry?.length) t.geometry.forEach((c) => pts.push([c[1], c[0]]));
      else pts.push([t.start[1], t.start[0]]);
    }
    if (preview?.length) preview.forEach((c) => pts.push([c[1], c[0]]));
    if (!pts.length) return null;
    return L.latLngBounds(pts);
  }, [trails, selected, preview]);

  return (
    <div dir="ltr" style={{ height }} className="rounded-2xl overflow-hidden border border-sand-200 relative z-0">
      <MapContainer center={ISRAEL_CENTER} zoom={7} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} attributionControl>
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={18} />
        <FitTo bounds={bounds} />
        <ClickToPick onPick={onPick} />
        {trails.map((t) =>
          t.kind === "route" && t.geometry?.length ? (
            <Polyline
              key={t.slug}
              positions={t.geometry.map((c) => [c[1], c[0]] as [number, number])}
              pathOptions={
                t.isDemo
                  ? { color: selected === t.slug ? "#c4561a" : "#8b6a4f", weight: selected === t.slug ? 6 : 4, dashArray: "10 8", opacity: 0.9 }
                  : { color: selected === t.slug ? "#3b4626" : "#5b6b3a", weight: selected === t.slug ? 6 : 4, opacity: 0.95 }
              }
              eventHandlers={{ click: () => onSelect?.(t.slug) }}
            >
              <Tooltip sticky direction="top">
                <div dir="rtl">
                  {t.name}
                  {t.isDemo && " · הדגמה (קואורדינטות סינתטיות)"}
                </div>
              </Tooltip>
            </Polyline>
          ) : (
            <CircleMarker
              key={t.slug}
              center={[t.start[1], t.start[0]]}
              radius={9}
              pathOptions={{ color: "#1d1f21", weight: 2, fillColor: t.isDemo ? "#c2b08c" : "#6f8047", fillOpacity: 0.9, dashArray: t.isDemo ? "3 3" : undefined }}
              eventHandlers={{ click: () => onSelect?.(t.slug) }}
            >
              <Tooltip direction="top">
                <div dir="rtl">
                  {t.name} · נקודת מיקום בלבד{t.isDemo && " · הדגמה"}
                </div>
              </Tooltip>
            </CircleMarker>
          ),
        )}
        {trails
          .filter((t) => t.kind === "route" && t.geometry?.length && (!selected || selected === t.slug))
          .map((t) => (
            <CircleMarker key={`s-${t.slug}`} center={[t.geometry![0][1], t.geometry![0][0]]} radius={6} pathOptions={{ color: "white", weight: 2, fillColor: "#1d1f21", fillOpacity: 1 }}>
              <Tooltip>
                <span dir="rtl">התחלה</span>
              </Tooltip>
            </CircleMarker>
          ))}
        {preview?.length ? <Polyline positions={preview.map((c) => [c[1], c[0]] as [number, number])} pathOptions={{ color: "#2f5166", weight: 4 }} /> : null}
        {reports.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={reportIcon(r)} keyboard>
            <Popup>
              <div dir="rtl" style={{ minWidth: 180, fontFamily: "inherit" }}>
                <strong>{OBSTACLE_LABEL[r.category]}</strong>
                {r.verified ? " · מאומת" : " · דיווח קהילה"}
                {r.status === "pending" && " · ממתין לאישור"}
                {r.isDemo && " · הדגמה"}
                <div style={{ marginTop: 4 }}>{r.description}</div>
                <div style={{ marginTop: 4, color: "#6a7075", fontSize: 12 }}>
                  נצפה לפני {r.ageDays} ימים{r.ageDays > STALE_REPORT_DAYS ? " · ייתכן שאינו עדכני" : ""}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        {pick && <CircleMarker center={pick} radius={10} pathOptions={{ color: "#d9692b", weight: 3, fillOpacity: 0.3 }} />}
        {userPos && <CircleMarker center={userPos} radius={7} pathOptions={{ color: "white", weight: 3, fillColor: "#2f5166", fillOpacity: 1 }} />}
      </MapContainer>
    </div>
  );
}
