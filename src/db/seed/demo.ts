/**
 * DEMO DATA — every row here is flagged isDemo = true and is rendered with a "הדגמה" badge.
 *
 * - Demo trails use SYNTHETIC geometry generated below. They do not follow any real road
 *   or track and must never be used for navigation. Names are deliberately generic.
 * - Demo parts/prices/fitments use the brand "פריט הדגמה" so they cannot be confused with
 *   real products.
 * - Demo workshops are fictional businesses.
 * Disable with SEED_DEMO_DATA=false.
 */
import { eq, sql, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema";
import type { AccessNote, FitmentStatus, Region, TrailRequirements } from "../schema";
import { lineLengthKm, elevationStats } from "@/lib/geo";

type Db = NodePgDatabase<typeof schema>;

const DEMO_BRAND = "פריט הדגמה";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Smooth synthetic polyline: NOT a real route. */
export function syntheticRoute(start: [number, number], bearingDeg: number, lengthKm: number, seed: number, baseElev: number, elevAmp: number) {
  const rand = rng(seed);
  const n = 90;
  const stepKm = lengthKm / n;
  const coords: number[][] = [];
  let [lng, lat] = start;
  let bearing = (bearingDeg * Math.PI) / 180;
  let turn = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const elev = baseElev + elevAmp * Math.sin(t * Math.PI * (1.3 + rand() * 0.2)) + (rand() - 0.5) * elevAmp * 0.08;
    coords.push([+lng.toFixed(6), +lat.toFixed(6), Math.round(elev)]);
    turn = turn * 0.85 + (rand() - 0.5) * 0.35;
    bearing += turn * 0.4;
    const dLat = (stepKm * Math.cos(bearing)) / 110.574;
    const dLng = (stepKm * Math.sin(bearing)) / (111.32 * Math.cos((lat * Math.PI) / 180));
    lat += dLat;
    lng += dLng;
  }
  return coords;
}

type DemoTrail = {
  slug: string;
  nameHe: string;
  region: Region;
  start: [number, number];
  bearing: number;
  lengthKm: number;
  seed: number;
  baseElev: number;
  elevAmp: number;
  difficulty: number;
  durationMin: number;
  surfaces: string[];
  seasonality: string;
  obstacles: string;
  requirements: TrailRequirements;
  equipment: string[];
  experience: "beginner" | "intermediate" | "advanced";
  access: AccessNote[];
  advisories?: string;
  reception: string;
  exits: string;
};

const DEMO_NOTE =
  "מסלול הדגמה עם קואורדינטות סינתטיות. הוא אינו מתאר דרך אמיתית, אין לנווט לפיו ואין להסיק ממנו דבר על זכויות גישה.";

