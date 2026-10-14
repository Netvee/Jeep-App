import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, isNull, lt, or, desc } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { Card, CardHeader, PageHeader, Stat, Badge } from "@/components/ui";
import { formatDate } from "@/lib/units";

export const metadata: Metadata = { title: "ניהול נתונים" };

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

export default async function AdminHome() {
  const db = await getDb();
  const n = (t: Parameters<typeof db.$count>[0], w?: Parameters<typeof db.$count>[1]) => db.$count(t, w);
  const [users, vehicles, parts, realParts, fitVerified, pending, trailsPub, trailsDraft, editorialSpecs, docSpecs] = await Promise.all([
    n(s.users),
    n(s.vehicles),
    n(s.parts),
    n(s.parts, eq(s.parts.isDemo, false)),
    n(s.fitments, and(eq(s.fitments.status, "verified"), eq(s.fitments.isDemo, false))),
    n(s.trailReports, eq(s.trailReports.status, "pending")),
    n(s.trails, and(eq(s.trails.status, "published"), eq(s.trails.isDemo, false))),
    n(s.trails, eq(s.trails.status, "draft")),
    n(s.variantSpecs, eq(s.variantSpecs.source, "editorial")),
    n(s.variantSpecs, eq(s.variantSpecs.source, "manufacturer_document")),
  ]);
  const [stalePrices, staleFitments, staleTrails, staleWorkshops, audit] = await Promise.all([
    db.select({ p: s.prices, name: s.parts.nameHe }).from(s.prices).innerJoin(s.parts, eq(s.parts.id, s.prices.partId)).where(and(lt(s.prices.observedAt, daysAgo(90)), eq(s.prices.isDemo, false))).limit(50),
    db.select({ f: s.fitments, name: s.parts.nameHe }).from(s.fitments).innerJoin(s.parts, eq(s.parts.id, s.fitments.partId)).where(and(eq(s.fitments.status, "verified"), lt(s.fitments.verifiedAt, daysAgo(365)), eq(s.fitments.isDemo, false))).limit(50),
    db.select().from(s.trails).where(and(eq(s.trails.isDemo, false), or(isNull(s.trails.lastVerifiedAt), lt(s.trails.lastVerifiedAt, daysAgo(365))))).limit(50),
    db.select().from(s.workshops).where(and(eq(s.workshops.verified, true), lt(s.workshops.verifiedAt, daysAgo(365)))).limit(50),
    db.select({ a: s.adminAudit, who: s.users.displayName }).from(s.adminAudit).leftJoin(s.users, eq(s.users.id, s.adminAudit.userId)).orderBy(desc(s.adminAudit.createdAt)).limit(15),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="ניהול נתונים" subtitle="איכות נתונים: מקור, תאריך עדכון ורמת ודאות לכל מפרט, התאמה, מחיר, מסלול והגבלה." />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Stat label="משתמשים" value={users} />
        <Stat label="רכבים" value={vehicles} />
        <Stat label="פריטים (אמיתיים)" value={`${realParts} / ${parts}`} />
        <Stat label="התאמות מאומתות" value={fitVerified} hint="לא כולל הדגמה" />
        <Stat label="דיווחים ממתינים" value={<Link href="/admin/reports" className="underline">{pending}</Link>} />
        <Stat label="מסלולים מפורסמים" value={trailsPub} hint="לא כולל הדגמה" />
        <Stat label="טיוטות מסלולים" value={trailsDraft} />
        <Stat label="מפרט מאומת ממסמך" value={docSpecs} />
        <Stat label="מפרט עריכתי (לא אומת)" value={editorialSpecs} />
      </div>
      <Card>
        <CardHeader title="סקירת רעננות" subtitle="רשומות שדורשות בדיקה חוזרת" />
        <div className="p-5 pt-3 grid gap-5 md:grid-cols-2 text-sm">
          <div>
            <p className="font-semibold mb-1">מחירים בני יותר מ-90 יום ({stalePrices.length})</p>
            <ul className="list-disc ps-5">
              {stalePrices.map(({ p, name }) => (
                <li key={p.id}>
                  <Link href={`/admin/parts/${p.partId}`} className="hover:underline">
                    {name}
                  </Link>{" "}
                  · {formatDate(p.observedAt)}
                </li>
              ))}
              {!stalePrices.length && <li className="text-charcoal-500 list-none">אין</li>}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">התאמות מאומתות לפני יותר משנה ({staleFitments.length})</p>
            <ul className="list-disc ps-5">
              {staleFitments.map(({ f, name }) => (
                <li key={f.id}>
                  <Link href={`/admin/parts/${f.partId}`} className="hover:underline">
                    {name}
                  </Link>{" "}
                  · {formatDate(f.verifiedAt)}
                </li>
              ))}
              {!staleFitments.length && <li className="text-charcoal-500 list-none">אין</li>}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">מסלולים ללא אימות בשנה האחרונה ({staleTrails.length})</p>
            <ul className="list-disc ps-5">
              {staleTrails.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/trails/${t.id}`} className="hover:underline">
                    {t.nameHe}
                  </Link>{" "}
                  · {t.lastVerifiedAt ? formatDate(t.lastVerifiedAt) : "מעולם לא אומת"} <Badge>{t.status === "draft" ? "טיוטה" : "מפורסם"}</Badge>
                </li>
              ))}
              {!staleTrails.length && <li className="text-charcoal-500 list-none">אין</li>}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">מוסכים שאומתו לפני יותר משנה ({staleWorkshops.length})</p>
            <ul className="list-disc ps-5">
              {staleWorkshops.map((w) => (
                <li key={w.id}>{w.name}</li>
              ))}
              {!staleWorkshops.length && <li className="text-charcoal-500 list-none">אין</li>}
            </ul>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="יומן פעולות ניהול" />
        <ul className="p-5 pt-3 text-sm divide-y divide-sand-200">
          {audit.map(({ a, who }) => (
            <li key={a.id} className="py-1.5">
              {formatDate(a.createdAt)} · {who ?? "—"} · {a.action} · {a.entity}
            </li>
          ))}
          {!audit.length && <li className="text-charcoal-500">אין פעולות.</li>}
        </ul>
      </Card>
    </div>
  );
}
