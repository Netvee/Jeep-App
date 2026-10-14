/**
 * Sample garage for throw-away demo accounts. Everything is marked as demo:
 * the vehicle has isDemo = true and the UI shows a persistent demo banner.
 */
import { eq, and, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as s from "@/db/schema";
import { todayIso, addMonths } from "@/lib/units";
import { buildChecklist } from "@/lib/checklists";
import { randomUUID } from "node:crypto";

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

export async function seedDemoGarage(db: Db, userId: string) {
  const [variant] = await db.select().from(s.variants).where(eq(s.variants.slug, "jl-4dr-rubicon-20t")).limit(1);
  const today = todayIso();
  const [vehicle] = await db
    .insert(s.vehicles)
    .values({
      userId,
      variantId: variant?.id ?? null,
      nickname: "הרנגלר (הדגמה)",
      make: "Jeep",
      model: "Wrangler",
      generation: "JL",
      year: 2021,
      trim: "Unlimited Rubicon",
      engine: variant?.engine ?? null,
      transmission: variant?.transmission ?? null,
      drivetrain: variant?.drivetrain ?? null,
      body: "suv-4door",
      wheelbaseMm: 3008,
      tyreSize: "LT285/70R17",
      wheelSpec: null,
      suspension: "מקורית",
      hasLowRange: true,
      lockers: "front_rear",
      tyreType: "at",
      groundClearanceCm: null,
      intendedUse: ["rocky", "desert_sand", "overlanding"],
      driverExperience: "intermediate",
      registrationPlate: "00-000-00",
      purchaseDate: d(900),
      ownershipNotes: "רכב הדגמה — כל הנתונים בדויים.",
      budgetIls: 25000,
      isDemo: true,
    })
    .returning();

  await db
    .update(s.users)
    .set({ prefs: { showDemoData: true, activeVehicleId: vehicle.id } })
    .where(eq(s.users.id, userId));

  await db.insert(s.mileageLogs).values([
    { vehicleId: vehicle.id, km: 38200, recordedOn: d(300), note: "טיפול שנתי" },
    { vehicleId: vehicle.id, km: 44750, recordedOn: d(120) },
    { vehicleId: vehicle.id, km: 48920, recordedOn: d(9), note: "אחרי טיול בנגב" },
  ]);

  const demoParts = await db.select().from(s.parts).where(eq(s.parts.isDemo, true));
  const realParts = await db.select().from(s.parts).where(and(eq(s.parts.isDemo, false), inArray(s.parts.brand, ["WARN", "כללי"])));
  const byOverlay = (o: string) => demoParts.find((p) => p.overlay === o);
  const warn = realParts.find((p) => p.brand === "WARN");
  const rope = realParts.find((p) => p.nameEn?.startsWith("Kinetic"));

  async function addUpgrade(
    v: Partial<typeof s.vehicleUpgrades.$inferInsert> & { componentKey: string; status: s.UpgradeStatus },
    costs: Omit<typeof s.upgradeCosts.$inferInsert, "upgradeId">[] = [],
  ) {
    const [u] = await db.insert(s.vehicleUpgrades).values({ vehicleId: vehicle.id, ...v }).returning();
    if (costs.length) await db.insert(s.upgradeCosts).values(costs.map((c) => ({ ...c, upgradeId: u.id })));
    return u;
  }

  const sliders = byOverlay("sliders");
  if (sliders)
    await addUpgrade(
      { partId: sliders.id, componentKey: sliders.componentKey, status: "installed", phase: "protection", installedOn: d(200), installedKm: 41000, installedBy: "מוסך הדגמה · צפון", priority: 2 },
      [
        { kind: "part", amountMin: 3400, amountMax: 3400, includesVat: true, source: "receipt", recordedOn: d(200) },
        { kind: "labour", amountMin: 600, amountMax: 600, includesVat: true, source: "receipt", recordedOn: d(200) },
        { kind: "supporting", notApplicable: true, source: "owner", recordedOn: d(200) },
        { kind: "shipping", notApplicable: true, source: "owner", recordedOn: d(200) },
      ],
    );
  if (rope)
    await addUpgrade(
      { partId: rope.id, componentKey: rope.componentKey, status: "installed", phase: "protection", installedOn: d(400), priority: 1 },
      [{ kind: "part", amountMin: 650, amountMax: 650, includesVat: true, source: "owner", recordedOn: d(400) }],
    );
  const lift = byOverlay("lift");
  if (lift)
    await addUpgrade(
      { partId: lift.id, componentKey: lift.componentKey, status: "quoted", phase: "capability", priority: 2, reason: "מרווח לצמיגים גדולים יותר בשטח סלעי" },
      [
        { kind: "part", amountMin: 6500, amountMax: 9500, includesVat: true, source: "estimate", recordedOn: d(25) },
        { kind: "labour", amountMin: 1800, amountMax: 1800, includesVat: true, source: "quote", recordedOn: d(14), note: "הצעת מחיר ממוסך הדגמה" },
        // supporting parts intentionally missing → shown as unknown
      ],
    );
  const tyres = byOverlay("bigtyres");
  if (tyres)
    await addUpgrade(
      { partId: tyres.id, componentKey: tyres.componentKey, status: "planned", phase: "capability", priority: 3, reason: "החלפה כשהצמיגים הנוכחיים יישחקו" },
      [{ kind: "part", amountMin: 5200, amountMax: 7000, includesVat: true, source: "estimate", recordedOn: d(25) }],
    );
  const winch = byOverlay("winch");
  if (winch) await addUpgrade({ partId: winch.id, componentKey: winch.componentKey, status: "wishlist", phase: "protection", priority: 3, alternativeGroup: "winch" });
  if (warn) await addUpgrade({ partId: warn.id, componentKey: warn.componentKey, status: "wishlist", phase: "protection", priority: 3, alternativeGroup: "winch" });
  await addUpgrade(
    { customName: "קורס נהיגת שטח וחילוץ", componentKey: "recovery_kit", status: "planned", phase: "essential", priority: 1, reason: "הדרכה משפרת בטיחות יותר מכל ציוד" },
    [
      { kind: "part", amountMin: 900, amountMax: 1500, includesVat: true, source: "estimate", recordedOn: d(10), note: "הערכת הדגמה" },
      { kind: "labour", notApplicable: true, source: "owner", recordedOn: d(10) },
      { kind: "supporting", notApplicable: true, source: "owner", recordedOn: d(10) },
      { kind: "shipping", notApplicable: true, source: "owner", recordedOn: d(10) },
    ],
  );

  const [oil] = await db
    .insert(s.maintenanceTasks)
    .values({
      vehicleId: vehicle.id,
      title: "החלפת שמן מנוע ומסנן",
      kind: "user",
      intervalKm: 10000,
      intervalMonths: 12,
      lastDoneOn: d(300),
      lastDoneKm: 38200,
      notes: "מרווח שהוגדר על ידי הבעלים (הדגמה) — יש לבדוק בספר השירות של הרכב",
    })
    .returning();
  await db.insert(s.maintenanceTasks).values([
    { vehicleId: vehicle.id, title: "בדיקת שמן דיפרנציאלים אחרי חציית מים", kind: "suggestion", dueOn: d(5), notes: "המלצת בדיקה כללית לאחר הטיול האחרון" },
    { vehicleId: vehicle.id, title: "טסט שנתי", kind: "user", intervalMonths: 12, lastDoneOn: addMonths(today, -11) },
    { vehicleId: vehicle.id, title: "בדיקת חבל/רצועת חילוץ", kind: "user", intervalMonths: 6, lastDoneOn: d(60) },
  ]);
  await db.insert(s.serviceRecords).values({
    vehicleId: vehicle.id,
    performedOn: d(300),
    km: 38200,
    workshopName: "מוסך הדגמה · צפון",
    title: "טיפול שנתי",
    workPerformed: "החלפת שמן ומסנן, בדיקת בלמים, בדיקת מתלים",
    partsUsed: "שמן מנוע, מסנן שמן",
    costIls: 1450,
    includesVat: true,
    completedTaskIds: [oil.id],
  });
  await db.insert(s.symptomLogs).values({
    vehicleId: vehicle.id,
    category: "noise",
    answers: { when: "bumps", type: "clunk", steering: "no", after_mod: "yes" },
    description: "נקישה קלה מהחזית במהמורות מאז הטיול האחרון (הדגמה)",
    urgency: "workshop",
    occurredOn: d(8),
    km: 48900,
  });

  const [trail] = await db.select().from(s.trails).where(eq(s.trails.slug, "demo-south-d")).limit(1);
  const conditions = ["sand", "dust", "remote"];
  await db.insert(s.trips).values({
    userId,
    vehicleId: vehicle.id,
    trailId: trail?.id ?? null,
    title: "טיול הדגמה לנגב",
    tripDate: d(-12),
    meetingPointLabel: "תחנת דלק (הדגמה)",
    meetingTime: "07:00",
    conditions,
    tasks: [
      ...buildChecklist("pre", conditions as never, { winch: false }).map((t) => ({ id: randomUUID(), title: t, phase: "pre" as const, done: false })),
      ...buildChecklist("post", conditions as never).map((t) => ({ id: randomUUID(), title: t, phase: "post" as const, done: false })),
    ],
  });
  return vehicle;
}
