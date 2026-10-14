import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { PageHeader, Card, LinkButton, EmptyState, Badge } from "@/components/ui";
import { formatDate } from "@/lib/units";

export const metadata: Metadata = { title: "טיולים" };

export default async function TripsPage() {
  const { db, user } = await getGarage();
  const trips = await db
    .select({ t: s.trips, trail: s.trails.nameHe, trailDemo: s.trails.isDemo })
    .from(s.trips)
    .leftJoin(s.trails, eq(s.trails.id, s.trips.trailId))
    .where(eq(s.trips.userId, user.id))
    .orderBy(desc(s.trips.tripDate));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="טיולים" subtitle="תכנון טיול: מסלול, נקודת מפגש, הכנות ובדיקות אחרי הטיול." actions={<LinkButton href="/trips/new">טיול חדש</LinkButton>} />
      {trips.length === 0 ? (
        <Card>
          <EmptyState title="אין טיולים" action={<LinkButton href="/trails">בחירת מסלול</LinkButton>} />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map(({ t, trail, trailDemo }) => {
            const pre = t.tasks.filter((x) => x.phase === "pre");
            const post = t.tasks.filter((x) => x.phase === "post");
            return (
              <li key={t.id}>
                <Link href={`/trips/${t.id}`} className="block rounded-2xl bg-white border border-sand-200 p-4 hover:border-olive-500 h-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{t.title}</span>
                    <Badge tone={t.status === "completed" ? "olive" : "neutral"}>{t.status === "completed" ? "הושלם" : t.status === "cancelled" ? "בוטל" : "מתוכנן"}</Badge>
                  </div>
                  <p className="text-sm text-charcoal-600">
                    {formatDate(t.tripDate)}
                    {trail && ` · ${trail}`}
                    {trailDemo && " (הדגמה)"}
                  </p>
                  <p className="text-xs text-charcoal-500 mt-2">
                    הכנות {pre.filter((x) => x.done).length}/{pre.length} · אחרי הטיול {post.filter((x) => x.done).length}/{post.length}
                    {t.shareToken && " · משותף"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
