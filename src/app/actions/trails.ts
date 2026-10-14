"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/server/auth";
import { isUuid } from "@/server/repo";
import { str, float, date, oneOf, file, guard, FieldError } from "@/server/formdata";
import { storeUpload } from "@/server/files";
import { distanceToLineKm, haversineKm, isInIsraelRegion } from "@/lib/geo";
import { todayIso } from "@/lib/units";
import { DUPLICATE_RADIUS_KM, DUPLICATE_WINDOW_DAYS } from "@/lib/trails";
import type { ActionState } from "@/components/forms";

const CATS = ["rock_step", "boulders", "ruts", "sand", "mud", "steep", "off_camber", "water", "locked_gate", "closure", "damage", "other"] as const;

export async function toggleSaveTrailAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const trailId = str(fd, "trailId") ?? "";
  if (!isUuid(trailId)) return;
  const [row] = await db.select().from(s.savedTrails).where(and(eq(s.savedTrails.userId, user.id), eq(s.savedTrails.trailId, trailId)));
  if (row) await db.delete(s.savedTrails).where(and(eq(s.savedTrails.userId, user.id), eq(s.savedTrails.trailId, trailId)));
  else await db.insert(s.savedTrails).values({ userId: user.id, trailId });
  revalidatePath("/trails", "layout");
}

export async function submitReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const trailId = str(fd, "trailId");
    if (!trailId || !isUuid(trailId)) throw new FieldError("trailId", "מסלול לא תקין");
    const [trail] = await db.select().from(s.trails).where(and(eq(s.trails.id, trailId), eq(s.trails.status, "published")));
    if (!trail) throw new FieldError("trailId", "המסלול לא נמצא");
    const lat = float(fd, "lat", { min: -90, max: 90 });
    const lng = float(fd, "lng", { min: -180, max: 180 });
    if (lat == null || lng == null) throw new FieldError("lat", "בחרו מיקום על המפה או השתמשו במיקום הנוכחי");
    if (!isInIsraelRegion(lat, lng)) throw new FieldError("lat", "המיקום מחוץ לאזור הנתמך");
    const near = trail.geometry?.length ? distanceToLineKm([lng, lat], trail.geometry) : haversineKm([lng, lat], trail.startPoint);
    if (near > 5) throw new FieldError("lat", `המיקום רחוק כ-${near.toFixed(1)} ק״מ מהמסלול. דווחו על נקודה לאורכו.`);
    const category = oneOf(fd, "category", CATS);
    if (!category) throw new FieldError("category", "בחרו סוג מכשול");
    const description = str(fd, "description", 1000);
    if (!description || description.length < 5) throw new FieldError("description", "תארו בקצרה (לפחות 5 תווים)");
    const observedOn = date(fd, "observedOn") ?? todayIso();
    if (observedOn > todayIso()) throw new FieldError("observedOn", "תאריך עתידי");

    // duplicate detection: same trail + category, close by, recent
    const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
    const candidates = await db
      .select()
      .from(s.trailReports)
      .where(and(eq(s.trailReports.trailId, trail.id), eq(s.trailReports.category, category), gte(s.trailReports.observedOn, since), inArray(s.trailReports.status, ["approved", "pending"])));
    const dup = candidates.find((c) => haversineKm([c.lng, c.lat], [lng, lat]) <= DUPLICATE_RADIUS_KM);

    let photoId: string | null = null;
    const f = file(fd, "photo");
    if (f) photoId = (await storeUpload(db, user.id, f, ["image"])).id;
    await db.insert(s.trailReports).values({
      trailId: trail.id,
      userId: user.id,
      lat,
      lng,
      category,
      description,
      observedOn,
      photoFileId: photoId,
      status: dup ? "duplicate" : "pending",
      duplicateOf: dup?.id ?? null,
    });
    return {
      ok: true,
      message: dup
        ? "נמצא דיווח דומה סמוך מהחודש האחרון — הדיווח שלכם נשמר כאישור נוסף לדיווח הקיים."
        : "הדיווח נשלח לבדיקה ויוצג לאחר אישור. תודה!",
    };
  });
  revalidatePath("/trails", "layout");
  return res;
}
