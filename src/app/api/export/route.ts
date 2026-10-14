import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { getCurrentUser } from "@/server/auth";
import { listVehicles } from "@/server/repo";

/**
 * Full JSON backup of the current user's own data. Files are listed with metadata and an
 * authenticated download path (binary content is not inlined to keep the export small).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const db = await getDb();
  const vehicles = await listVehicles(db, user.id);
  const vids = vehicles.map((v) => v.id);
  const by = <T,>(q: Promise<T[]>) => q;
  const [mileage, upgrades, tasks, records, symptoms, trips, quotes, attachments, files, saved, posts, builds, workshops] = await Promise.all([
    vids.length ? by(db.select().from(s.mileageLogs).where(inArray(s.mileageLogs.vehicleId, vids))) : [],
    vids.length ? by(db.select().from(s.vehicleUpgrades).where(inArray(s.vehicleUpgrades.vehicleId, vids))) : [],
    vids.length ? by(db.select().from(s.maintenanceTasks).where(inArray(s.maintenanceTasks.vehicleId, vids))) : [],
    vids.length ? by(db.select().from(s.serviceRecords).where(inArray(s.serviceRecords.vehicleId, vids))) : [],
    vids.length ? by(db.select().from(s.symptomLogs).where(inArray(s.symptomLogs.vehicleId, vids))) : [],
    db.select().from(s.trips).where(eq(s.trips.userId, user.id)),
    db.select().from(s.quotes).where(eq(s.quotes.userId, user.id)),
    db.select().from(s.attachments).where(eq(s.attachments.userId, user.id)),
    db
      .select({ id: s.files.id, mime: s.files.mime, filename: s.files.filename, sizeBytes: s.files.sizeBytes, createdAt: s.files.createdAt })
      .from(s.files)
      .where(eq(s.files.ownerId, user.id)),
    db.select().from(s.savedTrails).where(eq(s.savedTrails.userId, user.id)),
    db.select().from(s.communityPosts).where(eq(s.communityPosts.userId, user.id)),
    vids.length ? by(db.select().from(s.buildProfiles).where(inArray(s.buildProfiles.vehicleId, vids))) : [],
    db.select().from(s.workshops).where(eq(s.workshops.ownerId, user.id)),
  ]);
  const upIds = upgrades.map((u) => u.id);
  const costs = upIds.length ? await db.select().from(s.upgradeCosts).where(inArray(s.upgradeCosts.upgradeId, upIds)) : [];
  const body = {
    format: "shetach-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    account: { email: user.email, displayName: user.displayName, prefs: user.prefs, createdAt: user.createdAt },
    vehicles,
    mileage,
    upgrades,
    upgradeCosts: costs,
    maintenanceTasks: tasks,
    serviceRecords: records,
    symptoms,
    trips,
    quotes,
    attachments,
    files: files.map((f) => ({ ...f, downloadPath: `/api/files/${f.id}` })),
    savedTrails: saved,
    communityPosts: posts,
    buildProfiles: builds,
    privateWorkshops: workshops,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="shetach-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
