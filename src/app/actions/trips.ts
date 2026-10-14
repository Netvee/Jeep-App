"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/server/auth";
import { getOwnedTrip, getOwnedVehicle } from "@/server/repo";
import { newToken } from "@/server/password";
import { str, float, date, many, guard, FieldError, int } from "@/server/formdata";
import { buildChecklist, type TripCondition } from "@/lib/checklists";
import { isInIsraelRegion } from "@/lib/geo";
import type { ActionState } from "@/components/forms";

const CONDS = ["dust", "mud", "water", "sand", "rocks", "night", "remote"] as const;

async function equipmentFor(vehicleId: string | null) {
  if (!vehicleId) return {};
  const db = await getDb();
  const rows = await db
    .select({ overlay: s.parts.overlay, c: s.vehicleUpgrades.componentKey })
    .from(s.vehicleUpgrades)
    .leftJoin(s.parts, eq(s.parts.id, s.vehicleUpgrades.partId))
    .where(and(eq(s.vehicleUpgrades.vehicleId, vehicleId), eq(s.vehicleUpgrades.status, "installed")));
  const [v] = await db.select().from(s.vehicles).where(eq(s.vehicles.id, vehicleId));
  return {
    snorkel: rows.some((r) => r.overlay === "snorkel"),
    winch: rows.some((r) => r.overlay === "winch"),
    lockers: v?.lockers === "rear" || v?.lockers === "front_rear" || rows.some((r) => r.overlay === "locker"),
  };
}

export async function createTripAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const title = str(fd, "title", 120);
    if (!title) throw new FieldError("title", "נא לתת שם לטיול");
    const vehicle = await getOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    const trailSlug = str(fd, "trailSlug");
    const [trail] = trailSlug ? await db.select().from(s.trails).where(and(eq(s.trails.slug, trailSlug), eq(s.trails.status, "published"))) : [];
    const lat = float(fd, "meetingLat", { min: -90, max: 90 });
    const lng = float(fd, "meetingLng", { min: -180, max: 180 });
    if ((lat == null) !== (lng == null)) throw new FieldError("meetingLat", "יש להזין קו רוחב וקו אורך יחד");
    if (lat != null && lng != null && !isInIsraelRegion(lat, lng)) throw new FieldError("meetingLat", "נקודת המפגש מחוץ לאזור הנתמך");
    const conditions = many(fd, "conditions", CONDS) as TripCondition[];
    const eq_ = await equipmentFor(vehicle?.id ?? null);
    const tasks = [
      ...buildChecklist("pre", conditions, eq_).map((t) => ({ id: randomUUID(), title: t, phase: "pre" as const, done: false })),
      ...buildChecklist("post", conditions, eq_).map((t) => ({ id: randomUUID(), title: t, phase: "post" as const, done: false })),
    ];
    const [trip] = await db
      .insert(s.trips)
      .values({
        userId: user.id,
        vehicleId: vehicle?.id ?? null,
        trailId: trail?.id ?? null,
        title,
        tripDate: date(fd, "tripDate"),
        meetingPointLabel: str(fd, "meetingPointLabel", 160),
        meetingLat: lat,
        meetingLng: lng,
        meetingTime: str(fd, "meetingTime", 10),
        notes: str(fd, "notes", 3000),
        conditions,
        tasks,
      })
      .returning();
    id = trip.id;
    return { ok: true };
  });
  if (res && "ok" in res && res.ok) {
    revalidatePath("/trips");
    redirect(`/trips/${id}`);
  }
  return res;
}

