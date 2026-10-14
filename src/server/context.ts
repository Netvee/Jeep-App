import "server-only";
import { cache } from "react";
import { getDb } from "@/db";
import { requireUser } from "./auth";
import { listVehicles, getVariantBundle, latestMileage } from "./repo";

/** Per-request garage context: user, their vehicles and the active vehicle (if any). */
export const getGarage = cache(async () => {
  const user = await requireUser();
  const db = await getDb();
  const vehicles = await listVehicles(db, user.id);
  const active = vehicles.find((v) => v.id === user.prefs?.activeVehicleId) ?? vehicles[0] ?? null;
  return { user, db, vehicles, active, showDemo: user.prefs?.showDemoData !== false };
});

export const getActiveVehicleDetails = cache(async () => {
  const g = await getGarage();
  if (!g.active) return { ...g, variant: null, mileage: null };
  const [variant, mileage] = await Promise.all([getVariantBundle(g.db, g.active.variantId), latestMileage(g.db, g.active.id)]);
  return { ...g, variant, mileage };
});