const demoTrails: DemoTrail[] = [
  {
    slug: "demo-north-a",
    nameHe: "מסלול הדגמה א׳ · צפון (גולן)",
    region: "north",
    start: [35.76, 33.02],
    bearing: 20,
    lengthKm: 14,
    seed: 11,
    baseElev: 520,
    elevAmp: 120,
    difficulty: 2,
    durationMin: 110,
    surfaces: ["עפר", "אבני בזלת"],
    seasonality: "הדגמה: בחורף קטעים עלולים להיות בוציים",
    obstacles: "הדגמה: קטעי אבני בזלת מפוזרות, מעבר נחל רדוד",
    requirements: { minGroundClearanceCm: 20, tyres: "at", lowRange: false },
    equipment: ["מדחס", "ערכת תיקון תקרים"],
    experience: "beginner",
    access: [
      {
        type: "firing_zone",
        description: "הדגמה: דוגמה לאופן הצגת אזור אש. לפני יציאה למסלול אמיתי יש לבדוק זמני פתיחה מול גורם מוסמך.",
        authority: "צה״ל",
        sourceUrl: "https://www.idf.il/",
      },
    ],
    reception: "הדגמה: לא נאסף מידע אמיתי על קליטה",
    exits: "הדגמה: יציאה לכביש בקצוות בלבד",
  },
  {
    slug: "demo-north-b",
    nameHe: "מסלול הדגמה ב׳ · צפון (גליל)",
    region: "north",
    start: [35.36, 32.94],
    bearing: 110,
    lengthKm: 9,
    seed: 23,
    baseElev: 380,
    elevAmp: 210,
    difficulty: 3,
    durationMin: 120,
    surfaces: ["סלע", "עפר"],
    seasonality: "הדגמה: כל השנה, למעט אחרי גשם",
    obstacles: "הדגמה: מדרגות סלע בגובה בינוני, עלייה תלולה",
    requirements: { minGroundClearanceCm: 22, tyres: "at", lowRange: true },
    equipment: ["מדחס", "רצועת חילוץ", "נקודות חילוץ"],
    experience: "intermediate",
    access: [],
    reception: "הדגמה: לא נאסף מידע אמיתי על קליטה",
    exits: "הדגמה: יציאה אמצעית לדרך עפר",
  },
  {
    slug: "demo-center-c",
    nameHe: "מסלול הדגמה ג׳ · מרכז (שפלה)",
    region: "center",
    start: [34.94, 31.72],
    bearing: 70,
    lengthKm: 11,
    seed: 37,
    baseElev: 250,
    elevAmp: 90,
    difficulty: 1,
    durationMin: 70,
    surfaces: ["דרך עפר כבושה"],
    seasonality: "הדגמה: כל השנה",
    obstacles: "הדגמה: ללא מכשולים משמעותיים",
    requirements: { tyres: "road" },
    equipment: ["מים", "ערכת עזרה ראשונה"],
    experience: "beginner",
    access: [],
    reception: "הדגמה: לא נאסף מידע אמיתי על קליטה",
    exits: "הדגמה: מספר יציאות לכבישים",
  },
  {
    slug: "demo-south-d",
    nameHe: "מסלול הדגמה ד׳ · דרום (נגב)",
    region: "south",
    start: [34.86, 30.56],
    bearing: 160,
    lengthKm: 18,
    seed: 41,
    baseElev: 640,
    elevAmp: 160,
    difficulty: 3,
    durationMin: 180,
    surfaces: ["חול", "חצץ", "סלע"],
    seasonality: "הדגמה: מומלץ להימנע בקיץ בשעות החמות; סכנת שיטפונות בחורף",
    obstacles: "הדגמה: קטעי חול רך, ירידה תלולה",
    requirements: { minGroundClearanceCm: 22, tyres: "at", lowRange: true, recoveryGearRecommended: true },
    equipment: ["לוחות חילוץ", "מדחס", "מד לחץ", "מים נוספים"],
    experience: "intermediate",
    access: [
      {
        type: "nature_reserve",
        description: "הדגמה: דוגמה לאופן הצגת שמורת טבע. בשמורות אמיתיות הנסיעה מותרת רק בדרכים מסומנות — יש לבדוק מול רשות הטבע והגנים.",
        authority: "רשות הטבע והגנים",
        sourceUrl: "https://www.parks.org.il/",
      },
    ],
    advisories: "הדגמה: בדקו תחזית שיטפונות לפני יציאה",
    reception: "הדגמה: לא נאסף מידע אמיתי על קליטה",
    exits: "הדגמה: יציאה בקצוות בלבד",
  },
  {
    slug: "demo-south-e",
    nameHe: "מסלול הדגמה ה׳ · דרום (ערבה)",
    region: "south",
    start: [35.12, 30.12],
    bearing: 250,
    lengthKm: 12,
    seed: 53,
    baseElev: 180,
    elevAmp: 260,
    difficulty: 4,
    durationMin: 210,
    surfaces: ["סלע", "ואדי"],
    seasonality: "הדגמה: סכנת שיטפונות בחורף",
    obstacles: "הדגמה: מדרגות סלע גבוהות, מעבר צר בין סלעים",
    requirements: { minGroundClearanceCm: 25, tyres: "mt", lowRange: true, lockersRecommended: true, recoveryGearRecommended: true },
    equipment: ["כננת או רכב מלווה", "רצועה קינטית", "שאקלים", "מדחס"],
    experience: "advanced",
    access: [],
    reception: "הדגמה: לא נאסף מידע אמיתי על קליטה",
    exits: "הדגמה: אין יציאות ביניים",
  },
  {
    slug: "demo-js-f",
    nameHe: "מסלול הדגמה ו׳ · יהודה ושומרון (מדבר יהודה)",
    region: "judea_samaria",
    start: [35.3, 31.62],
    bearing: 90,
    lengthKm: 10,
    seed: 67,
    baseElev: 420,
    elevAmp: 380,
    difficulty: 4,
    durationMin: 160,
    surfaces: ["סלע", "חצץ"],
    seasonality: "הדגמה: חם מאוד בקיץ",
    obstacles: "הדגמה: ירידה תלולה ומשופעת הצידה",
    requirements: { minGroundClearanceCm: 23, tyres: "at", lowRange: true, recoveryGearRecommended: true },
    equipment: ["מדחס", "רצועת חילוץ", "מים נוספים"],
    experience: "advanced",
    access: [
      {
        type: "other",
        description: "הדגמה: דוגמה לאזור שבו הסדרי הגישה משתנים. יש לבדוק מול הגורמים המוסמכים לפני יציאה.",
      },
    ],
    reception: "הדגמה: לא נאסף מידע אמיתי על קליטה",
    exits: "הדגמה: יציאה אחת באמצע המסלול",
  },
];

