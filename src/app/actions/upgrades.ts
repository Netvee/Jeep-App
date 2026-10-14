"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/server/auth";
import { requireOwnedVehicle, getOwnedUpgrade, getOwnedQuote, isUuid } from "@/server/repo";
import { str, int, date, oneOf, tri, bool, file, guard, FieldError } from "@/server/formdata";
import { storeUpload } from "@/server/files";
import { loadPartsWithFitment } from "@/server/catalog";
import { COMPONENT_BY_KEY } from "@/lib/components";
import { todayIso, parseTyreSize } from "@/lib/units";
import type { ActionState } from "@/components/forms";

const STATUSES = ["wishlist", "planned", "quoted", "purchased", "installed", "removed"] as const;
const PHASES = ["essential", "protection", "capability", "comfort"] as const;
const COST_KINDS = ["part", "labour", "supporting", "shipping"] as const;
const COST_SOURCES = ["supplier", "owner", "estimate", "quote", "receipt"] as const;

export async function addUpgradeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = "";
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    const partId = str(fd, "partId");
    let componentKey = str(fd, "componentKey");
    let customName = str(fd, "customName", 120);
    let part: typeof s.parts.$inferSelect | null = null;
    if (partId) {
      if (!isUuid(partId)) throw new FieldError("partId", "פריט לא תקין");
      [part] = await db.select().from(s.parts).where(eq(s.parts.id, partId));
      if (!part) throw new FieldError("partId", "הפריט לא נמצא");
      componentKey = part.componentKey;
      customName = null;
    }
    if (!componentKey || !COMPONENT_BY_KEY[componentKey]) throw new FieldError("componentKey", "בחרו רכיב");
    if (!part && !customName) throw new FieldError("customName", "נא להזין שם לשדרוג");
    const [u] = await db
      .insert(s.vehicleUpgrades)
      .values({
        vehicleId: v.id,
        partId: part?.id ?? null,
        customName,
        componentKey,
        status: oneOf(fd, "status", STATUSES) ?? "wishlist",
        phase: oneOf(fd, "phase", PHASES),
        priority: int(fd, "priority", { min: 1, max: 5 }) ?? 3,
        alternativeGroup: str(fd, "alternativeGroup", 40),
        reason: str(fd, "reason", 500),
        // recording an already-installed upgrade
        installedOn: date(fd, "installedOn"),
        installedKm: int(fd, "installedKm", { min: 0, max: 3_000_000 }),
        installedBy: str(fd, "installedBy", 120),
      })
      .returning();
    // copy the catalogue's best price as the starting part-cost line, keeping its provenance
    if (part) {
      const [pw] = await loadPartsWithFitment(db, { vehicle: v, showDemo: true, partIds: [part.id] });
      const best = pw?.bestPrice;
      if (best)
        await db.insert(s.upgradeCosts).values({
          upgradeId: u.id,
          kind: "part",
          amountMin: best.amountMin,
          amountMax: best.amountMax ?? best.amountMin,
          includesVat: best.includesVat,
          source: best.kind === "supplier" ? "supplier" : best.kind === "owner_reported" ? "owner" : "estimate",
          note: `הועתק מהקטלוג${best.isDemo ? " (מחיר הדגמה)" : ""}`,
          recordedOn: best.observedAt,
        });
    }
    newId = u.id;
    return { ok: true };
  });
  revalidatePath("/", "layout");
  if (res && "ok" in res && res.ok) redirect(`/upgrades/${newId}?added=1`);
  return res;
}

