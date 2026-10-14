/**
 * Component taxonomy shared by the vehicle illustration, component panels, parts catalogue
 * and inspection suggestions. Keys are stable identifiers stored in the DB.
 */

export type SystemKey =
  | "suspension"
  | "tyres_wheels"
  | "brakes"
  | "drivetrain"
  | "engine_cooling"
  | "electrical"
  | "recovery"
  | "protection"
  | "storage";

export const SYSTEMS: { key: SystemKey; label: string; color: string }[] = [
  { key: "suspension", label: "מתלים", color: "#5b6b3a" },
  { key: "tyres_wheels", label: "צמיגים וחישוקים", color: "#3d4a52" },
  { key: "brakes", label: "בלמים", color: "#9a3b2e" },
  { key: "drivetrain", label: "הנעה", color: "#6b5a3a" },
  { key: "engine_cooling", label: "מנוע וקירור", color: "#7a4a1f" },
  { key: "electrical", label: "חשמל ותאורה", color: "#8a6d10" },
  { key: "recovery", label: "חילוץ", color: "#c25a1c" },
  { key: "protection", label: "מיגון", color: "#4a5560" },
  { key: "storage", label: "אחסון ונשיאה", color: "#5a6e66" },
];

export type ViewKey = "side" | "front" | "rear" | "under";

export const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "side", label: "צד" },
  { key: "front", label: "חזית" },
  { key: "rear", label: "אחור" },
  { key: "under", label: "גחון" },
];

export type ComponentDef = {
  key: string;
  system: SystemKey;
  name: string;
  purpose: string;
  /** spec keys (variant_specs.key) that describe the factory configuration */
  factorySpecKeys: string[];
  /** general inspection suggestions — NOT manufacturer intervals */
  inspections: string[];
  views: ViewKey[];
};

