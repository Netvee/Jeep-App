import type { Metadata } from "next";
import { inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { PageHeader, Card, CardHeader, Notice, buttonClass } from "@/components/ui";
import { PrefsForm, BuildProfileForm, DeleteAccountForm } from "./client";
import { UnitTools } from "@/components/unit-tools";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = { title: "הגדרות" };

export default async function SettingsPage() {
  const { db, user, vehicles } = await getGarage();
  const builds = vehicles.length ? await db.select().from(s.buildProfiles).where(inArray(s.buildProfiles.vehicleId, vehicles.map((v) => v.id))) : [];
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <PageHeader title="הגדרות, פרטיות וגיבוי" />
      <Card>
        <CardHeader title="חשבון והעדפות" />
        <div className="p-5 pt-3">
          <PrefsForm displayName={user.displayName} email={user.email} pressureUnit={user.prefs?.pressureUnit ?? "psi"} showDemo={user.prefs?.showDemoData !== false} />
        </div>
      </Card>
      <Card>
        <CardHeader title="כלי מידות" subtitle="המרת לחץ אוויר והשוואת מידות צמיגים (חישוב נומינלי)" />
        <div className="p-5 pt-3">
          <UnitTools defaultUnit={user.prefs?.pressureUnit ?? "psi"} currentTyre={vehicles[0]?.tyreSize ?? ""} />
        </div>
      </Card>
      <Card id="build">
        <CardHeader title="פרופיל בנייה ציבורי" subtitle="פרטי כברירת מחדל. פרסום רק בסימון מפורש." />
        <div className="p-5 pt-3 flex flex-col gap-6">
          <Notice tone="info">פרופיל ציבורי כולל רק: יצרן, דגם, דור, שנה, שמות השדרוגים המותקנים, ולבחירתכם — תמונה ועלויות. לעולם לא: מספר רישוי, VIN, מסמכים, קילומטראז׳, טיולים או מיקומים.</Notice>
          {vehicles.map((v) => {
            const b = builds.find((x) => x.vehicleId === v.id);
            return (
              <div key={v.id} className="rounded-xl border border-sand-200 p-4">
                <p className="font-semibold mb-2">{vehicleDisplayName(v)}</p>
                <BuildProfileForm vehicleId={v.id} profile={b ? { title: b.title, summary: b.summary, isPublic: b.isPublic, showPhoto: b.showPhoto, showCosts: b.showCosts, slug: b.slug } : null} />
              </div>
            );
          })}
          {!vehicles.length && <p className="text-sm text-charcoal-500">אין רכבים.</p>}
        </div>
      </Card>
      <Card>
        <CardHeader title="גיבוי וייצוא" />
        <div className="p-5 pt-3 flex flex-col gap-3 text-sm">
          <p>קובץ JSON עם כל הנתונים שלכם: רכבים, קילומטראז׳, שדרוגים ועלויות, טיפולים, תזכורות, תסמינים, טיולים, הצעות מחיר ורשימת הקבצים (עם קישור הורדה מאובטח).</p>
          <a href="/api/export" className={buttonClass("primary", "self-start")} download>
            הורדת גיבוי (JSON)
          </a>
          <p className="text-xs text-charcoal-500">הקבצים עצמם (תמונות/קבלות) אינם מוטמעים בקובץ; הורידו אותם מעמוד המסמכים.</p>
        </div>
      </Card>
      <Card>
        <CardHeader title="יציאה ומחיקה" />
        <div className="p-5 pt-3 flex flex-col gap-5">
          <div className="rounded-xl bg-charcoal-900 p-2 self-start">
            <LogoutButton />
          </div>
          <DeleteAccountForm isDemo={user.isDemoAccount} />
        </div>
      </Card>
    </div>
  );
}
