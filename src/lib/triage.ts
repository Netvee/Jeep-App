/**
 * Rule-based symptom triage. This is NOT a diagnosis engine:
 * it structures observations, flags symptoms that warrant stopping safely,
 * and lists *possible* causes for discussion with a qualified mechanic.
 * Uploaded photos/recordings are stored for the mechanic; they are never analysed here.
 */

export type Urgency = "observe" | "workshop" | "stop";

export type Question = { id: string; label: string; options: { value: string; label: string }[] };

export type Category = {
  key: string;
  label: string;
  hint: string;
  questions: Question[];
};

const yesNo = [
  { value: "yes", label: "כן" },
  { value: "no", label: "לא" },
  { value: "unknown", label: "לא בטוח" },
];

export const TRIAGE_CATEGORIES: Category[] = [
  {
    key: "warning_light",
    label: "נורת אזהרה",
    hint: "נורה שנדלקה בלוח המחוונים",
    questions: [
      {
        id: "light",
        label: "איזו נורה?",
        options: [
          { value: "oil_pressure", label: "לחץ שמן (פך שמן)" },
          { value: "temperature", label: "טמפרטורת מנוע" },
          { value: "brake", label: "בלמים" },
          { value: "battery", label: "מצבר/טעינה" },
          { value: "check_engine", label: "מנוע (Check Engine)" },
          { value: "abs", label: "ABS" },
          { value: "airbag", label: "כרית אוויר" },
          { value: "four_wd", label: "הנעה 4×4" },
          { value: "tpms", label: "לחץ אוויר בצמיגים" },
          { value: "other", label: "אחרת / לא מזהה" },
        ],
      },
      {
        id: "color",
        label: "צבע הנורה",
        options: [
          { value: "red", label: "אדום" },
          { value: "amber", label: "כתום/צהוב" },
          { value: "other", label: "ירוק/כחול" },
          { value: "unknown", label: "לא בטוח" },
        ],
      },
      { id: "flashing", label: "האם הנורה מהבהבת?", options: yesNo },
      {
        id: "drive",
        label: "איך הרכב מתנהג?",
        options: [
          { value: "normal", label: "כרגיל" },
          { value: "reduced", label: "ירידה בכוח" },
          { value: "abnormal", label: "רעשים/התנהגות חריגה" },
          { value: "unknown", label: "לא בטוח" },
        ],
      },
    ],
  },
  {
    key: "noise",
    label: "רעש או רעידה",
    hint: "חריקה, נקישה, יללה, רעידות",
    questions: [
      {
        id: "when",
        label: "מתי זה קורה?",
        options: [
          { value: "braking", label: "בבלימה" },
          { value: "turning", label: "בפנייה" },
          { value: "accelerating", label: "בהאצה" },
          { value: "speed", label: "במהירות מסוימת" },
          { value: "bumps", label: "במהמורות" },
          { value: "idle", label: "בעמידה" },
        ],
      },
      {
        id: "type",
        label: "איך זה נשמע/מרגיש?",
        options: [
          { value: "grinding", label: "שחיקה/גירוד מתכתי" },
          { value: "clunk", label: "נקישה/מכה" },
          { value: "whine", label: "יללה/זמזום" },
          { value: "squeal", label: "צפצוף" },
          { value: "vibration", label: "רעידה" },
          { value: "shimmy", label: "רעד חזק בהגה" },
        ],
      },
      { id: "steering", label: "האם ההגה מושפע (רעד, משיכה, חופש)?", options: yesNo },
      { id: "after_mod", label: "האם התחיל אחרי שדרוג או שטח?", options: yesNo },
    ],
  },
  {
    key: "leak_smell",
    label: "נזילה, ריח או עשן",
    hint: "טיפות מתחת לרכב, ריח חריג, עשן",
    questions: [
      {
        id: "type",
        label: "מה מזהים?",
        options: [
          { value: "fuel", label: "ריח דלק" },
          { value: "smoke", label: "עשן מתא המנוע" },
          { value: "burning", label: "ריח שרוף" },
          { value: "sweet", label: "ריח מתקתק / נוזל צבעוני (נוזל קירור)" },
          { value: "oil", label: "טפטוף שמן" },
          { value: "brake_fluid", label: "נוזל ליד גלגל (חשד לנוזל בלמים)" },
          { value: "water", label: "מים שקופים (ייתכן עיבוי מזגן)" },
        ],
      },
      {
        id: "where",
        label: "איפה?",
        options: [
          { value: "engine", label: "מתחת למנוע" },
          { value: "axle", label: "ליד סרן/דיפרנציאל" },
          { value: "wheel", label: "ליד גלגל" },
          { value: "cabin", label: "בתוך התא" },
          { value: "unknown", label: "לא בטוח" },
        ],
      },
      {
        id: "amount",
        label: "כמות",
        options: [
          { value: "drops", label: "טיפות בודדות" },
          { value: "puddle", label: "שלולית" },
          { value: "unknown", label: "לא ידוע" },
        ],
      },
    ],
  },
  {
    key: "starting",
    label: "בעיית התנעה",
    hint: "לא מתניע, מתניע ונכבה",
    questions: [
      {
        id: "symptom",
        label: "מה קורה כשמנסים להתניע?",
        options: [
          { value: "nothing", label: "כלום" },
          { value: "click", label: "נקישה" },
          { value: "slow", label: "סיבוב איטי" },
          { value: "cranks", label: "מסתובב ולא מתניע" },
          { value: "dies", label: "מתניע ונכבה" },
        ],
      },
      { id: "dim", label: "האם האורות חלשים?", options: yesNo },
      { id: "water", label: "האם זה קרה אחרי חציית מים?", options: yesNo },
    ],
  },
  {
    key: "overheating",
    label: "התחממות",
    hint: "מחוג טמפרטורה גבוה או נורה",
    questions: [
      {
        id: "gauge",
        label: "מה מציג המחוג?",
        options: [
          { value: "red", label: "באדום / נורת אזהרה" },
          { value: "high", label: "גבוה מהרגיל" },
          { value: "fluctuating", label: "קופץ" },
        ],
      },
      { id: "steam", label: "האם יוצא אדים מתא המנוע?", options: yesNo },
      {
        id: "context",
        label: "באילו תנאים?",
        options: [
          { value: "sand", label: "נסיעה איטית בחול" },
          { value: "climb", label: "עלייה ארוכה" },
          { value: "towing", label: "גרירה/עומס" },
          { value: "mud", label: "אחרי בוץ/צמחייה" },
          { value: "normal", label: "נסיעה רגילה" },
        ],
      },
    ],
  },
  {
    key: "behaviour",
    label: "התנהגות חריגה",
    hint: "משיכה לצד, בלימה חלשה, 4×4 לא נכנס",
    questions: [
      {
        id: "symptom",
        label: "מה חריג?",
        options: [
          { value: "brakes", label: "בלימה חלשה / דוושה רכה" },
          { value: "pull", label: "משיכה לצד" },
          { value: "power", label: "איבוד כוח" },
          { value: "fourwd", label: "4×4 / הילוך כוח לא נכנס" },
          { value: "gears", label: "החלפת הילוכים חריגה" },
        ],
      },
      { id: "after_mod", label: "האם התחיל אחרי שדרוג, החלפת צמיגים או שטח?", options: yesNo },
    ],
  },
];

