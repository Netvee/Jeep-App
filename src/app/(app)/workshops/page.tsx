import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { workshopVisibility } from "@/server/repo";
import { PageHeader, Card, CardHeader, Badge, DemoBadge, ExternalLink, LinkButton, TabLinks, Notice } from "@/components/ui";
import { REGION_LABEL } from "@/lib/trails";
import { formatDate } from "@/lib/units";
import { deletePrivateWorkshopAction } from "@/app/actions/community";
import { AddWorkshopForm } from "./client";
import type { Region } from "@/db/schema";

export const metadata: Metadata = { title: "מוסכים" };

export default async function WorkshopsPage({ searchParams }: { searchParams: Promise<{ region?: string; spec?: string }> }) {
  const { db, user, showDemo } = await getGarage();
  const sp = await searchParams;
  let list = await db.select().from(s.workshops).where(workshopVisibility(user.id, showDemo)).orderBy(desc(s.workshops.verified), s.workshops.name);
  if (sp.region) list = list.filter((w) => w.region === sp.region);
  if (sp.spec) list = list.filter((w) => w.specialties.some((x) => x.includes(sp.spec!)));
  const specs = [...new Set(list.flatMap((w) => w.specialties))].sort();
  const reviews = list.length
    ? await db
        .select()
        .from(s.communityPosts)
        .where(and(inArray(s.communityPosts.workshopId, list.map((w) => w.id)), eq(s.communityPosts.kind, "workshop_review"), eq(s.communityPosts.status, "published")))
    : [];
  const publicReal = list.filter((w) => !w.isDemo && !w.ownerId).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="מוסכים והצעות מחיר" subtitle="מדריך מוסכים לפי אזור והתמחות. מידע מאומת מסומן, ומיקום ממומן מסומן תמיד." />
      <TabLinks
        active="dir"
        tabs={[
          { key: "dir", label: "מדריך מוסכים", href: "/workshops" },
          { key: "quotes", label: "הצעות מחיר והשוואה", href: "/workshops/quotes" },
        ]}
      />
      {publicReal === 0 && (
        <Notice tone="info">
          עדיין אין במדריך מוסכים ציבוריים מאומתים. ניתן להוסיף מוסכים לרשימה הפרטית שלכם; רישומים ציבוריים מתווספים על ידי צוות הנתונים לאחר בדיקה.
          {showDemo && " מוסכי ההדגמה המוצגים בדויים."}
        </Notice>
      )}
      <form className="flex flex-wrap gap-2 items-end" method="get">
        <label className="flex flex-col gap-1 text-sm">
          <span>אזור</span>
          <select name="region" defaultValue={sp.region ?? ""} className="rounded-xl border border-sand-300 bg-white px-3 min-h-11">
            <option value="">הכול</option>
            {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
              <option key={r} value={r}>
                {REGION_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>התמחות</span>
          <select name="spec" defaultValue={sp.spec ?? ""} className="rounded-xl border border-sand-300 bg-white px-3 min-h-11">
            <option value="">הכול</option>
            {specs.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-xl bg-charcoal-900 text-white px-4 min-h-11">סינון</button>
      </form>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((w) => {
            const rs = reviews.filter((r) => r.workshopId === w.id);
            const avg = rs.filter((r) => r.rating).reduce((a, r) => a + (r.rating ?? 0), 0) / (rs.filter((r) => r.rating).length || 1);
            return (
              <li key={w.id}>
                <Card className="p-4 h-full flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {w.sponsored && <Badge tone="ember">ממומן</Badge>}
                    {w.verified ? <Badge tone="olive">פרטים אומתו {w.verifiedAt ? formatDate(w.verifiedAt) : ""}</Badge> : <Badge>לא אומת</Badge>}
                    {w.isDemo && <DemoBadge />}
                    {w.ownerId && <Badge tone="dark">פרטי שלי</Badge>}
                  </div>
                  <h2 className="font-semibold">{w.name}</h2>
                  <p className="text-sm text-charcoal-600">
                    {REGION_LABEL[w.region]}
                    {w.city && ` · ${w.city}`}
                  </p>
                  {w.specialties.length > 0 && <p className="text-xs text-charcoal-500">{w.specialties.join(" · ")}</p>}
                  <div className="text-sm flex flex-wrap gap-3">
                    {w.phone && (
                      <a href={`tel:${w.phone.replace(/[^\d+]/g, "")}`} className="text-olive-700 underline">
                        <bdi>{w.phone}</bdi>
                      </a>
                    )}
                    {w.website && <ExternalLink href={w.website}>אתר</ExternalLink>}
                  </div>
                  {w.notes && <p className="text-xs text-charcoal-500">{w.notes}</p>}
                  <p className="text-xs text-charcoal-500 mt-auto">{rs.length ? `${rs.length} ביקורות בעלים · ממוצע ${avg.toFixed(1)}/5` : "אין ביקורות"}</p>
                  {w.ownerId === user.id && (
                    <form action={deletePrivateWorkshopAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <button className="text-xs text-danger-700 hover:underline min-h-9">הסרה</button>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
          {!list.length && <li className="text-sm text-charcoal-500">אין מוסכים בסינון זה.</li>}
        </ul>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="הוספת מוסך לרשימה שלי" as="h3" subtitle="נראה רק לכם" />
            <div className="p-5 pt-3">
              <AddWorkshopForm />
            </div>
          </Card>
          <Card className="p-5 text-sm text-charcoal-600">
            שום מידע לא נשלח למוסך אוטומטית. לשליחת פרטי הרכב — הפיקו{" "}
            <Link href="/report" className="text-olive-700 underline">
              דוח למכונאי
            </Link>{" "}
            ושלחו אותו בעצמכם.
          </Card>
          <LinkButton href="/community?kind=workshop_review" variant="secondary">
            כתיבת ביקורת על מוסך
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
