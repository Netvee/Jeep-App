/**
 * Pre-/post-trip checklist templates. These are general preparation and inspection
 * suggestions — not manufacturer service requirements. Condition-specific items are only
 * added for the conditions the trip actually involved, and some depend on the vehicle.
 */

export type TripCondition = "dust" | "mud" | "water" | "sand" | "rocks" | "night" | "remote";

export const CONDITION_LABEL: Record<TripCondition, string> = {
  dust: "אבק",
  mud: "בוץ",
  water: "חציית מים",
  sand: "חול",
  rocks: "סלעים",
  night: "נסיעת לילה",
  remote: "אזור מרוחק / ללא קליטה",
};

type Item = { title: string; when?: TripCondition[]; requires?: "snorkel" | "lockers" | "winch" | "fridge" };

const PRE: Item[] = [
  { title: "בדיקת מפלסי שמן מנוע ונוזל קירור (מנוע קר)" },
  { title: "בדיקת לחץ אוויר בכל הצמיגים כולל החלופי" },
  { title: "בדיקה חזותית של צמיגים לחתכים" },
  { title: "מדחס, מד לחץ וערכת תיקון תקרים" },
  { title: "ציוד חילוץ: רצועה, שאקלים, נקודות חילוץ מדורגות" },
  { title: "מים לשתייה — כמות לכל משתתף ליום מלא" },
  { title: "ערכת עזרה ראשונה" },
  { title: "שיתוף תוכנית המסלול ושעת חזרה עם מי שלא נוסע" },
  { title: "בדיקת הגבלות גישה ושטחי אש לתאריך הנסיעה", when: undefined },
  { title: "תחזית מזג אוויר והתרעות שיטפונות" },
  { title: "לוחות חילוץ והורדת לחץ אוויר מתוכננת", when: ["sand"] },
  { title: "בדיקת פנסים ותאורת עזר", when: ["night"] },
  { title: "מפה/מסלול שמורים לשימוש לא מקוון", when: ["remote"] },
  { title: "תקשורת חלופית (ממסר/מכשיר קשר) ונקודות יציאה", when: ["remote"] },
  { title: "בדיקת אטימות מכסי נשמים ושנורקל", when: ["water"], requires: "snorkel" },
  { title: "תרגול הפעלת נעילות לפני הצורך", when: ["rocks"], requires: "lockers" },
  { title: "בדיקת כננת: חבל, וו ושלט", requires: "winch" },
];

const POST: Item[] = [
  { title: "החזרת לחץ האוויר ללחץ כביש לפני עלייה לכביש" },
  { title: "בדיקה חזותית של צמיגים, חישוקים ונקודות חילוץ" },
  { title: "בדיקת דליפות חדשות מתחת לרכב" },
  { title: "רישום קילומטראז׳ בסיום הנסיעה" },
  { title: "בדיקה/ניקוי מסנן אוויר", when: ["dust", "sand"] },
  { title: "ניקוי רדיאטור ומצנן מבוץ, זרעים וחול", when: ["mud", "dust", "sand"] },
  { title: "שטיפת גחון, מתלים ובלמים", when: ["mud", "sand"] },
  { title: "בדיקת בלמים (רעשים, תחושת דוושה) לאחר בוץ או מים", when: ["mud", "water"] },
  { title: "בדיקת מים בשמן דיפרנציאלים ותיבות במוסך לאחר חציית מים עמוקים", when: ["water"] },
  { title: "בדיקת מגני גחון, מוטות היגוי וזרועות לפגיעות", when: ["rocks"] },
  { title: "בדיקת הידוק ברגי גגון ומגנים", when: ["rocks", "dust"] },
  { title: "ייבוש וניקוי ציוד חילוץ לפני אחסון", when: ["mud", "water", "sand"] },
  { title: "פריסה וגלילה מחדש של חבל הכננת אם נעשה שימוש", requires: "winch" },
];

export function buildChecklist(
  phase: "pre" | "post",
  conditions: TripCondition[],
  equipment: { snorkel?: boolean; lockers?: boolean; winch?: boolean; fridge?: boolean } = {},
): string[] {
  const src = phase === "pre" ? PRE : POST;
  return src
    .filter((i) => !i.when || i.when.some((c) => conditions.includes(c)))
    .filter((i) => !i.requires || equipment[i.requires])
    .map((i) => i.title);
}