export async function updateUpgradeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const row = await getOwnedUpgrade(db, user.id, str(fd, "upgradeId") ?? "");
    if (!row) throw new FieldError("upgradeId", "השדרוג לא נמצא");
    const status = oneOf(fd, "status", STATUSES) ?? row.upgrade.status;
    if (status === "installed" && row.upgrade.status !== "installed") throw new FieldError("status", "לסימון כמותקן השתמשו בטופס ׳סימון כמותקן׳ (תאריך וק״מ)");
    await db
      .update(s.vehicleUpgrades)
      .set({
        status,
        phase: oneOf(fd, "phase", PHASES),
        priority: int(fd, "priority", { min: 1, max: 5 }) ?? 3,
        alternativeGroup: str(fd, "alternativeGroup", 40),
        reason: str(fd, "reason", 500),
        notes: str(fd, "notes", 2000),
        customName: row.upgrade.partId ? null : (str(fd, "customName", 120) ?? row.upgrade.customName),
        updatedAt: new Date(),
      })
      .where(eq(s.vehicleUpgrades.id, row.upgrade.id));
    return { ok: true, message: "נשמר" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function setCostLineAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const row = await getOwnedUpgrade(db, user.id, str(fd, "upgradeId") ?? "");
    if (!row) throw new FieldError("upgradeId", "השדרוג לא נמצא");
    const kind = oneOf(fd, "kind", COST_KINDS);
    if (!kind) throw new FieldError("kind", "סוג עלות לא תקין");
    const mode = str(fd, "mode") ?? "amount";
    await db.delete(s.upgradeCosts).where(and(eq(s.upgradeCosts.upgradeId, row.upgrade.id), eq(s.upgradeCosts.kind, kind)));
    if (mode === "unknown") return { ok: true, message: "סומן כלא ידוע" };
    if (mode === "na") {
      await db.insert(s.upgradeCosts).values({ upgradeId: row.upgrade.id, kind, notApplicable: true, source: "owner", recordedOn: todayIso(), note: str(fd, "note", 200) });
      return { ok: true, message: "סומן כלא רלוונטי (0 ₪)" };
    }
    const min = int(fd, "amountMin", { min: 0, max: 10_000_000 });
    const max = int(fd, "amountMax", { min: 0, max: 10_000_000 });
    if (min == null && max == null) throw new FieldError("amountMin", "הזינו סכום, או סמנו ׳לא ידוע׳ / ׳לא רלוונטי׳");
    const lo = Math.min(min ?? max!, max ?? min!);
    const hi = Math.max(min ?? max!, max ?? min!);
    await db.insert(s.upgradeCosts).values({
      upgradeId: row.upgrade.id,
      kind,
      amountMin: lo,
      amountMax: hi,
      includesVat: tri(fd, "includesVat"),
      source: oneOf(fd, "source", COST_SOURCES) ?? "owner",
      note: str(fd, "note", 200),
      recordedOn: date(fd, "recordedOn") ?? todayIso(),
    });
    return { ok: true, message: "העלות נשמרה" };
  });
  revalidatePath("/", "layout");
  return res;
}

/** Transfers the upgrade into the vehicle record: status installed + date + mileage. */
export async function markInstalledAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const row = await getOwnedUpgrade(db, user.id, str(fd, "upgradeId") ?? "");
    if (!row) throw new FieldError("upgradeId", "השדרוג לא נמצא");
    const installedOn = date(fd, "installedOn");
    if (!installedOn) throw new FieldError("installedOn", "נא להזין תאריך התקנה");
    if (installedOn > todayIso()) throw new FieldError("installedOn", "תאריך עתידי");
    const km = int(fd, "installedKm", { min: 0, max: 3_000_000 });
    await db
      .update(s.vehicleUpgrades)
      .set({ status: "installed", installedOn, installedKm: km, installedBy: str(fd, "installedBy", 120), updatedAt: new Date() })
      .where(eq(s.vehicleUpgrades.id, row.upgrade.id));
    // optionally update vehicle profile facts from the part
    if (bool(fd, "applyToProfile") && row.part) {
      const patch: Partial<typeof s.vehicles.$inferInsert> = {};
      if (row.part.liftCm) patch.liftCm = (row.vehicle.liftCm ?? 0) + row.part.liftCm;
      if (row.part.tyreSize && parseTyreSize(row.part.tyreSize)) patch.tyreSize = row.part.tyreSize;
      if (Object.keys(patch).length) await db.update(s.vehicles).set({ ...patch, updatedAt: new Date() }).where(eq(s.vehicles.id, row.vehicle.id));
    }
    if (km != null) await db.insert(s.mileageLogs).values({ vehicleId: row.vehicle.id, km, recordedOn: installedOn, note: "מתוך התקנת שדרוג" });
    const f = file(fd, "receipt");
    if (f) {
      const stored = await storeUpload(db, user.id, f, ["image", "pdf"]);
      await db.insert(s.attachments).values({ userId: user.id, vehicleId: row.vehicle.id, entityType: "upgrade", entityId: row.upgrade.id, fileId: stored.id, kind: "receipt", title: "קבלה" });
    }
    return { ok: true, message: "השדרוג הועבר לרכב כמותקן" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function deleteUpgradeAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const row = await getOwnedUpgrade(db, user.id, str(fd, "upgradeId") ?? "");
  if (row) await db.delete(s.vehicleUpgrades).where(eq(s.vehicleUpgrades.id, row.upgrade.id));
  revalidatePath("/", "layout");
  redirect("/upgrades");
}

