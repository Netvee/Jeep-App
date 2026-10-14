import type { Metadata } from "next";
import { isNull } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { Card, CardHeader, PageHeader, Badge, DemoBadge } from "@/components/ui";
import { ActionForm, Input, Select, SubmitButton } from "@/components/forms";
import { upsertWorkshopAction } from "@/app/actions/admin";
import { REGION_LABEL } from "@/lib/trails";

export const metadata: Metadata = { title: "ניהול מוסכים" };

function WorkshopForm({ w }: { w?: typeof s.workshops.$inferSelect }) {
  return (
    <ActionForm action={upsertWorkshopAction} className="grid gap-2 sm:grid-cols-3">
      {w && <input type="hidden" name="workshopId" value={w.id} />}
      <Input name="name" placeholder="שם" defaultValue={w?.name} required />
      <Select name="region" defaultValue={w?.region ?? ""} required aria-label="אזור">
        <option value="" disabled>
          אזור
        </option>
        {Object.entries(REGION_LABEL).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </Select>
      <Input name="city" placeholder="עיר" defaultValue={w?.city ?? ""} />
      <Input name="phone" placeholder="טלפון" defaultValue={w?.phone ?? ""} />
      <Input name="website" placeholder="https://" dir="ltr" defaultValue={w?.website ?? ""} />
      <Input name="specialties" placeholder="התמחויות, מופרדות בפסיק" defaultValue={w?.specialties.join(", ")} />
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="verified" defaultChecked={w?.verified} /> פרטים אומתו
      </label>
      <Input name="verifiedAt" type="date" defaultValue={w?.verifiedAt ?? ""} aria-label="תאריך אימות" />
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="sponsored" defaultChecked={w?.sponsored} /> ממומן (יסומן תמיד)
      </label>
      <Input name="notes" placeholder="הערות" defaultValue={w?.notes ?? ""} className="sm:col-span-2" />
      <SubmitButton variant="secondary">{w ? "שמירה" : "הוספה"}</SubmitButton>
    </ActionForm>
  );
}

export default async function AdminWorkshops() {
  const db = await getDb();
  const list = await db.select().from(s.workshops).where(isNull(s.workshops.ownerId));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="מוסכים ציבוריים" subtitle="מוסך יסומן כמאומת רק עם תאריך. רישום ממומן מסומן תמיד למשתמשים." />
      <Card>
        <CardHeader title="מוסך חדש" />
        <div className="p-5 pt-3">
          <WorkshopForm />
        </div>
      </Card>
      {list.map((w) => (
        <Card key={w.id}>
          <CardHeader
            title={
              <span className="flex flex-wrap items-center gap-2">
                {w.name} {w.isDemo && <DemoBadge />} {w.sponsored && <Badge tone="ember">ממומן</Badge>} {w.verified && <Badge tone="olive">מאומת</Badge>}
              </span>
            }
            as="h3"
          />
          <div className="p-5 pt-3">
            <WorkshopForm w={w} />
          </div>
        </Card>
      ))}
    </div>
  );
}