export type TriageResult = {
  urgency: Urgency;
  headline: string;
  possibleCauses: string[];
  safeChecks: string[];
  nextSteps: string[];
};

const STOP_STEPS = [
  "עצרו במקום בטוח ככל האפשר, הדליקו אורות חירום וכבו את המנוע.",
  "אל תמשיכו בנסיעה עד שגורם מקצועי יבדוק — הזמינו גרר/חילוץ במידת הצורך.",
  "בסכנה מיידית (אש, עשן סמיך) — התרחקו מהרכב והתקשרו למוקד חירום.",
];

export function triage(categoryKey: string, a: Record<string, string>): TriageResult {
  const r: TriageResult = { urgency: "observe", headline: "", possibleCauses: [], safeChecks: [], nextSteps: [] };
  const stop = (why: string) => {
    r.urgency = "stop";
    r.headline = why;
  };
  const workshop = (why: string) => {
    if (r.urgency !== "stop") {
      r.urgency = "workshop";
      r.headline = why;
    }
  };

  switch (categoryKey) {
    case "warning_light": {
      if (a.light === "oil_pressure") {
        stop("נורת לחץ שמן — המשך נסיעה עלול לגרום נזק חמור למנוע.");
        r.possibleCauses.push("מפלס שמן נמוך", "תקלה במשאבת שמן או בחיישן");
        r.safeChecks.push("לאחר כיבוי והמתנה: בדיקת מפלס שמן בדיפסטיק על קרקע ישרה");
      } else if (a.light === "temperature") {
        stop("נורת טמפרטורה — עצירה מונעת נזק למנוע.");
        r.possibleCauses.push("מחסור בנוזל קירור", "רדיאטור סתום (בוץ/זרעים)", "תקלה במאוורר, משאבה או תרמוסטט");
        r.safeChecks.push("אין לפתוח את מכסה הרדיאטור כשהמנוע חם", "בדיקה חזותית לנזילות מתחת לרכב");
      } else if (a.light === "brake") {
        stop("נורת בלמים אדומה — עלולה להעיד על בעיה במערכת הבלימה.");
        r.possibleCauses.push("בלם חניה משוך", "מפלס נוזל בלמים נמוך", "תקלה במערכת");
        r.safeChecks.push("וידוא שבלם החניה משוחרר", "בדיקה חזותית של מפלס נוזל הבלמים במיכל");
      } else if (a.light === "check_engine" && a.flashing === "yes") {
        stop("נורת מנוע מהבהבת — לרוב מעידה על תקלה פעילה שעלולה לגרום נזק.");
        r.possibleCauses.push("החטאות הצתה", "תקלה בהזרקה");
      } else if (a.color === "red") {
        stop("נורה אדומה — מומלץ לעצור ולבדוק בספר הרכב את משמעותה.");
      } else if (a.light === "battery") {
        workshop("נורת טעינה — ייתכן שהמצבר אינו נטען; הרכב עלול להיכבות.");
        r.possibleCauses.push("רצועה", "אלטרנטור", "הדקי מצבר רופפים");
        r.safeChecks.push("בדיקה חזותית של הדקי המצבר");
      } else if (a.light === "tpms") {
        r.headline = "נורת לחץ אוויר — בדקו את לחץ האוויר בכל הצמיגים.";
        r.safeChecks.push("מדידת לחץ בכל הצמיגים כולל חלופי", "חיפוש מסמר/חתך");
        r.possibleCauses.push("לחץ נמוך לאחר נסיעת שטח", "תקר איטי", "חיישן לאחר החלפת חישוקים");
      } else if (a.light === "airbag" || a.light === "abs") {
        workshop("נורת מערכת בטיחות — המערכת עלולה לא לפעול; יש לבדוק בהקדם.");
        r.possibleCauses.push("חיישן או חיבור שנפגעו (נפוץ אחרי בוץ/מים או שינויים בפגוש)");
      } else {
        workshop("נורת אזהרה כתומה — מומלץ לבדוק במוסך בהקדם (קריאת קודי תקלה).");
      }
      if (a.drive === "abnormal" && r.urgency !== "stop") stop("נורת אזהרה עם התנהגות חריגה — עצרו במקום בטוח.");
      break;
    }
    case "noise": {
      if (a.when === "braking" && a.type === "grinding") {
        stop("שחיקה מתכתית בבלימה — ייתכן שהרפידות שחוקות עד המתכת.");
        r.possibleCauses.push("רפידות שחוקות", "אבן תקועה בין הדיסק למגן");
      } else if (a.type === "shimmy" || (a.steering === "yes" && a.when === "speed")) {
        stop("רעד חזק בהגה במהירות — האטו בהדרגה ועצרו. אל תבלמו בחוזקה.");
        r.possibleCauses.push("חופש ברכיבי היגוי/מתלה (ברכבי סרן קשיח מוכר כ'Death Wobble')", "בולם היגוי", "איזון גלגלים");
      } else if (a.steering === "yes") {
        workshop("רעש המשפיע על ההיגוי — יש לבדוק לפני נסיעת שטח נוספת.");
      } else if (a.when === "turning" && a.type === "clunk") {
        workshop("נקישה בפנייה — ייתכן מפרק הנעה (CV/מצלב).");
        r.possibleCauses.push("מפרק הנעה", "נעילת דיפרנציאל שלא השתחררה");
      } else if (a.type === "whine") {
        workshop("יללה — לעיתים קשורה לדיפרנציאל, תיבה או מסבים.");
        r.possibleCauses.push("מפלס/מצב שמן דיפרנציאל", "מסב גלגל");
        r.safeChecks.push("לאחר חציית מים: בדיקת שמן הדיפרנציאל במוסך (חשש למים)");
      } else if (a.type === "vibration" && a.after_mod === "yes") {
        workshop("רעידה שהופיעה אחרי שדרוג — לעיתים קשורה לזוויות גלי הנעה או איזון.");
        r.possibleCauses.push("זווית גל הנעה לאחר הגבהה", "איזון צמיגים חדשים", "בוץ שנדבק לחישוק");
        r.safeChecks.push("ניקוי בוץ מהחישוקים מבפנים");
      } else {
        workshop("רעש חדש — מומלץ לתעד (מתי, מהירות, צד) ולבדוק במוסך.");
      }
      if (a.when === "bumps") r.possibleCauses.push("גומיות/תפסנים", "ברגים רופפים במגנים או בגגון");
      break;
    }
    case "leak_smell": {
      if (a.type === "fuel") {
        stop("ריח דלק — סכנת שריפה. כבו מנוע, אל תעשנו ואל תתניעו שוב.");
      } else if (a.type === "smoke") {
        stop("עשן מתא המנוע — עצרו, כבו מנוע והתרחקו. בסכנה התקשרו למוקד חירום.");
      } else if (a.type === "brake_fluid") {
        stop("חשד לדליפת נוזל בלמים — אין לנסוע.");
      } else if (a.where === "cabin" && (a.type === "burning" || a.type === "sweet")) {
        stop("ריח חריג בתא הנוסעים — אווררו ועצרו לבדיקה.");
      } else if (a.type === "sweet") {
        workshop("דליפת נוזל קירור — עקבו אחרי מחוג הטמפרטורה ובדקו במוסך.");
        r.safeChecks.push("בדיקת מפלס במיכל העודפים כשהמנוע קר");
      } else if (a.type === "burning") {
        workshop("ריח שרוף — לעיתים צמחייה שנתקעה על המפלט או קלאץ׳/בלמים חמים.");
        r.safeChecks.push("כשהרכב קר: בדיקה וניקוי צמחייה מעל המפלט ומגני הגחון");
      } else if (a.type === "oil") {
        if (a.amount === "puddle") workshop("שלולית שמן — בדקו מפלס שמן לפני המשך נסיעה ופנו למוסך.");
        else r.headline = "טפטוף שמן קל — תעדו מיקום ועקבו אחרי מפלס.";
        if (a.where === "axle") r.possibleCauses.push("אטם דיפרנציאל/ציר — נפוץ אחרי שטח");
      } else if (a.type === "water") {
        r.headline = "טפטוף מים שקופים ליד מרכז הרכב — לרוב עיבוי מזגן תקין.";
      }
      r.safeChecks.push("הנחת קרטון מתחת לרכב בלילה לזיהוי מיקום וצבע");
      break;
    }
    case "starting": {
      if (a.water === "yes") {
        stop("קושי בהתנעה אחרי חציית מים — אל תמשיכו לנסות להתניע (חשש למים במנוע).");
        r.possibleCauses.push("מים ביניקה", "מים במערכת החשמל");
      } else if (a.symptom === "click" || a.symptom === "slow" || a.dim === "yes") {
        r.headline = "סימנים אופייניים למצבר חלש או לחיבור רופף.";
        r.possibleCauses.push("מצבר חלש", "הדקים רופפים או מחומצנים", "צרכנים שנשארו דלוקים (מקרר/תאורה)");
        r.safeChecks.push("בדיקה חזותית של הדקי המצבר", "התנעה בעזרת כבלים לפי הוראות היצרן");
        r.nextSteps.push("אם הבעיה חוזרת — בדיקת מצבר ומערכת טעינה במוסך");
      } else {
        workshop("הרכב לא מתניע ללא סיבה ברורה — נדרשת בדיקה מקצועית.");
        r.possibleCauses.push("אספקת דלק", "מערכת הצתה/הזרקה", "מערכת אימובילייזר");
      }
      break;
    }
    case "overheating": {
      if (a.gauge === "red" || a.steam === "yes") {
        stop("התחממות יתר — עצרו וכבו מנוע. אין לפתוח את מכסה הרדיאטור כשהמנוע חם.");
      } else {
        workshop("טמפרטורה גבוהה מהרגיל — הפחיתו עומס ועקבו.");
      }
      if (a.context === "mud") r.possibleCauses.push("רדיאטור/מצנן סתומים בבוץ או זרעים");
      if (a.context === "sand" || a.context === "climb" || a.context === "towing")
        r.possibleCauses.push("עומס גבוה במהירות אוויר נמוכה", "מערכת קירור שאינה עומדת בעומס");
      r.possibleCauses.push("מחסור בנוזל קירור", "מאוורר, תרמוסטט או משאבת מים");
      r.safeChecks.push("כשהמנוע קר: בדיקת מפלס במיכל העודפים", "בדיקה חזותית לסתימה בחזית הרדיאטור");
      break;
    }
    case "behaviour": {
      if (a.symptom === "brakes") stop("בלימה חלשה או דוושה רכה — אין להמשיך בנסיעה.");
      else if (a.symptom === "power") workshop("איבוד כוח — ייתכן מצב חירום של המנוע; בדיקה במוסך.");
      else if (a.symptom === "fourwd") {
        r.headline = "4×4/הילוך כוח לא נכנס — בדקו את נוהל ההעברה בספר הרכב (מהירות, ניוטרל).";
        r.nextSteps.push("אם הנוהל תקין והבעיה נמשכת — בדיקה במוסך לפני נסיעת שטח");
      } else if (a.symptom === "pull") {
        workshop("משיכה לצד — בדקו לחץ אוויר; ייתכן צורך בכיוון פרונט.");
        r.safeChecks.push("השוואת לחץ אוויר בין הצדדים");
        if (a.after_mod === "yes") r.possibleCauses.push("כיוון פרונט לאחר הגבהה/צמיגים");
      } else workshop("התנהגות חריגה — מומלץ לבדוק במוסך.");
      break;
    }
  }

  if (!r.headline) r.headline = "המשיכו לעקוב ותעדו את התסמין.";
  if (r.urgency === "stop") r.nextSteps.unshift(...STOP_STEPS);
  else if (r.urgency === "workshop")
    r.nextSteps.push("קבעו בדיקה במוסך והביאו את דוח התסמינים (ניתן להפיק דוח למכונאי).", "אם התסמין מחמיר — עצרו במקום בטוח.");
  else r.nextSteps.push("תעדו מתי זה קורה ועקבו. אם מחמיר — פנו למוסך.");
  return r;
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  stop: "לעצור בבטחה ולקבל סיוע",
  workshop: "נדרשת בדיקה במוסך",
  observe: "מעקב ובדיקה עצמית בטוחה",
};
