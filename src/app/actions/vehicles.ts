"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/server/auth";
import { getOwnedVehicle, requireOwnedVehicle, getVariantBundle, getOwnedUpgrade, getOwnedServiceRecord, isUuid } from "@/server/repo";
import { str, int, float, tri, date, oneOf, many, file, guard, FieldError } from "@/server/formdata";
import { storeUpload } from "@/server/files";
import type { ActionState } from "@/components/forms";
import { todayIso, parseTyreSize } from "@/lib/units";

const USES = ["daily", "light_trails", "desert_sand", "rocky", "overlanding", "towing", "mud"] as const;
const BODIES = ["suv-2door", "suv-4door", "pickup-double", "pickup-single", "pickup-extended"] as const;

export async function setActiveVehicleAction(vehicleId: string) {
  const user = await requireUser();
  const db = await getDb();
  const v = await getOwnedVehicle(db, user.id, vehicleId);
  if (!v) return;
  await db.update(s.users).set({ prefs: { ...user.prefs, activeVehicleId: v.id } }).where(eq(s.users.id, user.id));
  revalidatePath("/", "layout");
}

function vehicleFields(fd: FormData) {
  const tyreSize = str(fd, "tyreSize", 40);
  if (tyreSize && !parseTyreSize(tyreSize)) throw new FieldError("tyreSize", "מידת צמיג לא מזוהה. דוגמאות: 265/70R17 או 35x12.50R17");
  return {
    nickname: str(fd, "nickname", 60),
    make: str(fd, "make", 60),
    model: str(fd, "model", 60),
    generation: str(fd, "generation", 60),
    year: int(fd, "year", { min: 1940, max: new Date().getFullYear() + 1 }),
    trim: str(fd, "trim", 80),
    engine: str(fd, "engine", 120),
    transmission: str(fd, "transmission", 120),
    drivetrain: str(fd, "drivetrain", 200),
    body: oneOf(fd, "body", BODIES),
    wheelbaseMm: int(fd, "wheelbaseMm", { min: 1500, max: 4500 }),
    tyreSize: tyreSize ? parseTyreSize(tyreSize)!.label : null,
    wheelSpec: str(fd, "wheelSpec", 120),
    suspension: str(fd, "suspension", 300),
    liftCm: float(fd, "liftCm", { min: 0, max: 30 }),
    groundClearanceCm: float(fd, "groundClearanceCm", { min: 5, max: 80 }),
    hasLowRange: tri(fd, "hasLowRange"),
    lockers: oneOf(fd, "lockers", ["none", "rear", "front_rear", "center_only"] as const),
    tyreType: oneOf(fd, "tyreType", ["road", "at", "mt"] as const),
    intendedUse: many(fd, "intendedUse", USES),
    driverExperience: oneOf(fd, "driverExperience", ["beginner", "intermediate", "advanced"] as const),
    registrationPlate: str(fd, "registrationPlate", 20),
    vin: str(fd, "vin", 30),
    purchaseDate: date(fd, "purchaseDate"),
    ownershipNotes: str(fd, "ownershipNotes", 2000),
    budgetIls: int(fd, "budgetIls", { min: 0, max: 10_000_000 }),
  };
}

export async function createVehicleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = "";
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const fields = vehicleFields(fd);
    const variantIdRaw = str(fd, "variantId");
    const bundle = variantIdRaw && isUuid(variantIdRaw) ? await getVariantBundle(db, variantIdRaw) : null;
    if (bundle) {
      // pre-fill unknowns from the catalogue variant (owner can override later)
      const spec = (k: string) => bundle.specs.find((x) => x.key === k)?.value ?? null;
      fields.make ??= bundle.make.nameEn;
      fields.model ??= bundle.model.nameEn;
      fields.generation ??= bundle.generation.code;
      fields.trim ??= bundle.variant.trim;
      fields.engine ??= bundle.variant.engine;
      fields.transmission ??= bundle.variant.transmission;
      fields.drivetrain ??= bundle.variant.drivetrain;
      fields.body ??= bundle.variant.body;
      fields.wheelbaseMm ??= spec("wheelbase_mm") ? Number(spec("wheelbase_mm")) : null;
    }
    const photo = file(fd, "photo");
    const photoId = photo ? (await storeUpload(db, user.id, photo, ["image"])).id : null;
    const [v] = await db
      .insert(s.vehicles)
      .values({ ...fields, userId: user.id, variantId: bundle?.variant.id ?? null, photoFileId: photoId })
      .returning();
    const km = int(fd, "km", { min: 0, max: 3_000_000 });
    if (km != null) await db.insert(s.mileageLogs).values({ vehicleId: v.id, km, recordedOn: todayIso(), note: "רישום ראשוני" });
    await db.update(s.users).set({ prefs: { ...user.prefs, activeVehicleId: v.id } }).where(eq(s.users.id, user.id));
    newId = v.id;
    return { ok: true };
  });
  if (res && "ok" in res && res.ok) {
    revalidatePath("/", "layout");
    redirect(`/garage?welcome=${newId}`);
  }
  return res;
}

export async function updateVehicleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    const fields = vehicleFields(fd);
    const variantIdRaw = str(fd, "variantId");
    const variantId = variantIdRaw === "none" ? null : variantIdRaw && isUuid(variantIdRaw) ? variantIdRaw : v.variantId;
    await db
      .update(s.vehicles)
      .set({ ...fields, variantId, updatedAt: new Date() })
      .where(and(eq(s.vehicles.id, v.id), eq(s.vehicles.userId, user.id)));
    return { ok: true, message: "פרופיל הרכב נשמר" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function deleteVehicleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    if (str(fd, "confirm") !== "מחק") throw new FieldError("confirm", "כדי למחוק הקלידו: מחק");
    await db.delete(s.vehicles).where(and(eq(s.vehicles.id, v.id), eq(s.vehicles.userId, user.id)));
    return { ok: true };
  });
  if (res && "ok" in res && res.ok) {
    revalidatePath("/", "layout");
    redirect("/garage/vehicles");
  }
  return res;
}

