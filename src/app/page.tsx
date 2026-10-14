import Link from "@/components/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { VehiclePhoto } from "@/components/vehicle/photo";
import { demoLoginAction } from "@/app/actions/auth";
import { Car, Wrench, Route, Settings2, FileText, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/garage");
  const features = [
    { icon: Car, title: "הגראז׳ שלי", text: "כמה רכבים, פרופיל מפורט שמאפשר ערכים לא ידועים, קילומטראז׳ מתוארך, מסמכים וקבלות." },
    { icon: Settings2, title: "מתכנן שדרוגים", text: "התאמה לפי גרסה מדויקת עם רמת ודאות, עלויות מפורקות — ועלויות לא ידועות נשארות לא ידועות." },
    { icon: Wrench, title: "טיפולים ותזכורות", text: "תזכורות לפי תאריך ולפי ק״מ, היסטוריית טיפולים ובדיקות אחרי טיול מאובק, בוצי או רטוב." },
    { icon: Route, title: "מסלולים ודיווחים", text: "מפה ורשימה לפי אזורים, רובריקת קושי מוסברת, דיווחי מכשולים ומידע גישה עם מקורות." },
    { icon: FileText, title: "דוח למכונאי", text: "דוח מסודר בעברית עם מפרט, שדרוגים, היסטוריה ותסמינים — אתם בוחרים מה לכלול." },
    { icon: ShieldCheck, title: "פרטיות ונתונים כנים", text: "מסמכים, מספר רישוי ומיקומים פרטיים כברירת מחדל. נתוני הדגמה מסומנים תמיד." },
  ];
  return (
    <div className="min-h-dvh">
      <header className="bg-charcoal-900 text-sand-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between min-h-16">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-sand-200 hover:text-white px-3 min-h-10 inline-flex items-center rounded-lg">
              התחברות
            </Link>
            <Link href="/register" className={buttonClass("accent", "min-h-10 text-sm")}>
              הרשמה
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">
        <section className="bg-charcoal-900 text-sand-50 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-6 grid lg:grid-cols-[1fr_1.1fr] gap-8 items-center">
            <div>
              <p className="text-ember-500 font-medium mb-3">לבעלי רכבי 4×4 בישראל</p>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
                הרכב שלך, השדרוגים, הטיפולים
                <br />
                והשטח — במקום אחד.
              </h1>
              <p className="text-sand-300 mt-4 text-lg max-w-xl">
                גראז׳ אישי שמכיר את הגרסה המדויקת של הרכב, מתכנן שדרוגים בשקלים עם מקורות ותאריכים, ומלווה אתכם לפני ואחרי כל יציאה לשטח.
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                <Link href="/register" className={buttonClass("accent", "text-base px-6 min-h-12")}>
                  פתיחת גראז׳ חינם
                </Link>
                <form action={demoLoginAction}>
                  <button className={buttonClass("secondary", "text-base px-6 min-h-12 bg-transparent text-sand-50 border-sand-500 hover:bg-white/10")}>
                    כניסה לחשבון הדגמה
                  </button>
                </form>
              </div>
              <p className="text-xs text-sand-400 mt-3">חשבון ההדגמה מכיל רכב, מחירים ומסלולים בדויים ומסומנים — לניסיון בלבד.</p>
            </div>
            <div className="relative">
              <div className="absolute inset-x-6 bottom-6 h-40 rounded-[50%] bg-ember-600/20 blur-3xl" aria-hidden />
              <svg viewBox="0 0 1000 200" className="absolute bottom-0 inset-x-0 w-full" aria-hidden preserveAspectRatio="none">
                <path d="M0 140 L120 90 L260 130 L420 60 L560 120 L700 80 L860 130 L1000 100 L1000 200 L0 200 Z" fill="#2a2d30" />
              </svg>
              <VehiclePhoto set="jeep-wrangler-jl" alt="" className="relative w-full h-auto drop-shadow-2xl" priority />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <h2 className="text-2xl font-bold mb-8">מה תמצאו בפנים</h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li key={f.title} className="rounded-2xl bg-white border border-sand-200 p-6">
                <f.icon className="text-olive-600 mb-3" size={28} aria-hidden />
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-charcoal-600 mt-1 text-[15px]">{f.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 rounded-2xl bg-sand-100 border border-sand-200 p-6 text-sm text-charcoal-700 leading-relaxed">
            <strong>על הנתונים:</strong> הקטלוג מכסה כרגע מספר מצומצם של דגמים בעומק, והמפרטים בו מסומנים כ״עריכה — טרם אומת״ עד לאימות מול מסמכי יצרן. מסלולי ההדגמה סינתטיים ואינם
            מיועדים לניווט. התאמה בין חלק לרכב מוצגת כ״מאומתת״ רק כשיש ראיה מתועדת לגרסה המדויקת. ההמלצות במערכת אינן תחליף לבדיקה מקצועית ואינן מבטיחות מעבר בטוח.
          </div>
        </section>
      </main>
      <footer className="border-t border-sand-200 py-6 text-center text-xs text-charcoal-500">
        שטח · אפליקציה עצמאית, אינה קשורה ליצרני הרכב המוזכרים. מפות © תורמי OpenStreetMap.
      </footer>
    </div>
  );
}