export const COMPONENTS: ComponentDef[] = [
  {
    key: "front_suspension",
    system: "suspension",
    name: "מתלה קדמי",
    purpose: "נושא את משקל חזית הרכב, שומר על מגע הגלגלים עם הקרקע וקובע את גובה החזית ואת מהלך הגלגל.",
    factorySpecKeys: ["suspension_front", "sway_bar"],
    inspections: [
      "בדיקה חזותית של קפיצים, תפסנים וגומיות (בושינגים) אחרי שטח סלעי",
      "חיפוש סימני שמן על הבולמים",
      "בדיקת חופש בהגה ובמפרקי ההיגוי",
    ],
    views: ["side", "front", "under"],
  },
  {
    key: "rear_suspension",
    system: "suspension",
    name: "מתלה אחורי",
    purpose: "נושא את משקל אחורי הרכב והמטען; משפיע על יציבות בנשיאת ציוד ובגרירה.",
    factorySpecKeys: ["suspension_rear"],
    inspections: ["בדיקת קפיצים, זרועות ותפסנים", "בדיקת דליפת שמן מבולמים", "בדיקת שקיעת מתלה תחת מטען קבוע"],
    views: ["side", "rear", "under"],
  },
  {
    key: "steering",
    system: "suspension",
    name: "היגוי",
    purpose: "מעביר את סיבוב ההגה לגלגלים. מוטות היגוי חשופים בשטח סלעי.",
    factorySpecKeys: ["steering"],
    inspections: ["בדיקת מוטות היגוי לכיפוף", "בדיקת דליפות מתיבת ההגה", "בדיקת כיוון פרונט לאחר פגיעה"],
    views: ["front", "under"],
  },
  {
    key: "tyres",
    system: "tyres_wheels",
    name: "צמיגים",
    purpose: "נקודת המגע היחידה עם הקרקע. סוג הצמיג ולחץ האוויר משפיעים יותר מכל שדרוג אחר על יכולת השטח.",
    factorySpecKeys: ["factory_tyre"],
    inspections: [
      "בדיקת חתכים ובליטות בדפנות לאחר שטח סלעי",
      "החזרת לחץ האוויר ללחץ כביש לפני עלייה לכביש",
      "בדיקת עומק סוליה ובלאי לא אחיד",
    ],
    views: ["side", "front", "rear", "under"],
  },
  {
    key: "wheels",
    system: "tyres_wheels",
    name: "חישוקים",
    purpose: "קוטר, רוחב והיסט (Offset) החישוק קובעים התאמת צמיג, מרווח מהמתלים ורוחב מסלול.",
    factorySpecKeys: ["factory_wheel"],
    inspections: ["בדיקת כיפופים בשפת החישוק", "בדיקת הידוק אומים לאחר החלפת גלגל"],
    views: ["side"],
  },
  {
    key: "spare",
    system: "tyres_wheels",
    name: "גלגל חלופי",
    purpose: "חייב להתאים למידת הצמיגים בפועל — שדרוג צמיגים מחייב גם גלגל חלופי תואם.",
    factorySpecKeys: [],
    inspections: ["בדיקת לחץ אוויר בגלגל החלופי", "וידוא שהגלגל החלופי בגודל הצמיגים הנוכחיים"],
    views: ["side", "rear"],
  },
  {
    key: "compressor",
    system: "tyres_wheels",
    name: "מדחס וציוד צמיגים",
    purpose: "מאפשר להוריד לחץ אוויר לשטח ולנפח חזרה לפני עלייה לכביש.",
    factorySpecKeys: [],
    inspections: ["בדיקת תקינות מדחס ומד לחץ לפני טיול", "בדיקת ערכת תיקון תקרים"],
    views: ["side"],
  },
  {
    key: "brakes",
    system: "brakes",
    name: "בלמים",
    purpose: "צמיגים גדולים וכבדים מגדילים את העומס על הבלמים.",
    factorySpecKeys: ["brakes"],
    inspections: ["שטיפת אבק ובוץ מהקליפרים לאחר שטח בוצי", "בדיקת עובי רפידות", "בדיקת צנרת בלמים לפגיעות"],
    views: ["side", "under"],
  },
  {
    key: "front_axle",
    system: "drivetrain",
    name: "סרן ודיפרנציאל קדמי",
    purpose: "מעביר כוח לגלגלים הקדמיים. נעילה מגבירה אחיזה במכשולים עם גלגל באוויר.",
    factorySpecKeys: ["front_axle", "lockers"],
    inspections: ["בדיקת מים בשמן דיפרנציאל לאחר חציית מים עמוקים", "בדיקת דליפות באטמים", "בדיקת פתח נשימה"],
    views: ["under", "front"],
  },
  {
    key: "rear_axle",
    system: "drivetrain",
    name: "סרן ודיפרנציאל אחורי",
    purpose: "מעביר כוח לגלגלים האחוריים. נקודה נמוכה החשופה לפגיעות.",
    factorySpecKeys: ["rear_axle", "lockers"],
    inspections: ["בדיקת מים בשמן לאחר חציית מים", "בדיקת דליפות באטמים", "בדיקת פגיעות במכסה הדיפרנציאל"],
    views: ["under", "rear"],
  },
  {
    key: "transfer_case",
    system: "drivetrain",
    name: "תיבת העברה",
    purpose: "מחלקת כוח בין הסרנים ומספקת הילוך כוח (Low) לנסיעה איטית ומבוקרת.",
    factorySpecKeys: ["transfer_case"],
    inspections: ["בדיקת מצב שמן לאחר חציית מים", "בדיקת דליפות"],
    views: ["under"],
  },
  {
    key: "driveshafts",
    system: "drivetrain",
    name: "גלי הנעה",
    purpose: "מחברים את תיבת ההעברה לסרנים. הגבהה משנה את זוויות העבודה שלהם.",
    factorySpecKeys: [],
    inspections: ["בדיקת מפרקים וחופש", "גירוז נקודות גירוז (אם קיימות)", "רעידות חדשות לאחר הגבהה"],
    views: ["under"],
  },
  {
    key: "transmission",
    system: "drivetrain",
    name: "תיבת הילוכים",
    purpose: "נהיגה איטית בחול ובעליות מחממת את שמן התיבה.",
    factorySpecKeys: ["transmission"],
    inspections: ["מעקב אחרי טמפרטורת שמן תיבה (אם יש תצוגה) בנהיגה בחול"],
    views: ["under"],
  },
  {
    key: "engine",
    system: "engine_cooling",
    name: "מנוע",
    purpose: "מקור הכוח. נהיגה בשטח מעמיסה בסל״ד נמוך ובמהירות אוויר נמוכה.",
    factorySpecKeys: ["engine"],
    inspections: ["בדיקת מפלס שמן לפני טיול", "בדיקת רצועות וצנרת"],
    views: ["side", "front", "under"],
  },
  {
    key: "cooling",
    system: "engine_cooling",
    name: "מערכת קירור",
    purpose: "רדיאטור ומאוורר. בוץ, זרעים ואבק סותמים את הרדיאטור ומעלים טמפרטורה.",
    factorySpecKeys: [],
    inspections: ["ניקוי רדיאטור ומצנן ביניים מבוץ וזרעים", "בדיקת מפלס נוזל קירור (במנוע קר בלבד)"],
    views: ["front"],
  },
  {
    key: "air_intake",
    system: "engine_cooling",
    name: "יניקת אוויר",
    purpose: "מסנן האוויר מגן על המנוע מאבק. שנורקל מגביה את נקודת היניקה.",
    factorySpecKeys: [],
    inspections: ["בדיקת/ניקוי מסנן אוויר לאחר נסיעה בתנאי אבק", "בדיקת אטימות צנרת היניקה"],
    views: ["side", "front"],
  },
  {
    key: "battery",
    system: "electrical",
    name: "מצבר ומערכת חשמל",
    purpose: "מזינה כננת, מדחס, מקרר ותאורה. צריכה גבוהה מחייבת תכנון (מצבר כפול, כבילה, נתיכים).",
    factorySpecKeys: [],
    inspections: ["בדיקת הידוק וניקיון הדקים", "בדיקת מתח מנוחה לפני טיול ארוך"],
    views: ["front"],
  },
  {
    key: "lighting",
    system: "electrical",
    name: "תאורה",
    purpose: "תאורה נוספת לנסיעת לילה בשטח. התקנה על הרכב עשויה להיות כפופה לתקנות.",
    factorySpecKeys: [],
    inspections: ["בדיקת תקינות כל הפנסים", "ניקוי עדשות מבוץ"],
    views: ["front", "side"],
  },
  {
    key: "front_bumper",
    system: "recovery",
    name: "פגוש קדמי וכננת",
    purpose: "פגוש מחוזק מאפשר התקנת כננת ונקודות חילוץ. מוסיף משקל על הסרן הקדמי.",
    factorySpecKeys: [],
    inspections: ["בדיקת כבל/חבל הכננת לשחיקה", "הפעלת כננת קצרה לבדיקה מדי חודש", "בדיקת הידוק ברגי הפגוש"],
    views: ["front", "side"],
  },
  {
    key: "recovery_points",
    system: "recovery",
    name: "נקודות חילוץ",
    purpose: "נקודות מדורגות המחוברות לשלדה. ווי קשירה להובלה אינם נקודות חילוץ.",
    factorySpecKeys: ["recovery_points"],
    inspections: ["בדיקת הידוק וסדקים בנקודות החילוץ"],
    views: ["front", "rear", "under"],
  },
  {
    key: "recovery_kit",
    system: "recovery",
    name: "ציוד חילוץ",
    purpose: "רצועה קינטית, שאקלים, לוחות חילוץ, את חפירה. יעיל רק עם הדרכה ותרגול.",
    factorySpecKeys: [],
    inspections: ["בדיקת רצועות לחתכים ולחשיפה לשמש", "ספירת ציוד לפני טיול"],
    views: ["rear"],
  },
  {
    key: "skid_plates",
    system: "protection",
    name: "מגני גחון",
    purpose: "מגינים על מכלול ההנעה, המיכל ותיבת ההעברה מפגיעות סלעים.",
    factorySpecKeys: ["skid_plates"],
    inspections: ["בדיקת הידוק ברגי המגנים", "בדיקת עיוותים הנוגעים בצנרת/כבלים", "ניקוי בוץ שנצבר מעל המגנים"],
    views: ["under", "side"],
  },
  {
    key: "rock_sliders",
    system: "protection",
    name: "מגני ספים",
    purpose: "מגינים על ספי הדלתות בשטח סלעי. מגני ספים אמיתיים מחוברים לשלדה, לא לפח.",
    factorySpecKeys: [],
    inspections: ["בדיקת הידוק לשלדה"],
    views: ["side", "under"],
  },
  {
    key: "roof_rack",
    system: "storage",
    name: "גגון",
    purpose: "מאפשר נשיאת ציוד; מעלה את מרכז הכובד — יש לעמוד בעומס הדינמי המותר של הגג.",
    factorySpecKeys: ["roof_load"],
    inspections: ["בדיקת הידוק לאחר דרכי כורכר", "וידוא שהמשקל על הגג בגבולות המותר"],
    views: ["side", "rear", "front"],
  },
  {
    key: "rear_storage",
    system: "storage",
    name: "תא מטען ואחסון",
    purpose: "קיבוע ציוד מונע תזוזה מסוכנת בבלימה ובשטח משופע.",
    factorySpecKeys: [],
    inspections: ["בדיקת קיבוע ציוד ונקודות עיגון לפני יציאה"],
    views: ["rear", "side"],
  },
];