export async function addMileageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    const km = int(fd, "km", { min: 0, max: 3_000_000 });
    if (km == null) throw new FieldError("km", "נא להזין קילומטראז׳");
    const recordedOn = date(fd, "recordedOn") ?? todayIso();
    if (recordedOn > todayIso()) throw new FieldError("recordedOn", "לא ניתן לרשום קריאה עתידית");
    const [prev] = await db
      .select()
      .from(s.mileageLogs)
      .where(eq(s.mileageLogs.vehicleId, v.id))
      .orderBy(desc(s.mileageLogs.recordedOn))
      .limit(1);
    if (prev && recordedOn >= prev.recordedOn && km < prev.km && str(fd, "correction") !== "on")
      throw new FieldError("km", `הקריאה נמוכה מהקריאה הקודמת (${prev.km.toLocaleString("he-IL")} ק״מ). אם זה תיקון, סמנו "תיקון טעות".`);
    await db.insert(s.mileageLogs).values({ vehicleId: v.id, km, recordedOn, note: str(fd, "note", 200) });
    return { ok: true, message: "הקילומטראז׳ עודכן" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function deleteMileageAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = str(fd, "id");
  if (!id || !isUuid(id)) return;
  const [row] = await db
    .select({ id: s.mileageLogs.id })
    .from(s.mileageLogs)
    .innerJoin(s.vehicles, eq(s.vehicles.id, s.mileageLogs.vehicleId))
    .where(and(eq(s.mileageLogs.id, id), eq(s.vehicles.userId, user.id)));
  if (row) await db.delete(s.mileageLogs).where(eq(s.mileageLogs.id, row.id));
  revalidatePath("/", "layout");
}

export async function uploadVehiclePhotoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    const f = file(fd, "photo");
    if (!f) throw new FieldError("photo", "לא נבחרה תמונה");
    const stored = await storeUpload(db, user.id, f, ["image"]);
    await db.update(s.vehicles).set({ photoFileId: stored.id, updatedAt: new Date() }).where(eq(s.vehicles.id, v.id));
    await db.insert(s.attachments).values({ userId: user.id, vehicleId: v.id, entityType: "vehicle", entityId: v.id, fileId: stored.id, kind: "photo", title: "תמונת רכב" });
    return { ok: true, message: "התמונה עודכנה (מטא-נתוני מיקום הוסרו)" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function removeVehiclePhotoAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const v = await getOwnedVehicle(db, user.id, str(fd, "vehicleId"));
  if (!v) return;
  await db.update(s.vehicles).set({ photoFileId: null }).where(eq(s.vehicles.id, v.id));
  revalidatePath("/", "layout");
}

const ENTITY_TYPES = ["vehicle", "upgrade", "service", "symptom", "quote", "document"] as const;
const KINDS = ["photo", "receipt", "document", "audio", "video"] as const;

/** Upload a document/receipt/photo/recording and attach it to an owned entity. */
export async function uploadAttachmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const entityType = oneOf(fd, "entityType", ENTITY_TYPES) ?? "document";
    const kind = oneOf(fd, "kind", KINDS) ?? "document";
    const entityId = str(fd, "entityId");
    const vehicle = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    // verify the entity belongs to this vehicle/user
    if (entityId) {
      let ok = false;
      if (entityType === "vehicle" || entityType === "document") ok = entityId === vehicle.id;
      if (entityType === "upgrade") ok = (await getOwnedUpgrade(db, user.id, entityId))?.vehicle.id === vehicle.id;
      if (entityType === "service") ok = (await getOwnedServiceRecord(db, user.id, entityId))?.vehicleId === vehicle.id;
      if (entityType === "symptom") {
        const [row] = isUuid(entityId) ? await db.select().from(s.symptomLogs).where(and(eq(s.symptomLogs.id, entityId), eq(s.symptomLogs.vehicleId, vehicle.id))) : [];
        ok = !!row;
      }
      if (entityType === "quote") {
        const [row] = isUuid(entityId) ? await db.select().from(s.quotes).where(and(eq(s.quotes.id, entityId), eq(s.quotes.userId, user.id))) : [];
        ok = !!row;
      }
      if (!ok) throw new FieldError("entityId", "לא ניתן לצרף לרשומה זו");
    }
    const f = file(fd, "file");
    if (!f) throw new FieldError("file", "לא נבחר קובץ");
    const allowed = kind === "audio" ? (["audio"] as const) : kind === "video" ? (["video"] as const) : kind === "photo" ? (["image"] as const) : (["image", "pdf"] as const);
    const stored = await storeUpload(db, user.id, f, [...allowed]);
    await db.insert(s.attachments).values({
      userId: user.id,
      vehicleId: vehicle.id,
      entityType,
      entityId: entityId ?? vehicle.id,
      fileId: stored.id,
      kind,
      title: str(fd, "title", 120),
    });
    return { ok: true, message: "הקובץ נשמר" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function deleteAttachmentAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = str(fd, "id");
  if (!id || !isUuid(id)) return;
  const [a] = await db.select().from(s.attachments).where(and(eq(s.attachments.id, id), eq(s.attachments.userId, user.id)));
  if (!a) return;
  await db.delete(s.attachments).where(eq(s.attachments.id, a.id));
  await db.delete(s.files).where(and(eq(s.files.id, a.fileId), eq(s.files.ownerId, user.id)));
  revalidatePath("/", "layout");
}
