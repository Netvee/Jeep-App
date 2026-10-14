"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { isUuid } from "@/server/repo";
import { str, int, float, date, oneOf, bool, tri, file, guard, FieldError } from "@/server/formdata";
import { importCatalogue } from "@/db/seed/import-catalogue";
import { specSchema } from "@/lib/catalogue-format";
import { parseGpx } from "@/lib/gpx";
import { lineLengthKm, elevationStats, isInIsraelRegion } from "@/lib/geo";
import { COMPONENT_BY_KEY } from "@/lib/components";
import type { ActionState } from "@/components/forms";

async function audit(userId: string, action: string, entity: string, entityId: string | null, detail?: unknown) {
  const db = await getDb();
  await db.insert(s.adminAudit).values({ userId, action, entity, entityId, detail: detail ?? null });
}

const lines = (fd: FormData, key: string) =>
  (str(fd, key, 5000) ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);

const httpUrl = (fd: FormData, key: string) => {
  const v = str(fd, key, 500);
  if (v && !/^https?:\/\//i.test(v)) throw new FieldError(key, "כתובת חייבת להתחיל ב-http(s)://");
  return v;
};

/* ------------------------------------------------------------- catalogue */

export async function importCatalogueAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const f = file(fd, "file");
    const text = f ? await f.text() : str(fd, "json", 2_000_000);
    if (!text) throw new FieldError("json", "הדביקו JSON או בחרו קובץ");
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new FieldError("json", "JSON לא תקין");
    }
    try {
      const r = await importCatalogue(db, data);
      await audit(admin.id, "import", "catalogue", null, r);
      return { ok: true, message: `יובאו: ${r.makes} יצרנים, ${r.models} דגמים, ${r.generations} דורות, ${r.variants} גרסאות, ${r.specs} ערכי מפרט` };
    } catch (e) {
      if (e instanceof ZodError) return { error: "שגיאות אימות: " + e.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join(" | ") };
      throw e;
    }
  });
  revalidatePath("/", "layout");
  return res;
}

export async function upsertSpecAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const variantId = str(fd, "variantId") ?? "";
    if (!isUuid(variantId)) throw new FieldError("variantId", "גרסה לא תקינה");
    const parsed = specSchema.safeParse({
      key: str(fd, "key", 60),
      value: str(fd, "value", 300),
      unit: str(fd, "unit", 20) ?? undefined,
      source: str(fd, "source"),
      sourceRef: str(fd, "sourceRef", 500) ?? undefined,
      confidence: str(fd, "confidence"),
      verifiedAt: str(fd, "verifiedAt") ?? undefined,
    });
    if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(" | ") };
    const sp = parsed.data;
    await db.delete(s.variantSpecs).where(and(eq(s.variantSpecs.variantId, variantId), eq(s.variantSpecs.key, sp.key)));
    await db.insert(s.variantSpecs).values({ variantId, key: sp.key, value: sp.value, unit: sp.unit ?? null, source: sp.source, sourceRef: sp.sourceRef ?? null, confidence: sp.confidence, verifiedAt: sp.verifiedAt ?? null });
    await audit(admin.id, "upsert", "variant_spec", variantId, sp);
    return { ok: true, message: "נשמר" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function addReferenceImageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const generationId = str(fd, "generationId") ?? "";
    if (!isUuid(generationId)) throw new FieldError("generationId", "דור לא תקין");
    const license = str(fd, "license", 120);
    const attribution = str(fd, "attribution", 200);
    if (!license || !attribution) throw new FieldError("license", "רישיון וייחוס הם חובה");
    const url = httpUrl(fd, "url");
    if (!url || !url.startsWith("https://")) throw new FieldError("url", "נדרשת כתובת https לתמונה");
    await db.insert(s.referenceImages).values({ generationId, url, license, attribution, sourceUrl: httpUrl(fd, "sourceUrl") });
    await audit(admin.id, "create", "reference_image", generationId, { url, license });
    return { ok: true, message: "התמונה נוספה" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function addOfficialServiceItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const variantId = str(fd, "variantId") ?? "";
    if (!isUuid(variantId)) throw new FieldError("variantId", "גרסה לא תקינה");
    const title = str(fd, "title", 160);
    const sourceDocument = str(fd, "sourceDocument", 300);
    const verifiedAt = date(fd, "verifiedAt");
    if (!title || !sourceDocument || !verifiedAt) throw new FieldError("sourceDocument", "כותרת, מסמך מקור ותאריך אימות הם חובה");
    const intervalKm = int(fd, "intervalKm", { min: 100 });
    const intervalMonths = int(fd, "intervalMonths", { min: 1 });
    if (!intervalKm && !intervalMonths) throw new FieldError("intervalKm", "נדרש מרווח");
    await db.insert(s.officialServiceItems).values({ variantId, title, intervalKm, intervalMonths, sourceDocument, sourcePage: str(fd, "sourcePage", 20), severeUseNote: str(fd, "severeUseNote", 500), verifiedAt });
    await audit(admin.id, "create", "official_service_item", variantId, { title, sourceDocument });
    return { ok: true, message: "נוסף" };
  });
  revalidatePath("/", "layout");
  return res;
}

