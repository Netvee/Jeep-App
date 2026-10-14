/**
 * Compatibility resolution. Fitment is recorded per catalogue *variant*.
 *
 * Rules
 * 1. A vehicle without a catalogue variant (free-text make/model) is always "unconfirmed".
 * 2. Only a fitment row for the exact variant counts. Rows for sibling variants of the same
 *    model/generation are NEVER inherited — a matching model name is not evidence.
 * 3. A "verified" row must carry evidence and a verification date; otherwise it is
 *    downgraded to "unconfirmed" defensively.
 * 4. If the vehicle's year is outside the variant's year range, the result is downgraded to
 *    "unconfirmed" with a warning (the owner may have chosen the wrong variant).
 */
import type { FitmentStatus } from "@/db/schema";

export const FITMENT_LABEL: Record<FitmentStatus, string> = {
  verified: "התאמה מאומתת",
  owner_reported: "דיווח בעלים",
  unconfirmed: "לא אומת",
  incompatible: "לא מתאים",
};

export const FITMENT_EXPLAIN: Record<FitmentStatus, string> = {
  verified: "קיימת ראיה מתועדת (למשל מסמך יצרן החלק) להתאמה לגרסה המדויקת של הרכב.",
  owner_reported: "בעלי רכב מאותה גרסה דיווחו על התקנה. לא אומת מול מסמך יצרן.",
  unconfirmed: "אין ראיה להתאמה לגרסה זו. התאמה לשם הדגם בלבד אינה מספיקה — יש לבדוק מול הספק.",
  incompatible: "מתועד שהפריט אינו מתאים לגרסה זו.",
};

export type FitmentRow = {
  variantId: string;
  status: FitmentStatus;
  evidence: string | null;
  verifiedAt: string | null;
  sourceUrl?: string | null;
  isDemo?: boolean;
};

export type VehicleForFitment = {
  variantId: string | null;
  year: number | null;
  variantYearFrom?: number | null;
  variantYearTo?: number | null;
};

export type FitmentResult = {
  status: FitmentStatus;
  row: FitmentRow | null;
  warnings: string[];
};

export function resolveFitment(vehicle: VehicleForFitment, rows: FitmentRow[]): FitmentResult {
  const warnings: string[] = [];
  if (!vehicle.variantId) {
    return {
      status: "unconfirmed",
      row: null,
      warnings: ["הרכב לא שויך לגרסה בקטלוג — לא ניתן לבדוק התאמה. שייכו גרסה בפרופיל הרכב."],
    };
  }
  const row = rows.find((r) => r.variantId === vehicle.variantId) ?? null;
  if (!row) return { status: "unconfirmed", row: null, warnings };

  let status = row.status;
  if (status === "verified" && (!row.evidence || !row.verifiedAt)) {
    status = "unconfirmed";
    warnings.push("רשומת האימות חסרה ראיה או תאריך — מוצג כלא מאומת.");
  }
  if (vehicle.year != null && vehicle.variantYearFrom != null) {
    const outOfRange = vehicle.year < vehicle.variantYearFrom || (vehicle.variantYearTo != null && vehicle.year > vehicle.variantYearTo);
    if (outOfRange) {
      warnings.push("שנת הרכב מחוץ לטווח השנים של הגרסה שנבחרה — בדקו את שיוך הגרסה.");
      if (status === "verified" || status === "owner_reported") status = "unconfirmed";
    }
  }
  return { status, row, warnings };
}

export const FITMENT_ORDER: Record<FitmentStatus, number> = {
  verified: 0,
  owner_reported: 1,
  unconfirmed: 2,
  incompatible: 3,
};
