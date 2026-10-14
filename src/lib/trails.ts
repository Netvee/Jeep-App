/**
 * Trail difficulty rubric and vehicle ↔ trail matching.
 * Matching is advisory: it explains which stated requirements are met, unmet or unknown.
 * It never guarantees safe passage — conditions change and reports may be missing.
 */
import type { Region, TrailRequirements, ObstacleCategory } from "@/db/schema";

export const REGION_LABEL: Record<Region, string> = {
  north: "צפון",
  center: "מרכז",
  south: "דרום",
  judea_samaria: "יהודה ושומרון",
};

export const DIFFICULTY_RUBRIC: { level: number; label: string; description: string; vehicle: string; driver: string }[] = [
  {
    level: 1,
    label: "קל",
    description: "דרך עפר כבושה ורחבה, שיפועים מתונים, ללא מכשולים.",
    vehicle: "רכב 4×4 סטנדרטי; לרוב אין צורך בהילוך כוח.",
    driver: "מתאים לנהגים מתחילים.",
  },
  {
    level: 2,
    label: "קל-בינוני",
    description: "אבנים מפוזרות, עליות קצרות, קטעי חול קשה או מעבר מים רדודים.",
    vehicle: "צמיגי AT מומלצים; הילוך כוח שימושי.",
    driver: "ניסיון בסיסי בשטח.",
  },
  {
    level: 3,
    label: "בינוני",
    description: "מדרגות סלע נמוכות, חול רך, עליות/ירידות תלולות, תעלות.",
    vehicle: "הילוך כוח נדרש; מרווח גחון טוב; ציוד חילוץ בסיסי.",
    driver: "ניסיון בבחירת קו והורדת לחץ אוויר.",
  },
  {
    level: 4,
    label: "קשה",
    description: "מדרגות סלע גבוהות, סלעים גדולים, שיפוע צידי, סיכון לפגיעה בגחון.",
    vehicle: "הגבהה/צמיגים גדולים, מגני גחון, נעילות מומלצות; רכב מלווה.",
    driver: "נהגים מנוסים בלבד, עם מכוון (Spotter).",
  },
  {
    level: 5,
    label: "קיצוני",
    description: "מכשולים שבהם נזק לרכב סביר וחילוץ צפוי.",
    vehicle: "רכב מוכן במיוחד, נעילות, כננת, צמיגי MT.",
    driver: "מומחים בלבד, בקבוצה מאורגנת.",
  },
];

export const OBSTACLE_LABEL: Record<ObstacleCategory, string> = {
  rock_step: "מדרגת סלע",
  boulders: "סלעים גדולים",
  ruts: "תעלות עמוקות",
  sand: "חול",
  mud: "בוץ",
  steep: "שיפוע תלול",
  off_camber: "שיפוע צידי",
  water: "מעבר מים",
  locked_gate: "שער נעול",
  closure: "סגירה",
  damage: "קטע פגוע",
  other: "אחר",
};

export const ACCESS_LABEL: Record<string, string> = {
  nature_reserve: "שמורת טבע",
  firing_zone: "שטח אש",
  private_land: "קרקע פרטית",
  temporary: "הגבלה זמנית",
  seasonal: "הגבלה עונתית",
  other: "הגבלת גישה",
};

/** Authoritative bodies (homepages). Specific restrictions must still be checked there. */
export const AUTHORITY_LINKS = [
  { name: "רשות הטבע והגנים", url: "https://www.parks.org.il/", topic: "שמורות טבע וגנים לאומיים" },
  { name: "קק״ל", url: "https://www.kkl.org.il/", topic: "יערות ושטחים בניהול קק״ל" },
  { name: "צה״ל", url: "https://www.idf.il/", topic: "שטחי אש ואזורים צבאיים" },
];

export type VehicleCapability = {
  groundClearanceCm: number | null;
  hasLowRange: boolean | null;
  lockers: "none" | "rear" | "front_rear" | "center_only" | null;
  tyreType: "road" | "at" | "mt" | null;
  hasRecoveryGear: boolean;
  driverExperience: "beginner" | "intermediate" | "advanced" | null;
};

export type MatchCheck = { label: string; state: "met" | "unmet" | "unknown"; detail: string };
export type TrailMatch = {
  verdict: "suitable" | "caution" | "not_recommended" | "insufficient_info";
  checks: MatchCheck[];
  missing: string[];
};

const EXP_RANK = { beginner: 0, intermediate: 1, advanced: 2 } as const;
const TYRE_RANK = { road: 0, at: 1, mt: 2 } as const;
const TYRE_LABEL = { road: "כביש", at: "AT (כל-שטח)", mt: "MT (בוץ)" } as const;
export const EXPERIENCE_LABEL = { beginner: "מתחיל", intermediate: "בינוני", advanced: "מנוסה" } as const;

