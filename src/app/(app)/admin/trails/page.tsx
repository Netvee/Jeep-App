import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { Card, CardHeader, PageHeader, Badge, DemoBadge, Notice } from "@/components/ui";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/forms";
import { importTrailGpxAction } from "@/app/actions/admin";
import { REGION_LABEL } from "@/lib/trails";
import { formatDate } from "@/lib/units";

export const metadata: Metadata = { title: "ניהול מסלולים" };

export default async function AdminTrails() {
  const db = await getDb();
  const trails = await db.select().from(s.trails).orderBy(desc(s.trails.updatedAt));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="מסלולים" subtitle="ייבוא GPX נוצר כטיוטה. פרסום מסלול אמיתי מחייב מקור, רישיון שימוש ותאריך אימות." />
      <Notice tone="warn">ייבאו רק נתונים שמותר להשתמש בהם (רישיון פתוח מתאים או הרשאה בכתב). אין לבצע scraping בניגוד לתנאי השימוש של מקור.</Notice>
      <Card>
        <CardHeader title="ייבוא מקובץ GPX" />
        <div className="p-5 pt-3">
          <ActionForm action={importTrailGpxAction} className="grid gap-3 sm:grid-cols-2">
            <Field label="קובץ GPX" htmlFor="gpx">
              <input id="gpx" name="gpx" type="file" accept=".gpx,application/gpx+xml,application/xml" required className="text-sm" />
            </Field>
            <Field label="שם בעברית" htmlFor="nameHe">
              <Input id="nameHe" name="nameHe" required />
            </Field>
            <Field label="שם באנגלית" htmlFor="nameEn">
              <Input id="nameEn" name="nameEn" dir="ltr" />
            </Field>
            <Field label="slug" htmlFor="slug">
              <Input id="slug" name="slug" dir="ltr" placeholder="lowercase-with-dashes" />
            </Field>
            <Field label="אזור" htmlFor="region">
              <Select id="region" name="region" required defaultValue="">
                <option value="" disabled>
                  בחרו
                </option>
                {Object.entries(REGION_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="שם המקור" htmlFor="sourceName">
              <Input id="sourceName" name="sourceName" required />
            </Field>
            <Field label="קישור למקור" htmlFor="sourceUrl">
              <Input id="sourceUrl" name="sourceUrl" dir="ltr" />
            </Field>
            <Field label="רישיון שימוש" htmlFor="license">
              <Input id="license" name="license" required placeholder="למשל ODbL / הרשאה בכתב מ-…" />
            </Field>
            <Field label="תאריך אימות בשטח/מול מקור" htmlFor="lastVerifiedAt">
              <Input id="lastVerifiedAt" name="lastVerifiedAt" type="date" />
            </Field>
            <SubmitButton className="self-end">ייבוא כטיוטה</SubmitButton>
          </ActionForm>
        </div>
      </Card>
      <Card>
        <CardHeader title={`כל המסלולים (${trails.length})`} />
        <ul className="p-5 pt-3 divide-y divide-sand-200 text-sm">
          {trails.map((t) => (
            <li key={t.id} className="py-2 flex flex-wrap items-center gap-2">
              <Link href={`/admin/trails/${t.id}`} className="font-medium hover:underline">
                {t.nameHe}
              </Link>
              <Badge>{REGION_LABEL[t.region]}</Badge>
              <Badge tone={t.status === "published" ? "olive" : "neutral"}>{t.status === "published" ? "מפורסם" : "טיוטה"}</Badge>
              {t.isDemo && <DemoBadge />}
              <span className="text-xs text-charcoal-500">אימות: {t.lastVerifiedAt ? formatDate(t.lastVerifiedAt) : "אין"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