type DemoPart = {
  key: string;
  category: schema.PartCategory;
  componentKey: string;
  nameHe: string;
  overlay?: string;
  liftCm?: number;
  tyreSize?: string;
  complexity: number;
  pro: boolean;
  benefits: string[];
  tradeoffs: string[];
  supporting: string[];
  conflicts?: string[];
  price: [number, number] | null;
  fit: Record<string, FitmentStatus>;
};

const demoParts: DemoPart[] = [
  {
    key: "lift",
    category: "suspension",
    componentKey: "front_suspension",
    nameHe: "ערכת הגבהה 2.5 אינץ׳ (פריט הדגמה)",
    overlay: "lift",
    liftCm: 6.4,
    complexity: 4,
    pro: true,
    benefits: ["מרווח לצמיגים גדולים יותר", "זווית גישה ונטישה טובות יותר"],
    tradeoffs: ["מרכז כובד גבוה יותר", "שינוי זוויות גלי הנעה"],
    supporting: ["כיוון פרונט", "בדיקת זוויות גלי הנעה"],
    price: [6500, 9500],
    fit: { "jl-4dr-rubicon-20t": "verified", "jl-4dr-sahara-20t": "owner_reported", "jl-2dr-sport-20t": "unconfirmed", "jimny-jb74-3dr-mt": "incompatible", "jimny-jb74-3dr-at": "incompatible" },
  },
  {
    key: "tyres",
    category: "tyres",
    componentKey: "tyres",
    nameHe: "סט צמיגי AT 285/70R17 (פריט הדגמה)",
    overlay: "bigtyres",
    tyreSize: "285/70R17",
    complexity: 1,
    pro: true,
    benefits: ["אחיזה בשטח", "עמידות לחתכים"],
    tradeoffs: ["רעש כביש", "משקל לא מתלה גבוה יותר"],
    supporting: ["גלגל חלופי תואם", "בדיקת מרווח (ייתכן צורך בהגבהה)"],
    price: [5200, 7000],
    fit: { "jl-4dr-rubicon-20t": "verified", "jl-4dr-sahara-20t": "unconfirmed", "hilux-an120-28d-dc": "owner_reported", "jimny-jb74-3dr-mt": "incompatible" },
  },
  {
    key: "winch",
    category: "winch",
    componentKey: "front_bumper",
    nameHe: "כננת 10,000 ליברות (פריט הדגמה)",
    overlay: "winch",
    complexity: 3,
    pro: true,
    benefits: ["חילוץ עצמי"],
    tradeoffs: ["משקל על הסרן הקדמי"],
    supporting: ["פגוש תואם כננת", "כבילה ונתיך"],
    price: [3800, 5200],
    fit: { "jl-4dr-rubicon-20t": "owner_reported", "hilux-an120-28d-dc": "unconfirmed", "prado-j150-28d-5dr": "unconfirmed" },
  },
  {
    key: "bumper",
    category: "recovery",
    componentKey: "front_bumper",
    nameHe: "פגוש קדמי פלדה תואם כננת (פריט הדגמה)",
    overlay: "bumper",
    complexity: 3,
    pro: true,
    benefits: ["נקודות חילוץ מדורגות", "בסיס לכננת"],
    tradeoffs: ["משקל רב", "השפעה אפשרית על חיישנים"],
    supporting: [],
    price: null,
    fit: { "jl-4dr-rubicon-20t": "verified" },
  },
  {
    key: "skid",
    category: "protection",
    componentKey: "skid_plates",
    nameHe: "סט מגני גחון אלומיניום (פריט הדגמה)",
    overlay: "skid",
    complexity: 2,
    pro: false,
    benefits: ["הגנה על מכלולים"],
    tradeoffs: ["משקל", "צבירת בוץ"],
    supporting: [],
    price: [2400, 3600],
    fit: { "hilux-an120-28d-dc": "verified", "hilux-an120-24d-dc": "verified", "prado-j150-28d-5dr": "owner_reported" },
  },
  {
    key: "roofrack",
    category: "storage",
    componentKey: "roof_rack",
    nameHe: "גגון פלטפורמה (פריט הדגמה)",
    overlay: "roofrack",
    complexity: 2,
    pro: false,
    benefits: ["נשיאת ציוד"],
    tradeoffs: ["מרכז כובד גבוה", "רעש רוח"],
    supporting: ["ערכת התקנה לגג"],
    price: [3000, 4500],
    fit: { "jl-4dr-rubicon-20t": "unconfirmed", "prado-j150-28d-5dr": "verified", "jimny-jb74-3dr-mt": "owner_reported" },
  },
  {
    key: "snorkel",
    category: "engine",
    componentKey: "air_intake",
    nameHe: "שנורקל (פריט הדגמה)",
    overlay: "snorkel",
    complexity: 3,
    pro: true,
    benefits: ["אוויר נקי יותר באבק"],
    tradeoffs: ["קידוח בכנף"],
    supporting: ["בדיקת נשמי סרנים"],
    price: [1200, 1900],
    fit: { "hilux-an120-28d-dc": "verified", "jimny-jb74-3dr-mt": "verified", "jimny-jb74-3dr-at": "verified" },
  },
  {
    key: "sliders",
    category: "protection",
    componentKey: "rock_sliders",
    nameHe: "מגני ספים לשלדה (פריט הדגמה)",
    overlay: "sliders",
    complexity: 3,
    pro: true,
    benefits: ["הגנה על ספים"],
    tradeoffs: ["משקל"],
    supporting: [],
    price: [2800, 3900],
    fit: { "jl-4dr-rubicon-20t": "verified", "jl-4dr-sahara-20t": "verified" },
  },
  {
    key: "locker",
    category: "drivetrain",
    componentKey: "rear_axle",
    nameHe: "נעילת דיפרנציאל אחורי (פריט הדגמה)",
    overlay: "locker",
    complexity: 5,
    pro: true,
    benefits: ["אחיזה במכשולים"],
    tradeoffs: ["התקנה מורכבת", "דורש מדחס"],
    supporting: ["מדחס"],
    conflicts: ["locker_factory"],
    price: [4500, 6500],
    fit: { "jl-4dr-rubicon-20t": "incompatible", "hilux-an120-24d-dc": "owner_reported", "prado-j150-28d-5dr": "unconfirmed" },
  },
  {
    key: "lights",
    category: "lighting",
    componentKey: "lighting",
    nameHe: "זוג פנסי עזר LED (פריט הדגמה)",
    overlay: "lights",
    complexity: 2,
    pro: false,
    benefits: ["תאורת שטח"],
    tradeoffs: ["מגבלות שימוש בכביש — לא אומת"],
    supporting: ["חיווט עם ממסר"],
    price: [700, 1400],
    fit: {},
  },
];