/* ----------------------------------------------------------------- parts */

const CATEGORIES = ["suspension", "tyres", "wheels", "protection", "recovery", "winch", "drivetrain", "compressor", "lighting", "electrical", "storage", "camping", "cooling", "engine", "brakes"] as const;

function partFields(fd: FormData) {
  const nameHe = str(fd, "nameHe", 160);
  const brand = str(fd, "brand", 80);
  if (!nameHe || !brand) throw new FieldError("nameHe", "שם ומותג הם חובה");
  const category = oneOf(fd, "category", CATEGORIES);
  if (!category) throw new FieldError("category", "בחרו קטגוריה");
  const componentKey = str(fd, "componentKey");
  if (!componentKey || !COMPONENT_BY_KEY[componentKey]) throw new FieldError("componentKey", "בחרו רכיב");
  const legalNote = str(fd, "legalNote", 1000);
  const legalSourceUrl = httpUrl(fd, "legalSourceUrl");
  const legalCheckedAt = date(fd, "legalCheckedAt");
  if (legalSourceUrl && !legalCheckedAt) throw new FieldError("legalCheckedAt", "מקור רגולטורי מחייב תאריך בדיקה");
  return {
    nameHe,
    brand,
    category,
    componentKey,
    nameEn: str(fd, "nameEn", 160),
    partNumber: str(fd, "partNumber", 80),
    description: str(fd, "description", 2000),
    aliases: lines(fd, "aliases"),
    benefits: lines(fd, "benefits"),
    tradeoffs: lines(fd, "tradeoffs"),
    maintenanceNotes: lines(fd, "maintenanceNotes"),
    requiredSupporting: lines(fd, "requiredSupporting"),
    installComplexity: int(fd, "installComplexity", { min: 1, max: 5 }),
    proInstallRecommended: tri(fd, "proInstallRecommended"),
    overlay: str(fd, "overlay", 30),
    liftCm: float(fd, "liftCm", { min: 0, max: 30 }),
    tyreSize: str(fd, "tyreSize", 30),
    legalNote,
    legalSourceUrl,
    legalCheckedAt,
    updatedAt: new Date(),
  };
}

export async function createPartAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const [p] = await db.insert(s.parts).values({ ...partFields(fd), isDemo: false }).returning();
    id = p.id;
    await audit(admin.id, "create", "part", p.id);
    return { ok: true };
  });
  if (res && "ok" in res && res.ok) redirect(`/admin/parts/${id}`);
  return res;
}

export async function updatePartAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const id = str(fd, "partId") ?? "";
    if (!isUuid(id)) throw new FieldError("partId", "פריט לא תקין");
    await db.update(s.parts).set(partFields(fd)).where(eq(s.parts.id, id));
    await audit(admin.id, "update", "part", id);
    return { ok: true, message: "נשמר" };
  });
  revalidatePath("/", "layout");
  return res;
}

const FIT = ["verified", "owner_reported", "unconfirmed", "incompatible"] as const;

