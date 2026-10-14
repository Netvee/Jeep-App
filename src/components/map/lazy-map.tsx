"use client";

import dynamic from "next/dynamic";

export const LazyTrailMap = dynamic(() => import("./trail-map"), {
  ssr: false,
  loading: () => <div className="rounded-2xl bg-sand-100 border border-sand-200 animate-pulse h-[480px]" aria-busy="true" aria-label="טוען מפה" />,
});
