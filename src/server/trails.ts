import { and, eq, inArray, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import type { VehicleCapability } from "@/lib/trails";
import { daysBetween, todayIso } from "@/lib/units";
import type { Vehicle } from "./repo";

export async function loadPublishedTrails(db: Db, showDemo: boolean) {
  const rows = await db.select().from(s.trails).where(eq(s.trails.status, "published"));
  return rows.filter((t) => showDemo || !t.isDemo);
}

export async function vehicleCapability(db: Db, vehicle: Vehicle | null): Promise<VehicleCapability | null> {
  if (!vehicle) return null;
  const installed = await db
    .select({ c: s.vehicleUpgrades.componentKey, overlay: s.parts.overlay })
    .from(s.vehicleUpgrades)
    .leftJoin(s.parts, eq(s.parts.id, s.vehicleUpgrades.partId))
    .where(and(eq(s.vehicleUpgrades.vehicleId, vehicle.id), eq(s.vehicleUpgrades.status, "installed")));
  return {
    groundClearanceCm: vehicle.groundClearanceCm,
    hasLowRange: vehicle.hasLowRange,
    lockers: vehicle.lockers,
    tyreType: vehicle.tyreType,
    hasRecoveryGear: installed.some((i) => i.c === "recovery_kit" || i.overlay === "winch"),
    driverExperience: vehicle.driverExperience,
  };
}

/** Visible reports: approved ones for everyone; the user's own pending ones for them. */
export async function loadVisibleReports(db: Db, trailIds: string[], userId: string | null, showDemo: boolean) {
  if (!trailIds.length) return [];
  const visibility = userId
    ? or(eq(s.trailReports.status, "approved"), and(eq(s.trailReports.status, "pending"), eq(s.trailReports.userId, userId)))
    : eq(s.trailReports.status, "approved");
  const rows = await db
    .select()
    .from(s.trailReports)
    .where(and(inArray(s.trailReports.trailId, trailIds), visibility));
  const today = todayIso();
  return rows
    .filter((r) => showDemo || !r.isDemo)
    .map((r) => ({ ...r, ageDays: Math.max(0, daysBetween(r.observedOn, today)) }));
}

export async function duplicateCounts(db: Db, reportIds: string[]) {
  if (!reportIds.length) return new Map<string, number>();
  const rows = await db.select({ d: s.trailReports.duplicateOf }).from(s.trailReports).where(and(inArray(s.trailReports.duplicateOf, reportIds), eq(s.trailReports.status, "duplicate")));
  const m = new Map<string, number>();
  for (const r of rows) if (r.d) m.set(r.d, (m.get(r.d) ?? 0) + 1);
  return m;
}