export async function upsertFitmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const partId = str(fd, "partId") ?? "";
    const variantId = str(fd, "variantId") ?? "";
    if (!isUuid(partId) || !isUuid(variantId)) throw new FieldError("variantId", "בחרו גרסה");
    const status = oneOf(fd, "status", FIT);
    if (!status) throw new FieldError("status", "בחרו סטטוס");
    const evidence = str(fd, "evidence", 1000);
    const sourceUrl = httpUrl(fd, "sourceUrl");
    const verifiedAt = date(fd, "verifiedAt");
    if (status === "verified" && (!evidence || !verifiedAt)) throw new FieldError("evidence", "״מאומת״ מחייב ראיה מתועדת ותאריך אימות");
    if ((status === "owner_reported" || status === "incompatible") && !evidence) throw new FieldError("evidence", "יש לתעד את מקור הדיווח");
    const [part] = await db.select({ isDemo: s.parts.isDemo }).from(s.parts).where(eq(s.parts.id, partId));
    await db.delete(s.fitments).where(and(eq(s.fitments.partId, partId), eq(s.fitments.variantId, variantId)));
    if (str(fd, "remove") !== "1")
      await db.insert(s.fitments).values({ partId, variantId, status, evidence, sourceUrl, verifiedAt, notes: str(fd, "notes", 500), isDemo: !!part?.isDemo });
    await audit(admin.id, "upsert", "fitment", partId, { variantId, status });
    return { ok: true, message: "נשמר" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function addPriceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const partId = str(fd, "partId") ?? "";
    if (!isUuid(partId)) throw new FieldError("partId", "פריט לא תקין");
    const kind = oneOf(fd, "kind", ["supplier", "owner_reported", "estimate"] as const);
    if (!kind) throw new FieldError("kind", "בחרו סוג מחיר");
    const amountMin = int(fd, "amountMin", { min: 0 });
    if (amountMin == null) throw new FieldError("amountMin", "נדרש סכום");
    const observedAt = date(fd, "observedAt");
    if (!observedAt) throw new FieldError("observedAt", "נדרש תאריך");
    const supplierId = str(fd, "supplierId");
    const sourceUrl = httpUrl(fd, "sourceUrl");
    if (kind === "supplier" && !supplierId && !sourceUrl) throw new FieldError("supplierId", "מחיר ספק מחייב ספק או קישור למקור");
    await db.insert(s.prices).values({
      partId,
      supplierId: supplierId && isUuid(supplierId) ? supplierId : null,
      kind,
      amountMin,
      amountMax: int(fd, "amountMax", { min: 0 }),
      includesVat: tri(fd, "includesVat"),
      availability: str(fd, "availability", 120),
      sourceUrl,
      observedAt,
    });
    await audit(admin.id, "create", "price", partId, { kind, amountMin });
    return { ok: true, message: "המחיר נוסף" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function deletePriceAction(fd: FormData) {
  const admin = await requireAdmin();
  const db = await getDb();
  const id = str(fd, "id") ?? "";
  if (!isUuid(id)) return;
  await db.delete(s.prices).where(eq(s.prices.id, id));
  await audit(admin.id, "delete", "price", id);
  revalidatePath("/", "layout");
}

export async function addSupplierAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const name = str(fd, "name", 120);
    if (!name) throw new FieldError("name", "נדרש שם");
    const verified = bool(fd, "verified");
    const verifiedAt = date(fd, "verifiedAt");
    if (verified && !verifiedAt) throw new FieldError("verifiedAt", "ספק מאומת מחייב תאריך אימות");
    await db.insert(s.suppliers).values({ name, url: httpUrl(fd, "url"), city: str(fd, "city", 80), verified, verifiedAt });
    await audit(admin.id, "create", "supplier", null, { name });
    return { ok: true, message: "הספק נוסף" };
  });
  revalidatePath("/admin", "layout");
  return res;
}

/* ---------------------------------------------------------------- trails */

const REGIONS = ["north", "center", "south", "judea_samaria"] as const;

