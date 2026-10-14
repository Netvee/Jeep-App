/**
 * Owner-scoped data access. Every function that touches private data takes the acting
 * userId and filters by it in SQL — callers cannot fetch another user's rows by ID.
 * (Kept free of `server-only`/cookies so it can be exercised directly in tests.)
 */
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";

export type Vehicle = typeof s.vehicles.$inferSelect;

export async function listVehicles(db: Db, userId: string) {
  return db.select().from(s.vehicles).where(eq(s.vehicles.userId, userId)).orderBy(s.vehicles.createdAt);
}

export async function getOwnedVehicle(db: Db, userId: string, vehicleId: string | null | undefined): Promise<Vehicle | null> {
  if (!vehicleId || !isUuid(vehicleId)) return null;
  const [v] = await db
    .select()
    .from(s.vehicles)
    .where(and(eq(s.vehicles.id, vehicleId), eq(s.vehicles.userId, userId)))
    .limit(1);
  return v ?? null;
}

export async function requireOwnedVehicle(db: Db, userId: string, vehicleId: string | null | undefined): Promise<Vehicle> {
  const v = await getOwnedVehicle(db, userId, vehicleId);
  if (!v) throw new NotFoundError("הרכב לא נמצא");
  return v;
}

export async function latestMileage(db: Db, vehicleId: string) {
  const [m] = await db
    .select()
    .from(s.mileageLogs)
    .where(eq(s.mileageLogs.vehicleId, vehicleId))
    .orderBy(desc(s.mileageLogs.recordedOn), desc(s.mileageLogs.createdAt))
    .limit(1);
  return m ? { km: m.km, recordedOn: m.recordedOn } : null;
}

export async function getVariantBundle(db: Db, variantId: string | null) {
  if (!variantId) return null;
  const [row] = await db
    .select({ variant: s.variants, generation: s.generations, model: s.models, make: s.makes })
    .from(s.variants)
    .innerJoin(s.generations, eq(s.generations.id, s.variants.generationId))
    .innerJoin(s.models, eq(s.models.id, s.generations.modelId))
    .innerJoin(s.makes, eq(s.makes.id, s.models.makeId))
    .where(eq(s.variants.id, variantId))
    .limit(1);
  if (!row) return null;
  const specs = await db.select().from(s.variantSpecs).where(eq(s.variantSpecs.variantId, variantId));
  return { ...row, specs };
}

/** Upgrade rows (+ part) for a vehicle the user owns. */
export async function listUpgrades(db: Db, userId: string, vehicleId: string) {
  await requireOwnedVehicle(db, userId, vehicleId);
  const rows = await db
    .select({ upgrade: s.vehicleUpgrades, part: s.parts })
    .from(s.vehicleUpgrades)
    .leftJoin(s.parts, eq(s.parts.id, s.vehicleUpgrades.partId))
    .where(eq(s.vehicleUpgrades.vehicleId, vehicleId))
    .orderBy(s.vehicleUpgrades.priority, s.vehicleUpgrades.createdAt);
  const ids = rows.map((r) => r.upgrade.id);
  const costs = ids.length ? await db.select().from(s.upgradeCosts).where(inArray(s.upgradeCosts.upgradeId, ids)) : [];
  return rows.map((r) => ({ ...r, costs: costs.filter((c) => c.upgradeId === r.upgrade.id) }));
}

