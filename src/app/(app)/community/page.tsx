import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import * as s from "@/db/schema";
import { getActiveVehicleDetails } from "@/server/context";
import { getCatalogueTree } from "@/server/catalogue-tree";
import { PageHeader, Card, CardHeader, Badge, EmptyState, Notice } from "@/components/ui";
import { formatDate, formatIls } from "@/lib/units";
import { deleteOwnPostAction } from "@/app/actions/community";
import { PostForm } from "./client";

export const metadata: Metadata = { title: "קהילה" };

const KIND_LABEL = { upgrade_experience: "חוויית שדרוג", install_cost: "עלות התקנה בפועל", reliability: "אמינות", workshop_review: "ביקורת מוסך" } as const;

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ gen?: string; kind?: string }> }) {
  const { db, user, active, variant } = await getActiveVehicleDetails();
  const sp = await searchParams;
  const tree = await getCatalogueTree(db);
  const genSlug = sp.gen ?? variant?.generation.slug ?? "";
  const gen = tree.find((g) => g.slug === genSlug) ?? null;
  const where = gen ? and(eq(s.communityPosts.status, "published"), eq(s.communityPosts.generationId, gen.id)) : eq(s.communityPosts.status, "published");
  const [posts, builds, parts, workshops] = await Promise.all([
    db
      .select({ p: s.communityPosts, author: s.users.displayName, part: s.parts.nameHe, workshop: s.workshops.name })
      .from(s.communityPosts)
      .innerJoin(s.users, eq(s.users.id, s.communityPosts.userId))
      .leftJoin(s.parts, eq(s.parts.id, s.communityPosts.partId))
      .leftJoin(s.workshops, eq(s.workshops.id, s.communityPosts.workshopId))
      .where(where)
      .orderBy(desc(s.communityPosts.createdAt))
      .limit(100),
    db
      .select({ b: s.buildProfiles, make: s.vehicles.make, model: s.vehicles.model, year: s.vehicles.year })
      .from(s.buildProfiles)
      .innerJoin(s.vehicles, eq(s.vehicles.id, s.buildProfiles.vehicleId))
      .where(eq(s.buildProfiles.isPublic, true))
      .limit(30),
    db.select({ id: s.parts.id, name: s.parts.nameHe, isDemo: s.parts.isDemo }).from(s.parts),
    db.select({ id: s.workshops.id, name: s.workshops.name, isDemo: s.workshops.isDemo }).from(s.workshops).where(or(isNull(s.workshops.ownerId), eq(s.workshops.ownerId, user.id))),
  ]);
  const filtered = sp.kind ? posts.filter((x) => x.p.kind === sp.kind) : posts;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="קהילת בעלים" subtitle="חוויות, עלויות התקנה אמיתיות, אמינות וביקורות מוסכים — מסודר לפי דור הרכב." />
      <Notice tone="info">כל התוכן כאן נכתב על ידי משתמשים רשומים. אין בקהילה תוכן מדומה, משתמשים בדויים או ביקורות מומצאות. חשבונות הדגמה אינם יכולים לפרסם.</Notice>
      <form method="get" className="flex flex-wrap gap-2 items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span>דור רכב</span>
          <select name="gen" defaultValue={genSlug} className="rounded-xl border border-sand-300 bg-white px-3 min-h-11 max-w-72">
            <option value="">כל הרכבים</option>
            {tree.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.makeHe} {g.modelHe} {g.code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>סוג</span>
          <select name="kind" defaultValue={sp.kind ?? ""} className="rounded-xl border border-sand-300 bg-white px-3 min-h-11">
            <option value="">הכול</option>
            {Object.entries(KIND_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-xl bg-charcoal-900 text-white px-4 min-h-11">הצגה</button>
      </form>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <Card>
              <EmptyState title="עדיין אין פוסטים כאן">היו הראשונים לשתף ניסיון עם {gen ? `${gen.modelHe} ${gen.code}` : "הרכב שלכם"}.</EmptyState>
            </Card>
          ) : (
            filtered.map(({ p, author, part, workshop }) => (
              <Card key={p.id} className="p-5 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone="info">{KIND_LABEL[p.kind]}</Badge>
                  <span className="text-charcoal-500">
                    {author} · {formatDate(p.createdAt)}
                  </span>
                </div>
                <h2 className="font-semibold text-lg">{p.title}</h2>
                <p className="whitespace-pre-wrap text-[15px]">{p.body}</p>
                <div className="text-sm text-charcoal-600 flex flex-wrap gap-3">
                  {part && <span>פריט: {part}</span>}
                  {workshop && <span>מוסך: {workshop}</span>}
                  {p.costIls != null && <span>עלות שדווחה: {formatIls(p.costIls)}</span>}
                  {p.rating != null && <span>דירוג: {p.rating}/5</span>}
                </div>
                {p.userId === user.id && (
                  <form action={deleteOwnPostAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-danger-700 hover:underline min-h-9">מחיקה</button>
                  </form>
                )}
              </Card>
            ))
          )}
        </div>
        <div className="flex flex-col gap-6">
          {active && (
            <Card>
              <CardHeader title="שיתוף" as="h3" subtitle="יפורסם תחת שם התצוגה שלכם" />
              <div className="p-5 pt-3">
                <PostForm vehicleId={active.id} parts={parts} workshops={workshops} defaultKind={sp.kind} disabled={user.isDemoAccount} />
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="פרופילי בנייה ציבוריים" as="h3" subtitle="רק בהסכמה מפורשת של הבעלים" />
            <ul className="p-5 pt-3 flex flex-col gap-2 text-sm">
              {builds.length ? (
                builds.map(({ b, make, model, year }) => (
                  <li key={b.slug}>
                    <Link href={`/builds/${b.slug}`} className="hover:underline font-medium">
                      {b.title}
                    </Link>
                    <span className="text-charcoal-500"> · {[make, model, year].filter(Boolean).join(" ")}</span>
                  </li>
                ))
              ) : (
                <li className="text-charcoal-500">אין עדיין פרופילים ציבוריים.</li>
              )}
              <li className="mt-2">
                <Link href="/settings#build" className="text-olive-700 hover:underline">
                  ניהול פרופיל הבנייה שלי ←
                </Link>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
