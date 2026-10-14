import type { Metadata } from "next";
import Link from "@/components/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { isUuid } from "@/server/repo";
import { Card, CardHeader, PageHeader, DemoBadge } from "@/components/ui";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { updateTrailAction } from "@/app/actions/admin";
import { DIFFICULTY_RUBRIC } from "@/lib/trails";

export const metadata: Metadata = { title: "עריכת מסלול" };

const ACCESS_EXAMPLE = `[{"type":"nature_reserve","description":"נסיעה רק בדרכים מסומנות","authority":"רשות הטבע והגנים","sourceUrl":"https://www.parks.org.il/","verifiedAt":"2026-01-01"}]`;

export default async function AdminTrail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const db = await getDb();
  const [t] = await db.select().from(s.trails).where(eq(s.trails.id, id));
  if (!t) notFound();
  const r = t.requirements;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/trails" className="hover:underline">מסלולים</Link>}
        title={t.nameHe}
        subtitle={`${t.kind === "route" ? `${t.geometry?.length ?? 0} נקודות · ${t.distanceKm ?? "?"} ק״מ` : "נקודת מיקום"} · מקור: ${t.sourceName} · רישיון: ${t.license ?? "—"}`}
        actions={t.isDemo ? <DemoBadge /> : <Link href={`/trails/${t.slug}`} className="text-olive-700 underline">תצוגה</Link>}
      />
      <Card>
        <CardHeader title="נתוני מסלול" />
        <div className="p-5 pt-3">
          <ActionForm action={updateTrailAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="trailId" value={t.id} />
            <Field label="שם" htmlFor="nameHe">
              <Input id="nameHe" name="nameHe" defaultValue={t.nameHe} />
            </Field>
            <Field label="סטטוס" htmlFor="status">
              <Select id="status" name="status" defaultValue={t.status}>
                <option value="draft">טיוטה</option>
                <option value="published">מפורסם</option>
              </Select>
            </Field>
            <Field label="תיאור" htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" name="description" defaultValue={t.description ?? ""} />
            </Field>
            <Field label="קושי (רובריקה)" htmlFor="difficulty">
              <Select id="difficulty" name="difficulty" defaultValue={t.difficulty?.toString() ?? ""}>
                <option value="">לא דורג</option>
                {DIFFICULTY_RUBRIC.map((d) => (
                  <option key={d.level} value={d.level}>
                    {d.level} · {d.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="משך (דקות)" htmlFor="durationMin">
              <Input id="durationMin" name="durationMin" type="number" defaultValue={t.durationMin ?? ""} />
            </Field>
            <Field label="משטחים (שורה לכל אחד)" htmlFor="surfaces">
              <Textarea id="surfaces" name="surfaces" rows={2} defaultValue={t.surfaces.join("\n")} />
            </Field>
            <Field label="ציוד מומלץ (שורה לכל אחד)" htmlFor="suggestedEquipment">
              <Textarea id="suggestedEquipment" name="suggestedEquipment" rows={2} defaultValue={t.suggestedEquipment.join("\n")} />
            </Field>
            <Field label="עונתיות" htmlFor="seasonality">
              <Input id="seasonality" name="seasonality" defaultValue={t.seasonality ?? ""} />
            </Field>
            <Field label="ניסיון נהג" htmlFor="driverExperience">
              <Select id="driverExperience" name="driverExperience" defaultValue={t.driverExperience ?? ""}>
                <option value="">לא צוין</option>
                <option value="beginner">מתחיל</option>
                <option value="intermediate">בינוני</option>
                <option value="advanced">מנוסה</option>
              </Select>
            </Field>
            <Field label="מכשולים" htmlFor="obstaclesSummary" className="sm:col-span-2">
              <Textarea id="obstaclesSummary" name="obstaclesSummary" rows={2} defaultValue={t.obstaclesSummary ?? ""} />
            </Field>
            <Field label="קליטה (רק ממקור)" htmlFor="receptionNotes">
              <Input id="receptionNotes" name="receptionNotes" defaultValue={t.receptionNotes ?? ""} />
            </Field>
            <Field label="יציאות וגישת חילוץ" htmlFor="exitPoints">
              <Input id="exitPoints" name="exitPoints" defaultValue={t.exitPoints ?? ""} />
            </Field>
            <Field label="התרעות נוכחיות" htmlFor="advisories" className="sm:col-span-2">
              <Input id="advisories" name="advisories" defaultValue={t.advisories ?? ""} />
            </Field>
            <fieldset className="sm:col-span-2 grid gap-2 sm:grid-cols-3 rounded-xl border border-sand-200 p-3">
              <legend className="text-sm font-medium px-1">דרישות (להתאמת רכב)</legend>
              <Input name="minGroundClearanceCm" inputMode="decimal" placeholder="מרווח גחון מינ׳ (ס״מ)" defaultValue={r.minGroundClearanceCm ?? ""} />
              <Select name="reqTyres" defaultValue={r.tyres ?? ""} aria-label="צמיגים">
                <option value="">צמיגים: ללא דרישה</option>
                <option value="road">כביש</option>
                <option value="at">AT</option>
                <option value="mt">MT</option>
              </Select>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" name="reqLowRange" defaultChecked={!!r.lowRange} /> הילוך כוח
                </label>
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" name="reqLockers" defaultChecked={!!r.lockersRecommended} /> נעילות
                </label>
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" name="reqRecovery" defaultChecked={!!r.recoveryGearRecommended} /> ציוד חילוץ
                </label>
              </div>
            </fieldset>
            <Field label="הגבלות גישה (JSON)" htmlFor="access" className="sm:col-span-2" hint={`דוגמה: ${ACCESS_EXAMPLE}`}>
              <Textarea id="access" name="access" rows={4} dir="ltr" className="font-mono text-xs" defaultValue={t.access.length ? JSON.stringify(t.access, null, 1) : ""} />
            </Field>
            <Field label="תאריך אימות אחרון" htmlFor="lastVerifiedAt">
              <Input id="lastVerifiedAt" name="lastVerifiedAt" type="date" defaultValue={t.lastVerifiedAt ?? ""} />
            </Field>
            <SubmitButton className="self-end">שמירה</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}