export async function getOwnedUpgrade(db: Db, userId: string, upgradeId: string) {
  if (!isUuid(upgradeId)) return null;
  const [row] = await db
    .select({ upgrade: s.vehicleUpgrades, vehicle: s.vehicles, part: s.parts })
    .from(s.vehicleUpgrades)
    .innerJoin(s.vehicles, eq(s.vehicles.id, s.vehicleUpgrades.vehicleId))
    .leftJoin(s.parts, eq(s.parts.id, s.vehicleUpgrades.partId))
    .where(and(eq(s.vehicleUpgrades.id, upgradeId), eq(s.vehicles.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getOwnedServiceRecord(db: Db, userId: string, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ record: s.serviceRecords })
    .from(s.serviceRecords)
    .innerJoin(s.vehicles, eq(s.vehicles.id, s.serviceRecords.vehicleId))
    .where(and(eq(s.serviceRecords.id, id), eq(s.vehicles.userId, userId)))
    .limit(1);
  return row?.record ?? null;
}

export async function getOwnedTask(db: Db, userId: string, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ task: s.maintenanceTasks })
    .from(s.maintenanceTasks)
    .innerJoin(s.vehicles, eq(s.vehicles.id, s.maintenanceTasks.vehicleId))
    .where(and(eq(s.maintenanceTasks.id, id), eq(s.vehicles.userId, userId)))
    .limit(1);
  return row?.task ?? null;
}

export async function getOwnedTrip(db: Db, userId: string, id: string) {
  if (!isUuid(id)) return null;
  const [t] = await db
    .select()
    .from(s.trips)
    .where(and(eq(s.trips.id, id), eq(s.trips.userId, userId)))
    .limit(1);
  return t ?? null;
}

export async function getOwnedQuote(db: Db, userId: string, id: string) {
  if (!isUuid(id)) return null;
  const [q] = await db
    .select()
    .from(s.quotes)
    .where(and(eq(s.quotes.id, id), eq(s.quotes.userId, userId)))
    .limit(1);
  return q ?? null;
}

/**
 * File access: owner always; anyone for files explicitly marked public.
 * Also allowed: photo of a vehicle whose *public* build profile opted in to show it.
 */
export async function getReadableFile(db: Db, userId: string | null, fileId: string) {
  if (!isUuid(fileId)) return null;
  const [f] = await db.select().from(s.files).where(eq(s.files.id, fileId)).limit(1);
  if (!f) return null;
  if (f.isPublic) return f;
  if (userId && f.ownerId === userId) return f;
  const [pub] = await db
    .select({ id: s.vehicles.id })
    .from(s.vehicles)
    .innerJoin(s.buildProfiles, eq(s.buildProfiles.vehicleId, s.vehicles.id))
    .where(and(eq(s.vehicles.photoFileId, fileId), eq(s.buildProfiles.isPublic, true), eq(s.buildProfiles.showPhoto, true)))
    .limit(1);
  if (pub) return f;
  // approved trail report photos are public
  const [rep] = await db
    .select({ id: s.trailReports.id })
    .from(s.trailReports)
    .where(and(eq(s.trailReports.photoFileId, fileId), eq(s.trailReports.status, "approved")))
    .limit(1);
  return rep ? f : null;
}

export async function listAttachments(db: Db, userId: string, entityType: (typeof s.attachments.$inferSelect)["entityType"], entityId: string) {
  return db
    .select({ a: s.attachments, mime: s.files.mime, filename: s.files.filename, size: s.files.sizeBytes })
    .from(s.attachments)
    .innerJoin(s.files, eq(s.files.id, s.attachments.fileId))
    .where(and(eq(s.attachments.userId, userId), eq(s.attachments.entityType, entityType), eq(s.attachments.entityId, entityId)))
    .orderBy(desc(s.attachments.createdAt));
}

/** Workshops visible to a user: public listings (+demo if enabled) and their own private ones. */
export function workshopVisibility(userId: string | null, showDemo: boolean) {
  const pub = showDemo ? undefined : eq(s.workshops.isDemo, false);
  const visible = userId
    ? or(eq(s.workshops.ownerId, userId), and(isNullOwner(), pub))
    : and(isNullOwner(), pub);
  return visible;
}

const isNullOwner = () => isNull(s.workshops.ownerId);

export function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export class NotFoundError extends Error {}

export function vehicleDisplayName(v: Pick<Vehicle, "nickname" | "make" | "model" | "year">) {
  if (v.nickname) return v.nickname;
  const parts = [v.make, v.model, v.year].filter(Boolean);
  return parts.length ? parts.join(" ") : "רכב ללא שם";
}
