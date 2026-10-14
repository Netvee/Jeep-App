import type { Metadata } from "next";
import { desc, eq, inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { Card, CardHeader, PageHeader, Badge, DemoBadge, EmptyState } from "@/components/ui";
import { moderateReportAction, hidePostAction } from "@/app/actions/admin";
import { OBSTACLE_LABEL } from "@/lib/trails";
import { haversineKm } from "@/lib/geo";
import { formatDate } from "@/lib/units";

export const metadata: Metadata = { title: "מודרציה" };

export default async function AdminReports() {
  const db = await getDb();
  const pending = await db
    .select({ r: s.trailReports, trail: s.trails.nameHe, by: s.users.displayName })
    .from(s.trailReports)
    .leftJoin(s.trails, eq(s.trails.id, s.trailReports.trailId))
    .leftJoin(s.users, eq(s.users.id, s.trailReports.userId))
    .where(eq(s.trailReports.status, "pending"))
    .orderBy(desc(s.trailReports.createdAt));
  const trailIds = [...new Set(pending.map((p) => p.r.trailId).filter((x): x is string => !!x))];
  const others = trailIds.length ? await db.select().from(s.trailReports).where(inArray(s.trailReports.trailId, trailIds)) : [];
  const posts = await db.select({ p: s.communityPosts, by: s.users.displayName }).from(s.communityPosts).innerJoin(s.users, eq(s.users.id, s.communityPosts.userId)).where(eq(s.communityPosts.status, "published")).orderBy(desc(s.communityPosts.createdAt)).limit(30);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="מודרציה" subtitle="דיווחי שטח ממתינים, איתור כפילויות ואימות מול מקור רשמי." />
      <Card>
        <CardHeader title={`דיווחים ממתינים (${pending.length})`} />
        <div className="p-5 pt-3 flex flex-col gap-3">
          {!pending.length && <EmptyState title="אין דיווחים ממתינים" />}
          {pending.map(({ r, trail, by }) => {
            const near = others.filter((o) => o.id !== r.id && o.trailId === r.trailId && o.status !== "rejected" && haversineKm([o.lng, o.lat], [r.lng, r.lat]) < 0.3);
            return (
              <div key={r.id} className="rounded-xl border border-sand-200 p-4 text-sm flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{OBSTACLE_LABEL[r.category]}</strong> · {trail ?? "—"} · {by ?? "—"} · נצפה {formatDate(r.observedOn)} {r.isDemo && <DemoBadge />}
                </div>
                <p>{r.description}</p>
                <p className="text-xs num">
                  {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                </p>
                {r.photoFileId && <p className="text-xs">יש תמונה מצורפת (תפורסם עם האישור)</p>}
                {near.length > 0 && (
                  <p className="text-xs text-warn-700">
                    דיווחים קרובים (300 מ׳): {near.map((n) => `${OBSTACLE_LABEL[n.category]} (${n.status})`).join(", ")}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <form action={moderateReportAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="rounded-lg bg-olive-600 text-white px-3 min-h-10">אישור כדיווח קהילה</button>
                  </form>
                  <form action={moderateReportAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button className="rounded-lg border border-danger-100 text-danger-700 px-3 min-h-10">דחייה</button>
                  </form>
                  {near.length > 0 && (
                    <form action={moderateReportAction} className="flex gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="duplicate" />
                      <select name="duplicateOf" className="rounded-lg border border-sand-300 px-2 min-h-10 text-xs" aria-label="כפילות של">
                        {near.map((n) => (
                          <option key={n.id} value={n.id}>
                            {OBSTACLE_LABEL[n.category]} · {formatDate(n.observedOn)}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-sand-300 px-3 min-h-10">סימון ככפילות</button>
                    </form>
                  )}
                  <form action={moderateReportAction} className="flex gap-1">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="verify" />
                    <input name="verificationSource" required placeholder="מקור רשמי לאימות" className="rounded-lg border border-sand-300 px-2 min-h-10 text-xs" />
                    <button className="rounded-lg bg-danger-700 text-white px-3 min-h-10">אימות כהגבלה רשמית</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader title="פוסטים אחרונים בקהילה" />
        <ul className="p-5 pt-3 divide-y divide-sand-200 text-sm">
          {posts.map(({ p, by }) => (
            <li key={p.id} className="py-2 flex items-center justify-between gap-2">
              <span>
                <Badge>{p.kind}</Badge> {p.title} · {by}
              </span>
              <form action={hidePostAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="text-xs text-danger-700 hover:underline min-h-9">הסתרה</button>
              </form>
            </li>
          ))}
          {!posts.length && <li className="text-charcoal-500">אין פוסטים.</li>}
        </ul>
      </Card>
    </div>
  );
}