export async function updateTripAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const trip = await getOwnedTrip(db, user.id, str(fd, "tripId") ?? "");
    if (!trip) throw new FieldError("tripId", "הטיול לא נמצא");
    const lat = float(fd, "meetingLat", { min: -90, max: 90 });
    const lng = float(fd, "meetingLng", { min: -180, max: 180 });
    if ((lat == null) !== (lng == null)) throw new FieldError("meetingLat", "יש להזין קו רוחב וקו אורך יחד");
    await db
      .update(s.trips)
      .set({
        title: str(fd, "title", 120) ?? trip.title,
        tripDate: date(fd, "tripDate"),
        meetingPointLabel: str(fd, "meetingPointLabel", 160),
        meetingLat: lat,
        meetingLng: lng,
        meetingTime: str(fd, "meetingTime", 10),
        notes: str(fd, "notes", 3000),
        updatedAt: new Date(),
      })
      .where(eq(s.trips.id, trip.id));
    return { ok: true, message: "נשמר" };
  });
  revalidatePath("/trips", "layout");
  return res;
}

export async function toggleTripTaskAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const trip = await getOwnedTrip(db, user.id, str(fd, "tripId") ?? "");
  if (!trip) return;
  const taskId = str(fd, "taskId");
  await db
    .update(s.trips)
    .set({ tasks: trip.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) })
    .where(eq(s.trips.id, trip.id));
  revalidatePath(`/trips/${trip.id}`);
}

export async function addTripTaskAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const trip = await getOwnedTrip(db, user.id, str(fd, "tripId") ?? "");
    if (!trip) throw new FieldError("tripId", "הטיול לא נמצא");
    const title = str(fd, "title", 200);
    if (!title) throw new FieldError("title", "נא להזין משימה");
    const phase = str(fd, "phase") === "post" ? "post" : "pre";
    await db
      .update(s.trips)
      .set({ tasks: [...trip.tasks, { id: randomUUID(), title, phase, done: false }] })
      .where(eq(s.trips.id, trip.id));
    return { ok: true };
  });
  revalidatePath("/trips", "layout");
  return res;
}

/** Marks the trip completed and (optionally) records the odometer. */
export async function completeTripAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const trip = await getOwnedTrip(db, user.id, str(fd, "tripId") ?? "");
    if (!trip) throw new FieldError("tripId", "הטיול לא נמצא");
    await db.update(s.trips).set({ status: "completed", updatedAt: new Date() }).where(eq(s.trips.id, trip.id));
    const km = int(fd, "km", { min: 0, max: 3_000_000 });
    if (km != null && trip.vehicleId) {
      const today = new Date().toISOString().slice(0, 10);
      await db.insert(s.mileageLogs).values({ vehicleId: trip.vehicleId, km, recordedOn: today, note: `בסיום טיול: ${trip.title}` });
    }
    return { ok: true, message: "הטיול סומן כהושלם. אל תשכחו את הבדיקות שאחרי הטיול." };
  });
  revalidatePath("/", "layout");
  return res;
}

/** Turns unfinished post-trip checks into maintenance reminders (general inspection suggestions). */
export async function postTasksToMaintenanceAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const trip = await getOwnedTrip(db, user.id, str(fd, "tripId") ?? "");
  if (!trip?.vehicleId) return;
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const open = trip.tasks.filter((t) => t.phase === "post" && !t.done);
  if (open.length)
    await db.insert(s.maintenanceTasks).values(
      open.map((t) => ({ vehicleId: trip.vehicleId!, title: t.title, kind: "suggestion" as const, dueOn: due, notes: `בדיקה אחרי הטיול: ${trip.title}` })),
    );
  revalidatePath("/", "layout");
  redirect("/maintenance");
}

export async function shareTripAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const trip = await getOwnedTrip(db, user.id, str(fd, "tripId") ?? "");
  if (!trip) return;
  await db.update(s.trips).set({ shareToken: trip.shareToken ? null : newToken() }).where(eq(s.trips.id, trip.id));
  revalidatePath(`/trips/${trip.id}`);
}

export async function deleteTripAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const trip = await getOwnedTrip(db, user.id, str(fd, "tripId") ?? "");
  if (trip) await db.delete(s.trips).where(eq(s.trips.id, trip.id));
  revalidatePath("/trips");
  redirect("/trips");
}
