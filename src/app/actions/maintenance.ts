"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/server/auth";
import { requireOwnedVehicle, getOwnedTask, getOwnedServiceRecord, isUuid } from "@/server/repo";
import { str, int, date, oneOf, tri, file, guard, FieldError } from "@/server/formdata";
import { storeUpload } from "@/server/files";
import { completeTask, type TaskInput } from "@/lib/reminders";
import { todayIso } from "@/lib/units";
import { triage, TRIAGE_CATEGORIES } from "@/lib/triage";
import type { ActionState } from "@/components/forms";

const done = (msg: string) => ({ ok: true as const, message: msg });

export async function addInspectionTaskAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
  const title = str(fd, "title", 200);
  if (!title) return;
  await db.insert(s.maintenanceTasks).values({
    vehicleId: v.id,
    title,
    kind: "suggestion",
    dueOn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    notes: "המלצת בדיקה כללית שנוספה מתוך איור הרכב",
  });
  revalidatePath("/", "layout");
}

function taskFields(fd: FormData) {
  const title = str(fd, "title", 200);
  if (!title) throw new FieldError("title", "נא להזין שם למשימה");
  const intervalKm = int(fd, "intervalKm", { min: 100, max: 500000 });
  const intervalMonths = int(fd, "intervalMonths", { min: 1, max: 120 });
  const dueOn = date(fd, "dueOn");
  const dueKm = int(fd, "dueKm", { min: 0, max: 3_000_000 });
  if (!intervalKm && !intervalMonths && !dueOn && dueKm == null) throw new FieldError("intervalKm", "הגדירו מרווח (ק״מ/חודשים) או מועד יעד");
  return {
    title,
    intervalKm,
    intervalMonths,
    dueOn,
    dueKm,
    lastDoneOn: date(fd, "lastDoneOn"),
    lastDoneKm: int(fd, "lastDoneKm", { min: 0, max: 3_000_000 }),
    notes: str(fd, "notes", 1000),
    sourceRef: str(fd, "sourceRef", 300),
  };
}

export async function createTaskAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    // owners can only create user tasks; official tasks come from cited schedules
    await db.insert(s.maintenanceTasks).values({ ...taskFields(fd), vehicleId: v.id, kind: "user" });
    return done("התזכורת נוספה");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function updateTaskAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const t = await getOwnedTask(db, user.id, str(fd, "taskId") ?? "");
    if (!t) throw new FieldError("taskId", "המשימה לא נמצאה");
    await db.update(s.maintenanceTasks).set(taskFields(fd)).where(eq(s.maintenanceTasks.id, t.id));
    return done("התזכורת עודכנה");
  });
  revalidatePath("/", "layout");
  return res;
}

export async function deleteTaskAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const t = await getOwnedTask(db, user.id, str(fd, "taskId") ?? "");
  if (t) await db.delete(s.maintenanceTasks).where(eq(s.maintenanceTasks.id, t.id));
  revalidatePath("/", "layout");
}

export async function markTaskDoneAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const t = await getOwnedTask(db, user.id, str(fd, "taskId") ?? "");
    if (!t) throw new FieldError("taskId", "המשימה לא נמצאה");
    const doneOn = date(fd, "doneOn") ?? todayIso();
    const km = int(fd, "km", { min: 0, max: 3_000_000 });
    const next = completeTask(t as TaskInput, doneOn, km);
    await db
      .update(s.maintenanceTasks)
      .set({ lastDoneOn: next.lastDoneOn, lastDoneKm: next.lastDoneKm, active: next.active, dueOn: next.dueOn, dueKm: next.dueKm })
      .where(eq(s.maintenanceTasks.id, t.id));
    if (km != null) await recordMileageIfNewer(t.vehicleId, km, doneOn);
    return done("סומן כבוצע");
  });
  revalidatePath("/", "layout");
  return res;
}

async function recordMileageIfNewer(vehicleId: string, km: number, on: string) {
  const db = await getDb();
  const [last] = await db.select().from(s.mileageLogs).where(eq(s.mileageLogs.vehicleId, vehicleId)).orderBy(desc(s.mileageLogs.recordedOn)).limit(1);
  if (!last || (on >= last.recordedOn && km >= last.km)) await db.insert(s.mileageLogs).values({ vehicleId, km, recordedOn: on, note: "מתוך רישום טיפול" });
}

