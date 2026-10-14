import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { computeReminders, type MileageState, type TaskInput } from "@/lib/reminders";
import { summarizeCosts, summarizePlan, type CostLine } from "@/lib/costs";
import { todayIso } from "@/lib/units";
import type { listUpgrades } from "./repo";

export async function remindersFor(db: Db, vehicleId: string, mileage: MileageState) {
  const tasks = await db.select().from(s.maintenanceTasks).where(eq(s.maintenanceTasks.vehicleId, vehicleId));
  return { tasks, reminders: computeReminders(tasks as TaskInput[], mileage, todayIso()) };
}

export type UpgradeRow = Awaited<ReturnType<typeof listUpgrades>>[number];

export const PLANNED_STATUSES: s.UpgradeStatus[] = ["wishlist", "planned", "quoted", "purchased"];

export function costSummary(u: UpgradeRow) {
  return summarizeCosts(u.costs as CostLine[]);
}

/** Totals for upgrades still to be paid for (wishlist/planned/quoted). Purchased ones are already spent. */
export function planTotals(upgrades: UpgradeRow[], statuses: s.UpgradeStatus[] = ["wishlist", "planned", "quoted"]) {
  return summarizePlan(upgrades.filter((u) => statuses.includes(u.upgrade.status)).map(costSummary));
}