export async function seedDemo(db: Db) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.trails)
    .where(eq(schema.trails.isDemo, true));
  if (n > 0) return;

  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    // ---- demo supplier, parts, fitment, prices
    const [supplier] = await tx
      .insert(schema.suppliers)
      .values({ name: "ספק הדגמה", city: "—", verified: false, isDemo: true })
      .returning();

    const allSlugs = [...new Set(demoParts.flatMap((p) => Object.keys(p.fit)))];
    const variantRows = allSlugs.length
      ? await tx.select({ id: schema.variants.id, slug: schema.variants.slug }).from(schema.variants).where(inArray(schema.variants.slug, allSlugs))
      : [];
    const vid = Object.fromEntries(variantRows.map((r) => [r.slug, r.id]));

    for (const p of demoParts) {
      const [part] = await tx
        .insert(schema.parts)
        .values({
          category: p.category,
          componentKey: p.componentKey,
          brand: DEMO_BRAND,
          nameHe: p.nameHe,
          description: "פריט הדגמה להמחשת מנגנוני התאמה, מחירים ותכנון. אינו מוצר אמיתי.",
          aliases: ["הדגמה", "demo"],
          benefits: p.benefits,
          tradeoffs: p.tradeoffs,
          requiredSupporting: p.supporting,
          conflictsWith: p.conflicts ?? [],
          installComplexity: p.complexity,
          proInstallRecommended: p.pro,
          overlay: p.overlay ?? null,
          liftCm: p.liftCm ?? null,
          tyreSize: p.tyreSize ?? null,
          isDemo: true,
        })
        .returning();
      for (const [slug, status] of Object.entries(p.fit)) {
        if (!vid[slug]) continue;
        await tx.insert(schema.fitments).values({
          partId: part.id,
          variantId: vid[slug],
          status,
          evidence:
            status === "verified"
              ? "הדגמה: כך תוצג ראיית התאמה (לדוגמה: מסמך יצרן החלק המפרט את הגרסה והשנים)"
              : status === "owner_reported"
                ? "הדגמה: כך יוצג דיווח בעלים על התקנה מוצלחת"
                : status === "incompatible"
                  ? "הדגמה: כך יוצגה אי-התאמה מתועדת"
                  : null,
          verifiedAt: status === "verified" ? daysAgo(40) : null,
          isDemo: true,
        });
      }
      if (p.price) {
        await tx.insert(schema.prices).values({
          partId: part.id,
          supplierId: supplier.id,
          kind: "estimate",
          amountMin: p.price[0],
          amountMax: p.price[1],
          includesVat: true,
          availability: "הדגמה",
          observedAt: daysAgo(25),
          isDemo: true,
        });
      }
    }

    // ---- demo trails
    const trailIds: Record<string, string> = {};
    for (const t of demoTrails) {
      const geometry = syntheticRoute(t.start, t.bearing, t.lengthKm, t.seed, t.baseElev, t.elevAmp);
      const el = elevationStats(geometry);
      const [row] = await tx
        .insert(schema.trails)
        .values({
          slug: t.slug,
          nameHe: t.nameHe,
          nameEn: null,
          region: t.region,
          kind: "route",
          description: DEMO_NOTE,
          geometry,
          startPoint: [geometry[0][0], geometry[0][1]],
          endPoint: [geometry[geometry.length - 1][0], geometry[geometry.length - 1][1]],
          distanceKm: Math.round(lineLengthKm(geometry) * 10) / 10,
          durationMin: t.durationMin,
          elevationGainM: el?.gain ?? null,
          elevationMinM: el?.min ?? null,
          elevationMaxM: el?.max ?? null,
          surfaces: t.surfaces,
          difficulty: t.difficulty,
          seasonality: t.seasonality,
          obstaclesSummary: t.obstacles,
          requirements: t.requirements,
          suggestedEquipment: t.equipment,
          driverExperience: t.experience,
          receptionNotes: t.reception,
          exitPoints: t.exits,
          access: t.access,
          advisories: t.advisories ?? null,
          sourceName: "נתוני הדגמה סינתטיים",
          license: "נתוני הדגמה — ללא מקור",
          lastVerifiedAt: null,
          status: "published",
          isDemo: true,
        })
        .returning();
      trailIds[t.slug] = row.id;
    }
    // location pin (NOT a route)
    await tx.insert(schema.trails).values({
      slug: "demo-center-pin",
      nameHe: "נקודת הדגמה · מרכז (מיקום בלבד)",
      region: "center",
      kind: "pin",
      description: "נקודת עניין להדגמה בלבד. זו נקודה — לא מסלול ניווט.",
      startPoint: [35.0, 31.9],
      sourceName: "נתוני הדגמה סינתטיים",
      status: "published",
      isDemo: true,
    });

    // ---- demo reports along demo routes
    const geomOf = async (slug: string) => {
      const [r] = await tx.select({ g: schema.trails.geometry }).from(schema.trails).where(eq(schema.trails.slug, slug));
      return r.g ?? [];
    };
    const reportAt = async (
      slug: string,
      idx: number,
      category: schema.ObstacleCategory,
      description: string,
      observedDaysAgo: number,
      status: "approved" | "pending",
      verified = false,
    ) => {
      const g = await geomOf(slug);
      const c = g[Math.min(idx, g.length - 1)];
      await tx.insert(schema.trailReports).values({
        trailId: trailIds[slug],
        lat: c[1],
        lng: c[0],
        category,
        description,
        observedOn: daysAgo(observedDaysAgo),
        status,
        verified,
        verificationSource: verified ? "הדגמה: כך יוצג מקור רשמי לאימות" : null,
        isDemo: true,
      });
    };
    await reportAt("demo-north-b", 40, "rock_step", "הדגמה: מדרגת סלע בגובה כ-40 ס״מ, עדיף קו שמאלי", 6, "approved");
    await reportAt("demo-south-d", 30, "sand", "הדגמה: חול רך לאורך כ-200 מ׳, הורדת לחץ אוויר עזרה", 12, "approved");
    await reportAt("demo-south-d", 70, "water", "הדגמה: שלולית אחרי גשם — עומק לא ידוע", 140, "approved");
    await reportAt("demo-south-e", 50, "boulders", "הדגמה: סלעים גדולים במעבר הצר", 3, "pending");
    await reportAt("demo-js-f", 45, "closure", "הדגמה: סגירה זמנית מאומתת (דוגמה)", 2, "approved", true);
    await reportAt("demo-north-a", 20, "locked_gate", "הדגמה: שער נעול בכניסה המזרחית", 30, "approved");

    // ---- demo workshops (fictional)
    await tx.insert(schema.workshops).values([
      { name: "מוסך הדגמה · צפון", region: "north", city: "עיר הדגמה", specialties: ["מתלים", "הגבהות", "כיוון פרונט"], isDemo: true, notes: "עסק בדוי לצורכי הדגמה" },
      { name: "מוסך הדגמה · מרכז", region: "center", city: "עיר הדגמה", specialties: ["חשמל רכב", "כננות", "תאורה"], isDemo: true, sponsored: true, notes: "עסק בדוי; מסומן כ'ממומן' להמחשת סימון פרסום" },
      { name: "מוסך הדגמה · דרום", region: "south", city: "עיר הדגמה", specialties: ["סרנים ונעילות", "טיפולים"], isDemo: true, notes: "עסק בדוי לצורכי הדגמה" },
    ]);
  });
}
