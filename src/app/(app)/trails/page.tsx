import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { loadPublishedTrails, vehicleCapability, loadVisibleReports } from "@/server/trails";
import { matchTrail } from "@/lib/trails";
import { vehicleDisplayName } from "@/server/repo";
import { PageHeader, Notice, LinkButton } from "@/components/ui";
import { TrailsExplorer, type TrailRow } from "./explorer";

export const metadata: Metadata = { title: "מסלולים" };

export default async function TrailsPage() {
  const { db, user, active, showDemo } = await getGarage();
  const [trails, cap, saved] = await Promise.all([
    loadPublishedTrails(db, showDemo),
    vehicleCapability(db, active),
    db.select().from(s.savedTrails).where(eq(s.savedTrails.userId, user.id)),
  ]);
  const reports = await loadVisibleReports(db, trails.map((t) => t.id), user.id, showDemo);
  const rows: TrailRow[] = trails.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.nameHe,
    region: t.region,
    kind: t.kind,
    isDemo: t.isDemo,
    geometry: t.geometry,
    start: t.startPoint,
    difficulty: t.difficulty,
    distanceKm: t.distanceKm,
    durationMin: t.durationMin,
    surfaces: t.surfaces,
    hasAccessNotes: t.access.length > 0,
    reportsCount: reports.filter((r) => r.trailId === t.id && r.status === "approved").length,
    saved: saved.some((x) => x.trailId === t.id),
    verdict: cap && t.kind === "route" ? matchTrail({ difficulty: t.difficulty, requirements: t.requirements, driverExperience: t.driverExperience }, cap).verdict : null,
  }));
  const realCount = trails.filter((t) => !t.isDemo).length;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="מסלולים"
        subtitle={active ? `התאמה מחושבת לפי הנתונים של ${vehicleDisplayName(active)}. התאמה אינה מבטיחה מעבר בטוח.` : "הוסיפו רכב כדי לראות התאמה"}
        actions={
          <>
            <LinkButton href="/trails/gpx" variant="secondary">
              ייבוא GPX
            </LinkButton>
            <LinkButton href="/trails/rubric" variant="ghost">
              רובריקת קושי
            </LinkButton>
          </>
        }
      />
      {realCount === 0 && (
        <Notice tone="warn" title="אין עדיין מסלולים מאומתים במערכת">
          כל המסלולים המוצגים הם <strong>מסלולי הדגמה עם קואורדינטות סינתטיות</strong> — הם אינם דרכים אמיתיות ואין לנווט לפיהם. מסלולים אמיתיים יתווספו דרך ממשק הייבוא והבדיקה, רק ממקורות
          בעלי רישיון שימוש מתאים.
        </Notice>
      )}
      <TrailsExplorer trails={rows} reports={reports.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, category: r.category, description: r.description, observedOn: r.observedOn, status: r.status, verified: r.verified, isDemo: r.isDemo, ageDays: r.ageDays }))} />
      <p className="text-xs text-charcoal-500">
        שכבת המפה: © תורמי OpenStreetMap. קווי המסלולים מוצגים כשכבה על המפה בלבד — זו אינה ניווט פנייה-אחר-פנייה. היעדר דיווחים אינו מעיד שהדרך פתוחה או עבירה.
      </p>
    </div>
  );
}
