/**
 * Dependency / conflict checks across a vehicle's installed + planned upgrades, and
 * recommendations based on intended use. Rules are deliberately conservative and explain
 * themselves; they flag things to check, they do not certify anything.
 */
import type { FitmentStatus, IntendedUse, UpgradeStatus } from "@/db/schema";
import { compareTyres } from "./units";

export type PlanItem = {
  id: string;
  name: string;
  status: UpgradeStatus;
  componentKey: string;
  overlay: string | null;
  requiredSupporting: string[];
  conflictsWith: string[];
  tyreSize: string | null;
  liftCm: number | null;
  fitment: FitmentStatus | null;
  alternativeGroup: string | null;
};

export type VehicleFacts = {
  tyreSize: string | null;
  liftCm: number | null;
  lockers: "none" | "rear" | "front_rear" | "center_only" | null;
  intendedUse: IntendedUse[];
  driverExperience: "beginner" | "intermediate" | "advanced" | null;
};

export type Check = { level: "conflict" | "warning" | "info"; itemId: string | null; text: string };

const ACTIVE: UpgradeStatus[] = ["wishlist", "planned", "quoted", "purchased", "installed"];

export function checkPlan(items: PlanItem[], v: VehicleFacts): Check[] {
  const out: Check[] = [];
  const active = items.filter((i) => ACTIVE.includes(i.status));
  const has = (overlay: string) => active.some((i) => i.overlay === overlay);
  const hasComponent = (key: string) => active.some((i) => i.componentKey === key);

  for (const i of active) {
    if (i.status === "installed") continue;
    if (i.fitment === "incompatible") out.push({ level: "conflict", itemId: i.id, text: `${i.name}: מתועד כלא מתאים לגרסת הרכב.` });
    if (i.fitment === "unconfirmed") out.push({ level: "info", itemId: i.id, text: `${i.name}: התאמה לא אומתה — בדקו מול הספק לפני רכישה.` });
    if (i.requiredSupporting.length) out.push({ level: "info", itemId: i.id, text: `${i.name} דורש/ממליץ גם: ${i.requiredSupporting.join("; ")}` });
    if (i.overlay === "winch" && !has("bumper") && !active.some((x) => x.componentKey === "front_bumper" && x.id !== i.id && x.overlay !== "winch"))
      out.push({ level: "warning", itemId: i.id, text: `${i.name}: אין בתוכנית פגוש או פלטת התקנה תואמי כננת.` });
    if (i.overlay === "locker") {
      if (i.conflictsWith.includes("locker_factory") && (v.lockers === "front_rear" || v.lockers === "rear"))
        out.push({ level: "conflict", itemId: i.id, text: `${i.name}: לרכב כבר רשומה נעילה מקורית.` });
      if (i.requiredSupporting.some((r) => r.includes("מדחס")) && !has("compressor") && !hasComponent("compressor"))
        out.push({ level: "warning", itemId: i.id, text: `${i.name}: דורש מדחס — לא נמצא בתוכנית או ברכב.` });
    }
    if (i.tyreSize && v.tyreSize) {
      const cmp = compareTyres(v.tyreSize, i.tyreSize);
      const liftPlanned = active.some((x) => x.liftCm && x.liftCm > 0) || (v.liftCm ?? 0) > 0;
      if (cmp && cmp.diameterDiffPct > 3 && !liftPlanned)
        out.push({
          level: "warning",
          itemId: i.id,
          text: `${i.name}: גדול בכ-${cmp.diameterDiffPct.toFixed(1)}% בקוטר הנומינלי מהצמיגים הנוכחיים, ואין הגבהה רשומה. בדקו מרווח, מד-מהירות ובלמים.`,
        });
      if (cmp && cmp.diameterDiffPct > 3)
        out.push({ level: "info", itemId: i.id, text: `במהירות מוצגת של 100 קמ״ש, המהירות בפועל תהיה כ-${cmp.actualSpeedAtShown100.toFixed(0)} קמ״ש (חישוב נומינלי).` });
    }
  }
  const groups = new Map<string, PlanItem[]>();
  for (const i of active) if (i.alternativeGroup) groups.set(i.alternativeGroup, [...(groups.get(i.alternativeGroup) ?? []), i]);
  for (const [g, list] of groups) {
    const committed = list.filter((x) => x.status === "purchased" || x.status === "installed");
    if (committed.length > 1) out.push({ level: "warning", itemId: null, text: `בקבוצת החלופות ״${g}״ נרכשו/הותקנו ${committed.length} פריטים.` });
  }
  return out;
}

export type Recommendation = { title: string; why: string; kind: "maintenance" | "training" | "upgrade"; href: string };

export function recommend(items: PlanItem[], v: VehicleFacts, overdueCount: number): Recommendation[] {
  const recs: Recommendation[] = [];
  const active = items.filter((i) => ACTIVE.includes(i.status));
  const covers = (keys: string[]) => active.some((i) => keys.includes(i.componentKey));
  const offroad = v.intendedUse.some((u) => u !== "daily" && u !== "towing");

  if (overdueCount > 0)
    recs.push({ kind: "maintenance", title: "קודם להשלים טיפולים באיחור", why: `יש ${overdueCount} תזכורות באיחור. רכב תקין חשוב יותר מכל שדרוג.`, href: "/maintenance" });
  if (offroad && (v.driverExperience === "beginner" || v.driverExperience == null))
    recs.push({
      kind: "training",
      title: "הדרכת נהיגת שטח וחילוץ",
      why: "לנהג מתחיל (או כשהניסיון לא צוין), הדרכה מעשית משפרת בטיחות ויכולת יותר מרוב השדרוגים — ובעלות נמוכה יותר.",
      href: "/upgrades/new?name=הדרכת נהיגת שטח&component=recovery_kit&phase=essential",
    });
  if (offroad && !covers(["recovery_kit", "recovery_points"]))
    recs.push({ kind: "upgrade", title: "ציוד חילוץ בסיסי ונקודות חילוץ מדורגות", why: "לכל יציאה לשטח. ווי קשירה מהמפעל אינם בהכרח נקודות חילוץ.", href: "/upgrades/catalog?component=recovery_kit" });
  if (v.intendedUse.includes("desert_sand") && !covers(["compressor"]))
    recs.push({ kind: "upgrade", title: "מדחס ומד לחץ אוויר", why: "בחול, הורדת לחץ אוויר היא השינוי האפקטיבי ביותר — וצריך לנפח חזרה לפני הכביש.", href: "/upgrades/catalog?component=compressor" });
  if (v.intendedUse.includes("rocky") && !covers(["skid_plates", "rock_sliders"]))
    recs.push({ kind: "upgrade", title: "מיגון גחון וספים", why: "בשטח סלעי פגיעות בגחון ובספים נפוצות; מיגון זול מתיקון.", href: "/upgrades/catalog?component=skid_plates" });
  if (v.intendedUse.includes("overlanding") && !covers(["roof_rack", "rear_storage"]))
    recs.push({ kind: "upgrade", title: "אחסון וקיבוע ציוד", why: "ציוד לא מקובע מסוכן בבלימה ובשיפוע. שימו לב לעומס הגג המותר.", href: "/upgrades/catalog?component=rear_storage" });
  return recs;
}