export const COMPONENT_BY_KEY: Record<string, ComponentDef> = Object.fromEntries(COMPONENTS.map((c) => [c.key, c]));

export const SYSTEM_BY_KEY: Record<SystemKey, (typeof SYSTEMS)[number]> = Object.fromEntries(
  SYSTEMS.map((s) => [s.key, s]),
) as Record<SystemKey, (typeof SYSTEMS)[number]>;

/** Spec key labels for display */
export const SPEC_LABELS: Record<string, string> = {
  wheelbase_mm: "בסיס גלגלים",
  suspension_front: "מתלה קדמי",
  suspension_rear: "מתלה אחורי",
  transfer_case: "תיבת העברה",
  lockers: "נעילות דיפרנציאל",
  sway_bar: "מוט מייצב",
  front_axle: "סרן קדמי",
  rear_axle: "סרן אחורי",
  factory_tyre: "צמיג מקורי",
  factory_wheel: "חישוק מקורי",
  engine: "מנוע",
  transmission: "תיבת הילוכים",
  roof_load: "עומס גג מותר",
  recovery_points: "נקודות חילוץ",
  skid_plates: "מגני גחון מקוריים",
  brakes: "בלמים",
  steering: "היגוי",
};

/** Upgrade overlays the illustration knows how to draw. */
export type OverlayKey =
  | "lift"
  | "bigtyres"
  | "winch"
  | "bumper"
  | "roofrack"
  | "snorkel"
  | "sliders"
  | "skid"
  | "lights"
  | "compressor"
  | "locker"
  | "recovery"
  | "storage"
  | "cooling";