export function matchTrail(
  trail: { difficulty: number | null; requirements: TrailRequirements; driverExperience: "beginner" | "intermediate" | "advanced" | null },
  v: VehicleCapability,
): TrailMatch {
  const checks: MatchCheck[] = [];
  const missing: string[] = [];
  const r = trail.requirements ?? {};

  if (r.minGroundClearanceCm != null) {
    if (v.groundClearanceCm == null) {
      checks.push({ label: "מרווח גחון", state: "unknown", detail: `נדרש כ-${r.minGroundClearanceCm} ס״מ; מרווח הרכב לא הוזן` });
      missing.push("מרווח גחון של הרכב");
    } else {
      const ok = v.groundClearanceCm >= r.minGroundClearanceCm;
      checks.push({
        label: "מרווח גחון",
        state: ok ? "met" : "unmet",
        detail: `נדרש כ-${r.minGroundClearanceCm} ס״מ; ברכב ${v.groundClearanceCm} ס״מ (דיווח בעלים)`,
      });
    }
  }
  if (r.lowRange) {
    if (v.hasLowRange == null) {
      checks.push({ label: "הילוך כוח", state: "unknown", detail: "נדרש; לא ידוע אם קיים ברכב" });
      missing.push("האם יש הילוך כוח (Low)");
    } else checks.push({ label: "הילוך כוח", state: v.hasLowRange ? "met" : "unmet", detail: v.hasLowRange ? "קיים" : "נדרש ואינו קיים" });
  }
  if (r.tyres) {
    if (v.tyreType == null) {
      checks.push({ label: "צמיגים", state: "unknown", detail: `מומלץ ${TYRE_LABEL[r.tyres]}; סוג הצמיגים לא הוזן` });
      missing.push("סוג הצמיגים");
    } else {
      const ok = TYRE_RANK[v.tyreType] >= TYRE_RANK[r.tyres];
      checks.push({ label: "צמיגים", state: ok ? "met" : "unmet", detail: `מומלץ ${TYRE_LABEL[r.tyres]}; ברכב ${TYRE_LABEL[v.tyreType]}` });
    }
  }
  if (r.lockersRecommended) {
    if (v.lockers == null) {
      checks.push({ label: "נעילות דיפרנציאל", state: "unknown", detail: "מומלצות; לא ידוע אם קיימות" });
      missing.push("נעילות דיפרנציאל");
    } else {
      const ok = v.lockers === "rear" || v.lockers === "front_rear";
      checks.push({ label: "נעילות דיפרנציאל", state: ok ? "met" : "unmet", detail: ok ? "קיימת נעילה" : "מומלצות ואינן קיימות" });
    }
  }
  if (r.recoveryGearRecommended) {
    checks.push({
      label: "ציוד חילוץ",
      state: v.hasRecoveryGear ? "met" : "unknown",
      detail: v.hasRecoveryGear ? "רשום ציוד חילוץ מותקן" : "לא נרשם ציוד חילוץ בגראז׳ — ודאו שיש",
    });
  }
  if (trail.driverExperience) {
    if (v.driverExperience == null) {
      checks.push({ label: "ניסיון נהג", state: "unknown", detail: `מומלץ: ${EXPERIENCE_LABEL[trail.driverExperience]}; לא הוזן` });
      missing.push("רמת ניסיון הנהג");
    } else {
      const ok = EXP_RANK[v.driverExperience] >= EXP_RANK[trail.driverExperience];
      checks.push({
        label: "ניסיון נהג",
        state: ok ? "met" : "unmet",
        detail: `מומלץ: ${EXPERIENCE_LABEL[trail.driverExperience]}; הוזן: ${EXPERIENCE_LABEL[v.driverExperience]}`,
      });
    }
  }

  const unmet = checks.filter((c) => c.state === "unmet").length;
  const unknown = checks.filter((c) => c.state === "unknown").length;
  let verdict: TrailMatch["verdict"];
  if (trail.difficulty == null && checks.length === 0) verdict = "insufficient_info";
  else if (unmet >= 2 || (unmet >= 1 && (trail.difficulty ?? 0) >= 4)) verdict = "not_recommended";
  else if (unmet === 1) verdict = "caution";
  else if (unknown > 0) verdict = checks.length && unknown === checks.length ? "insufficient_info" : "caution";
  else verdict = "suitable";
  if (trail.difficulty == null) missing.push("דירוג קושי למסלול");
  return { verdict, checks, missing };
}

export const VERDICT_LABEL: Record<TrailMatch["verdict"], string> = {
  suitable: "הדרישות המוצהרות מתקיימות",
  caution: "נדרשת זהירות / חסר מידע",
  not_recommended: "לא מומלץ לרכב/לנהג כפי שהוזנו",
  insufficient_info: "אין מספיק מידע להתאמה",
};

/** Reports older than this are shown as stale. */
export const STALE_REPORT_DAYS = 45;

/** A new report of the same category within this radius/time of an existing one is a duplicate. */
export const DUPLICATE_RADIUS_KM = 0.15;
export const DUPLICATE_WINDOW_DAYS = 30;