export async function importTrailGpxAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const f = file(fd, "gpx");
    if (!f) throw new FieldError("gpx", "בחרו קובץ GPX");
    const parsed = parseGpx(await f.text());
    if (!parsed.ok) throw new FieldError("gpx", parsed.error);
    const nameHe = str(fd, "nameHe", 160);
    const region = oneOf(fd, "region", REGIONS);
    const sourceName = str(fd, "sourceName", 200);
    const license = str(fd, "license", 200);
    if (!nameHe || !region) throw new FieldError("nameHe", "שם ואזור הם חובה");
    if (!sourceName || !license) throw new FieldError("license", "מקור ורישיון שימוש הם חובה — אין לייבא נתונים ללא הרשאה");
    const track = parsed.tracks.find((t) => t.points.length >= 2);
    const geometry = track ? track.points : null;
    const start = geometry ? [geometry[0][0], geometry[0][1]] : parsed.waypoints[0] ? [parsed.waypoints[0].lng, parsed.waypoints[0].lat] : null;
    if (!start) throw new FieldError("gpx", "אין בקובץ מסלול או נקודה");
    if (!isInIsraelRegion(start[1], start[0])) throw new FieldError("gpx", "נקודת ההתחלה מחוץ לאזור הנתמך");
    const el = geometry ? elevationStats(geometry) : null;
    const slugBase = (str(fd, "slug", 60) ?? `trail-${Date.now().toString(36)}`).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const [t] = await db
      .insert(s.trails)
      .values({
        slug: slugBase,
        nameHe,
        nameEn: str(fd, "nameEn", 160),
        region,
        kind: geometry ? "route" : "pin",
        geometry,
        startPoint: start as [number, number],
        endPoint: geometry ? [geometry[geometry.length - 1][0], geometry[geometry.length - 1][1]] : null,
        distanceKm: geometry ? Math.round(lineLengthKm(geometry) * 10) / 10 : null,
        elevationGainM: el?.gain ?? null,
        elevationMinM: el?.min ?? null,
        elevationMaxM: el?.max ?? null,
        sourceName,
        sourceUrl: httpUrl(fd, "sourceUrl"),
        license,
        lastVerifiedAt: date(fd, "lastVerifiedAt"),
        status: "draft",
        isDemo: false,
      })
      .returning();
    id = t.id;
    await audit(admin.id, "import", "trail", t.id, { points: geometry?.length ?? 0, warnings: parsed.warnings });
    return { ok: true };
  });
  if (res && "ok" in res && res.ok) redirect(`/admin/trails/${id}`);
  return res;
}

const accessSchema = z.array(
  z.object({
    type: z.enum(["nature_reserve", "firing_zone", "private_land", "temporary", "seasonal", "other"]),
    description: z.string().min(3).max(500),
    sourceUrl: z.string().url().startsWith("http").optional(),
    verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    authority: z.string().max(100).optional(),
  }),
);

export async function updateTrailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const id = str(fd, "trailId") ?? "";
    if (!isUuid(id)) throw new FieldError("trailId", "מסלול לא תקין");
    const [t] = await db.select().from(s.trails).where(eq(s.trails.id, id));
    if (!t) throw new FieldError("trailId", "לא נמצא");
    let access = t.access;
    const accessRaw = str(fd, "access", 10000);
    if (accessRaw != null) {
      try {
        access = accessSchema.parse(JSON.parse(accessRaw));
      } catch {
        throw new FieldError("access", "JSON הגבלות גישה לא תקין (ראו דוגמה)");
      }
    } else access = [];
    const status = oneOf(fd, "status", ["draft", "published"] as const) ?? t.status;
    const lastVerifiedAt = date(fd, "lastVerifiedAt");
    if (status === "published" && !t.isDemo && (!t.license || !lastVerifiedAt)) throw new FieldError("status", "פרסום מסלול אמיתי מחייב רישיון ותאריך אימות");
    const minClear = float(fd, "minGroundClearanceCm", { min: 5, max: 80 });
    const tyres = oneOf(fd, "reqTyres", ["road", "at", "mt"] as const);
    await db
      .update(s.trails)
      .set({
        nameHe: str(fd, "nameHe", 160) ?? t.nameHe,
        description: str(fd, "description", 4000),
        difficulty: int(fd, "difficulty", { min: 1, max: 5 }),
        durationMin: int(fd, "durationMin", { min: 1, max: 5000 }),
        surfaces: lines(fd, "surfaces"),
        seasonality: str(fd, "seasonality", 300),
        obstaclesSummary: str(fd, "obstaclesSummary", 1000),
        suggestedEquipment: lines(fd, "suggestedEquipment"),
        driverExperience: oneOf(fd, "driverExperience", ["beginner", "intermediate", "advanced"] as const),
        receptionNotes: str(fd, "receptionNotes", 300),
        exitPoints: str(fd, "exitPoints", 500),
        advisories: str(fd, "advisories", 500),
        requirements: {
          ...(minClear != null ? { minGroundClearanceCm: minClear } : {}),
          ...(bool(fd, "reqLowRange") ? { lowRange: true } : {}),
          ...(tyres ? { tyres } : {}),
          ...(bool(fd, "reqLockers") ? { lockersRecommended: true } : {}),
          ...(bool(fd, "reqRecovery") ? { recoveryGearRecommended: true } : {}),
        },
        access,
        lastVerifiedAt,
        status,
        updatedAt: new Date(),
      })
      .where(eq(s.trails.id, id));
    await audit(admin.id, "update", "trail", id, { status });
    return { ok: true, message: "נשמר" };
  });
  revalidatePath("/", "layout");
  return res;
}

