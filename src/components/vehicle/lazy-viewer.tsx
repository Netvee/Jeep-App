"use client";

import dynamic from "next/dynamic";
import type { ViewerData } from "./viewer";

const Viewer = dynamic(() => import("./viewer").then((m) => m.VehicleViewer), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl bg-sand-100 border border-sand-200 animate-pulse" style={{ aspectRatio: "1000 / 560" }} aria-busy="true" aria-label="טוען איור רכב" />
  ),
});

export function LazyVehicleViewer({ data, compact }: { data: ViewerData; compact?: boolean }) {
  return <Viewer data={data} compact={compact} />;
}
