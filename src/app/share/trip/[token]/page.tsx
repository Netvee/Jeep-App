import type { Metadata } from "next";
import Link from "@/components/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { Logo } from "@/components/logo";
import { formatDate } from "@/lib/units";
import { REGION_LABEL } from "@/lib/trails";

export const metadata: Metadata = { title: "תוכנית טיול משותפת", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Public, read-only view of an explicitly shared trip. Only whitelisted fields are rendered. */
export default async function SharedTrip({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) notFound();
  const db = await getDb();
  const [trip] = await db
    .select({
      title: s.trips.title,
      tripDate: s.trips.tripDate,
      meetingPointLabel: s.trips.meetingPointLabel,
      meetingLat: s.trips.meetingLat,
      meetingLng: s.trips.meetingLng,
      meetingTime: s.trips.meetingTime,
      tasks: s.trips.tasks,
      trailId: s.trips.trailId,
    })
    .from(s.trips)
    .where(eq(s.trips.shareToken, token));
  if (!trip) notFound();
  const [trail] = trip.trailId
    ? await db.select({ nameHe: s.trails.nameHe, region: s.trails.region, isDemo: s.trails.isDemo, distanceKm: s.trails.distanceKm, difficulty: s.trails.difficulty }).from(s.trails).where(eq(s.trails.id, trip.trailId))
    : [];
  return (
    <div className="min-h-dvh">
      <header className="bg-charcoal-900 text-sand-50">
        <div className="mx-auto max-w-3xl px-4 min-h-16 flex items-center justify-between">
          <Logo />
          <span className="text-xs text-sand-300">תוכנית טיול · קריאה בלבד</span>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-5">
        <h1 className="text-3xl font-bold">{trip.title}</h1>
        <p className="text-charcoal-600">
          {formatDate(trip.tripDate)}
          {trip.meetingTime && ` · מפגש ב-${trip.meetingTime}`}
        </p>
        <section className="rounded-2xl bg-white border border-sand-200 p-5">
          <h2 className="font-semibold mb-1">נקודת מפגש</h2>
          <p>{trip.meetingPointLabel ?? "לא הוגדרה"}</p>
          {trip.meetingLat != null && trip.meetingLng != null && (
            <p className="num font-mono select-all mt-1">
              {trip.meetingLat.toFixed(5)}, {trip.meetingLng.toFixed(5)}
            </p>
          )}
        </section>
        {trail && (
          <section className="rounded-2xl bg-white border border-sand-200 p-5">
            <h2 className="font-semibold mb-1">מסלול</h2>
            <p>
              {trail.nameHe} · {REGION_LABEL[trail.region]}
              {trail.distanceKm != null && ` · ${trail.distanceKm} ק״מ`}
              {trail.difficulty != null && ` · קושי ${trail.difficulty}/5`}
            </p>
            {trail.isDemo && <p className="text-sm text-warn-700 mt-1">מסלול הדגמה עם קואורדינטות סינתטיות — אינו דרך אמיתית.</p>}
          </section>
        )}
        <section className="rounded-2xl bg-white border border-sand-200 p-5">
          <h2 className="font-semibold mb-2">הכנות</h2>
          <ul className="list-disc ps-5 space-y-1">
            {trip.tasks
              .filter((t) => t.phase === "pre")
              .map((t) => (
                <li key={t.id}>{t.title}</li>
              ))}
          </ul>
        </section>
        <p className="text-xs text-charcoal-500">
          נוצר באפליקציית שטח. זו תוכנית ולא הנחיות ניווט; יש לבדוק הגבלות גישה ותנאים לפני יציאה.{" "}
          <Link href="/" className="underline">
            אודות
          </Link>
        </p>
      </main>
    </div>
  );
}
