"use client";

import { useEffect } from "react";
import { writePack, type OfflineVehicle } from "@/lib/offline-pack";

/** Saves a non-sensitive summary of the active vehicle for offline viewing. */
export function OfflineSnapshot({ vehicle }: { vehicle: Omit<OfflineVehicle, "savedAt"> }) {
  useEffect(() => {
    writePack((p) => ({ ...p, vehicle: { ...vehicle, savedAt: new Date().toISOString() } }));
  }, [vehicle]);
  return null;
}
