"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/server/auth";
import { requireOwnedVehicle, isUuid } from "@/server/repo";
import { str, int, oneOf, bool, guard, FieldError } from "@/server/formdata";
import type { ActionState } from "@/components/forms";

const REGIONS = ["north", "center", "south", "judea_samaria"] as const;

export async function addPrivateWorkshopAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const name = str(fd, "name", 120);
    if (!name) throw new FieldError("name", "נא להזין שם");
    const region = oneOf(fd, "region", REGIONS);
    if (!region) throw new FieldError("region", "בחרו אזור");
    const website = str(fd, "website", 300);
    if (website && !/^https?:\/\//i.test(website)) throw new FieldError("website", "כתובת אתר חייבת להתחיל ב-http(s)://");
    await db.insert(s.workshops).values({
      name,
      region,
      city: str(fd, "city", 80),
      phone: str(fd, "phone", 30),
      website,
      specialties: (str(fd, "specialties", 300) ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10),
      notes: str(fd, "notes", 1000),
      ownerId: user.id,
      verified: false,
    });
    return { ok: true, message: "המוסך נוסף לרשימה הפרטית שלכם" };
  });
  revalidatePath("/workshops");
  return res;
}

export async function deletePrivateWorkshopAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = str(fd, "id") ?? "";
  if (!isUuid(id)) return;
  await db.delete(s.workshops).where(and(eq(s.workshops.id, id), eq(s.workshops.ownerId, user.id)));
  revalidatePath("/workshops");
}

const KINDS = ["upgrade_experience", "install_cost", "reliability", "workshop_review"] as const;

export async function createPostAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    if (user.isDemoAccount) throw new FieldError("kind", "חשבון הדגמה אינו יכול לפרסם בקהילה — כדי לשמור על תוכן אמיתי בלבד.");
    const db = await getDb();
    const kind = oneOf(fd, "kind", KINDS);
    if (!kind) throw new FieldError("kind", "בחרו סוג פוסט");
    const title = str(fd, "title", 140);
    const body = str(fd, "body", 5000);
    if (!title || !body) throw new FieldError("title", "כותרת ותוכן נדרשים");
    const vehicle = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    let generationId: string | null = null;
    if (vehicle.variantId) {
      const [v] = await db.select({ g: s.variants.generationId }).from(s.variants).where(eq(s.variants.id, vehicle.variantId));
      generationId = v?.g ?? null;
    }
    const partId = str(fd, "partId");
    const workshopId = str(fd, "workshopId");
    const rating = int(fd, "rating", { min: 1, max: 5 });
    if (kind === "workshop_review" && (!workshopId || !isUuid(workshopId))) throw new FieldError("workshopId", "בחרו מוסך לביקורת");
    await db.insert(s.communityPosts).values({
      userId: user.id,
      generationId,
      variantId: vehicle.variantId,
      kind,
      title,
      body,
      partId: partId && isUuid(partId) ? partId : null,
      workshopId: workshopId && isUuid(workshopId) ? workshopId : null,
      costIls: int(fd, "costIls", { min: 0, max: 10_000_000 }),
      rating: kind === "workshop_review" ? rating : null,
    });
    return { ok: true, message: "פורסם" };
  });
  revalidatePath("/community");
  return res;
}

export async function deleteOwnPostAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = str(fd, "id") ?? "";
  if (!isUuid(id)) return;
  await db.delete(s.communityPosts).where(and(eq(s.communityPosts.id, id), eq(s.communityPosts.userId, user.id)));
  revalidatePath("/community");
}

/** Opt-in public build profile. Only whitelisted, non-sensitive fields are ever published. */
export async function saveBuildProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    const title = str(fd, "title", 100);
    if (!title) throw new FieldError("title", "נא לתת כותרת לפרופיל");
    const isPublic = bool(fd, "isPublic");
    if (isPublic && user.isDemoAccount) throw new FieldError("isPublic", "חשבון הדגמה אינו יכול לפרסם פרופיל ציבורי");
    const [existing] = await db.select().from(s.buildProfiles).where(eq(s.buildProfiles.vehicleId, v.id));
    const values = { title, summary: str(fd, "summary", 1500), isPublic, showPhoto: bool(fd, "showPhoto"), showCosts: bool(fd, "showCosts"), updatedAt: new Date() };
    if (existing) await db.update(s.buildProfiles).set(values).where(eq(s.buildProfiles.vehicleId, v.id));
    else
      await db.insert(s.buildProfiles).values({ vehicleId: v.id, slug: `${v.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`, ...values });
    return { ok: true, message: isPublic ? "הפרופיל ציבורי" : "הפרופיל נשמר כפרטי" };
  });
  revalidatePath("/", "layout");
  return res;
}