/* --------------------------------------------------------------- reports */

export async function moderateReportAction(fd: FormData) {
  const admin = await requireAdmin();
  const db = await getDb();
  const id = str(fd, "id") ?? "";
  if (!isUuid(id)) return;
  const decision = str(fd, "decision");
  const note = str(fd, "note", 500);
  if (decision === "approve") await db.update(s.trailReports).set({ status: "approved", moderationNote: note }).where(eq(s.trailReports.id, id));
  else if (decision === "reject") await db.update(s.trailReports).set({ status: "rejected", moderationNote: note }).where(eq(s.trailReports.id, id));
  else if (decision === "verify") {
    const src = str(fd, "verificationSource", 300);
    if (!src) return; // verification always needs a source
    await db.update(s.trailReports).set({ status: "approved", verified: true, verificationSource: src, moderationNote: note }).where(eq(s.trailReports.id, id));
  } else if (decision === "duplicate") {
    const dup = str(fd, "duplicateOf") ?? "";
    if (!isUuid(dup)) return;
    await db.update(s.trailReports).set({ status: "duplicate", duplicateOf: dup, moderationNote: note }).where(eq(s.trailReports.id, id));
  }
  await audit(admin.id, decision ?? "unknown", "trail_report", id, { note });
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------- workshops */

export async function upsertWorkshopAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const admin = await requireAdmin();
    const db = await getDb();
    const id = str(fd, "workshopId");
    const name = str(fd, "name", 120);
    const region = oneOf(fd, "region", REGIONS);
    if (!name || !region) throw new FieldError("name", "שם ואזור הם חובה");
    const verified = bool(fd, "verified");
    const verifiedAt = date(fd, "verifiedAt");
    if (verified && !verifiedAt) throw new FieldError("verifiedAt", "אימות מחייב תאריך");
    const values = {
      name,
      region,
      city: str(fd, "city", 80),
      phone: str(fd, "phone", 30),
      website: httpUrl(fd, "website"),
      specialties: (str(fd, "specialties", 300) ?? "").split(",").map((x) => x.trim()).filter(Boolean),
      verified,
      verifiedAt,
      sponsored: bool(fd, "sponsored"),
      notes: str(fd, "notes", 1000),
      updatedAt: new Date(),
    };
    if (id && isUuid(id)) await db.update(s.workshops).set(values).where(and(eq(s.workshops.id, id)));
    else await db.insert(s.workshops).values({ ...values, isDemo: false });
    await audit(admin.id, id ? "update" : "create", "workshop", id ?? null, { name });
    return { ok: true, message: "נשמר" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function hidePostAction(fd: FormData) {
  const admin = await requireAdmin();
  const db = await getDb();
  const id = str(fd, "id") ?? "";
  if (!isUuid(id)) return;
  await db.update(s.communityPosts).set({ status: "hidden" }).where(eq(s.communityPosts.id, id));
  await audit(admin.id, "hide", "community_post", id);
  revalidatePath("/", "layout");
}
