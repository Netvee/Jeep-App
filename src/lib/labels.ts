import type { UpgradePhase, UpgradeStatus, PartCategory, BodyStyle, IntendedUse } from "@/db/schema";

export const UPGRADE_STATUS_LABEL: Record<UpgradeStatus, string> = {
  wishlist: "רשימת משאלות",
  planned: "מתוכנן",
  quoted: "התקבלה הצעה",
  purchased: "נרכש",
  installed: "מותקן",
  removed: "הוסר",
};

export const PHASE_LABEL: Record<UpgradePhase, string> = {
  essential: "תחזוקה חיונית",
  protection: "מיגון וחילוץ",
  capability: "יכולת שטח",
  comfort: "נוחות וטיולים",
};

export const PHASE_HINT: Record<UpgradePhase, string> = {
  essential: "תקינות הרכב קודמת לכל שדרוג",
  protection: "הגנה על הרכב ויכולת לחלץ את עצמכם",
  capability: "צמיגים, מתלים, נעילות",
  comfort: "אחסון, קמפינג, תאורה",
};

export const CATEGORY_LABEL: Record<PartCategory, string> = {
  suspension: "מתלים והגבהה",
  tyres: "צמיגים",
  wheels: "חישוקים",
  protection: "מיגון גחון וספים",
  recovery: "נקודות וציוד חילוץ",
  winch: "כננות",
  drivetrain: "הנעה ודיפרנציאלים",
  compressor: "מדחסים וציוד צמיגים",
  lighting: "תאורה",
  electrical: "חשמל",
  storage: "גגונים ואחסון",
  camping: "קמפינג",
  cooling: "קירור",
  engine: "מנוע ויניקה",
  brakes: "בלמים",
};

export const BODY_LABEL: Record<BodyStyle, string> = {
  "suv-2door": "שטח 2/3 דלתות",
  "suv-4door": "שטח 4/5 דלתות",
  "pickup-double": "טנדר קבינה כפולה",
  "pickup-single": "טנדר קבינה יחידה",
  "pickup-extended": "טנדר קבינה וחצי",
};

export const USE_LABEL: Record<IntendedUse, string> = {
  daily: "נסיעה יומיומית",
  light_trails: "דרכי עפר קלות",
  desert_sand: "מדבר וחול",
  rocky: "שטח סלעי",
  overlanding: "טיולים ארוכים / לינה",
  towing: "גרירה",
  mud: "בוץ",
};

export const LOCKERS_LABEL = {
  none: "אין",
  rear: "אחורית",
  front_rear: "קדמית ואחורית",
  center_only: "נעילת דיפרנציאל מרכזי בלבד",
} as const;

export const TYRE_TYPE_LABEL = { road: "כביש (HT)", at: "כל-שטח (AT)", mt: "בוץ (MT)" } as const;

export const PROVENANCE_LABEL = {
  manufacturer_document: "מאומת מול מסמך יצרן",
  importer: "פרסום יבואן",
  editorial: "עריכה — טרם אומת",
  owner_reported: "דיווח בעלים",
} as const;

export const COVERAGE_LABEL = {
  deep: "כיסוי מורחב",
  basic: "כיסוי בסיסי",
  listed: "רישום בלבד",
} as const;

export const COVERAGE_HINT = {
  deep: "גרסאות, מפרט, רכיבים ונתוני התאמה",
  basic: "גרסאות ומפרט בסיסי",
  listed: "הדור קיים בקטלוג; גרסאות ומפרט טרם הוזנו",
} as const;