export async function createServiceRecordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let vid = "";
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    vid = v.id;
    const title = str(fd, "title", 200);
    if (!title) throw new FieldError("title", "נא להזין כותרת לטיפול");
    const performedOn = date(fd, "performedOn");
    if (!performedOn) throw new FieldError("performedOn", "נא להזין תאריך");
    if (performedOn > todayIso()) throw new FieldError("performedOn", "תאריך הטיפול עתידי");
    const km = int(fd, "km", { min: 0, max: 3_000_000 });
    const taskIds = fd.getAll("completedTaskIds").filter((x): x is string => typeof x === "string" && isUuid(x));
    const tasks = taskIds.length
      ? await db.select().from(s.maintenanceTasks).where(and(inArray(s.maintenanceTasks.id, taskIds), eq(s.maintenanceTasks.vehicleId, v.id)))
      : [];
    const workshopId = str(fd, "workshopId");
    const [rec] = await db
      .insert(s.serviceRecords)
      .values({
        vehicleId: v.id,
        performedOn,
        km,
        workshopId: workshopId && isUuid(workshopId) ? workshopId : null,
        workshopName: str(fd, "workshopName", 120),
        title,
        workPerformed: str(fd, "workPerformed", 4000),
        partsUsed: str(fd, "partsUsed", 2000),
        costIls: int(fd, "costIls", { min: 0, max: 10_000_000 }),
        includesVat: tri(fd, "includesVat"),
        notes: str(fd, "notes", 2000),
        completedTaskIds: tasks.map((t) => t.id),
      })
      .returning();
    for (const t of tasks) {
      // only move forward: a back-dated record must not reset a more recent completion
      if (t.lastDoneOn && t.lastDoneOn > performedOn) continue;
      const next = completeTask(t as TaskInput, performedOn, km);
      await db
        .update(s.maintenanceTasks)
        .set({ lastDoneOn: next.lastDoneOn, lastDoneKm: next.lastDoneKm, active: next.active, dueOn: next.dueOn, dueKm: next.dueKm })
        .where(eq(s.maintenanceTasks.id, t.id));
    }
    if (km != null) await recordMileageIfNewer(v.id, km, performedOn);
    const f = file(fd, "receipt");
    if (f) {
      const stored = await storeUpload(db, user.id, f, ["image", "pdf"]);
      await db.insert(s.attachments).values({ userId: user.id, vehicleId: v.id, entityType: "service", entityId: rec.id, fileId: stored.id, kind: "receipt", title: "קבלה" });
    }
    return done("הטיפול נשמר");
  });
  revalidatePath("/", "layout");
  if (res && "ok" in res && res.ok) redirect(`/maintenance?saved=1&v=${vid}`);
  return res;
}

export async function deleteServiceRecordAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const r = await getOwnedServiceRecord(db, user.id, str(fd, "id") ?? "");
  if (r) await db.delete(s.serviceRecords).where(eq(s.serviceRecords.id, r.id));
  revalidatePath("/", "layout");
  redirect("/maintenance/history");
}

export async function logSymptomAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = "";
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    const category = oneOf(fd, "category", TRIAGE_CATEGORIES.map((c) => c.key));
    if (!category) throw new FieldError("category", "בחרו סוג תסמין");
    const cat = TRIAGE_CATEGORIES.find((c) => c.key === category)!;
    const answers: Record<string, string> = {};
    for (const q of cat.questions) {
      const a = str(fd, `q_${q.id}`, 40);
      if (a && q.options.some((o) => o.value === a)) answers[q.id] = a;
    }
    const result = triage(category, answers);
    const [row] = await db
      .insert(s.symptomLogs)
      .values({
        vehicleId: v.id,
        category,
        answers,
        description: str(fd, "description", 2000),
        urgency: result.urgency,
        occurredOn: date(fd, "occurredOn") ?? todayIso(),
        km: int(fd, "km", { min: 0, max: 3_000_000 }),
      })
      .returning();
    for (const key of ["photo", "recording"] as const) {
      const f = file(fd, key);
      if (!f) continue;
      const stored = await storeUpload(db, user.id, f, key === "photo" ? ["image"] : ["audio", "video"]);
      await db.insert(s.attachments).values({
        userId: user.id,
        vehicleId: v.id,
        entityType: "symptom",
        entityId: row.id,
        fileId: stored.id,
        kind: stored.kind === "image" ? "photo" : stored.kind === "video" ? "video" : "audio",
        title: key === "photo" ? "תמונה" : "הקלטה",
      });
    }
    newId = row.id;
    return done("התסמין נשמר ביומן");
  });
  revalidatePath("/", "layout");
  if (res && "ok" in res && res.ok) redirect(`/troubleshoot/${newId}`);
  return res;
}

export async function toggleSymptomResolvedAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = str(fd, "id") ?? "";
  if (!isUuid(id)) return;
  const [row] = await db
    .select({ log: s.symptomLogs })
    .from(s.symptomLogs)
    .innerJoin(s.vehicles, eq(s.vehicles.id, s.symptomLogs.vehicleId))
    .where(and(eq(s.symptomLogs.id, id), eq(s.vehicles.userId, user.id)));
  if (row) await db.update(s.symptomLogs).set({ resolved: !row.log.resolved }).where(eq(s.symptomLogs.id, id));
  revalidatePath("/", "layout");
}

/** Copies a cited manufacturer schedule item into the owner's reminders (kind = official). */
export async function addOfficialTaskAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
  const itemId = str(fd, "itemId") ?? "";
  if (!isUuid(itemId) || !v.variantId) return;
  const [item] = await db
    .select()
    .from(s.officialServiceItems)
    .where(and(eq(s.officialServiceItems.id, itemId), eq(s.officialServiceItems.variantId, v.variantId)));
  if (!item) return;
  await db.insert(s.maintenanceTasks).values({
    vehicleId: v.id,
    title: item.title,
    kind: "official",
    intervalKm: item.intervalKm,
    intervalMonths: item.intervalMonths,
    sourceRef: `${item.sourceDocument}${item.sourcePage ? `, עמ׳ ${item.sourcePage}` : ""} (אומת ${item.verifiedAt})`,
    notes: item.severeUseNote,
  });
  revalidatePath("/", "layout");
}