export async function setBudgetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    await db.update(s.vehicles).set({ budgetIls: int(fd, "budgetIls", { min: 0, max: 10_000_000 }) }).where(eq(s.vehicles.id, v.id));
    return { ok: true, message: "התקציב עודכן" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function addQuoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const v = await requireOwnedVehicle(db, user.id, str(fd, "vehicleId"));
    const upgradeIdRaw = str(fd, "upgradeId");
    const upgrade = upgradeIdRaw ? await getOwnedUpgrade(db, user.id, upgradeIdRaw) : null;
    if (upgradeIdRaw && (!upgrade || upgrade.vehicle.id !== v.id)) throw new FieldError("upgradeId", "שדרוג לא תקין");
    const title = str(fd, "title", 160);
    if (!title) throw new FieldError("title", "נא להזין כותרת להצעה");
    const descs = fd.getAll("itemDesc").map((x) => String(x).trim().slice(0, 200));
    const amounts = fd.getAll("itemAmount").map((x) => String(x).trim());
    const kinds = fd.getAll("itemKind").map((x) => String(x));
    const items = descs
      .map((d, i) => {
        const raw = amounts[i] ?? "";
        const n = raw === "" ? null : Number(raw.replace(/[,₪\s]/g, ""));
        if (n != null && (!Number.isFinite(n) || n < 0)) throw new FieldError("itemAmount", `סכום לא תקין בשורה ${i + 1}`);
        const kind = (COST_KINDS as readonly string[]).includes(kinds[i]) ? (kinds[i] as (typeof COST_KINDS)[number]) : undefined;
        return { description: d, amount: n == null ? null : Math.round(n), kind };
      })
      .filter((it) => it.description || it.amount != null);
    if (!items.length) throw new FieldError("itemDesc", "הוסיפו לפחות שורה אחת");
    const workshopId = str(fd, "workshopId");
    const includesVat = tri(fd, "includesVat");
    const [q] = await db
      .insert(s.quotes)
      .values({
        userId: user.id,
        vehicleId: v.id,
        upgradeId: upgrade?.upgrade.id ?? null,
        workshopId: workshopId && isUuid(workshopId) ? workshopId : null,
        workshopName: str(fd, "workshopName", 120),
        title,
        quotedOn: date(fd, "quotedOn") ?? todayIso(),
        validUntil: date(fd, "validUntil"),
        items,
        includesVat,
        notes: str(fd, "notes", 2000),
      })
      .returning();
    const f = file(fd, "file");
    if (f) {
      const stored = await storeUpload(db, user.id, f, ["image", "pdf"]);
      await db.insert(s.attachments).values({ userId: user.id, vehicleId: v.id, entityType: "quote", entityId: q.id, fileId: stored.id, kind: "document", title: "הצעת מחיר" });
    }
    if (upgrade && bool(fd, "applyToCosts")) {
      for (const kind of COST_KINDS) {
        const lines = items.filter((i) => i.kind === kind);
        if (!lines.length) continue;
        const partial = lines.some((l) => l.amount == null);
        if (partial) continue; // never turn an unknown into a number
        const sum = lines.reduce((acc, l) => acc + (l.amount ?? 0), 0);
        await db.delete(s.upgradeCosts).where(and(eq(s.upgradeCosts.upgradeId, upgrade.upgrade.id), eq(s.upgradeCosts.kind, kind)));
        await db.insert(s.upgradeCosts).values({ upgradeId: upgrade.upgrade.id, kind, amountMin: sum, amountMax: sum, includesVat, source: "quote", note: `מהצעה: ${title}`, recordedOn: q.quotedOn });
      }
      if (upgrade.upgrade.status === "wishlist" || upgrade.upgrade.status === "planned")
        await db.update(s.vehicleUpgrades).set({ status: "quoted" }).where(eq(s.vehicleUpgrades.id, upgrade.upgrade.id));
    }
    return { ok: true, message: "ההצעה נשמרה" };
  });
  revalidatePath("/", "layout");
  return res;
}

export async function deleteQuoteAction(fd: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const q = await getOwnedQuote(db, user.id, str(fd, "id") ?? "");
  if (q) await db.delete(s.quotes).where(eq(s.quotes.id, q.id));
  revalidatePath("/", "layout");
}
