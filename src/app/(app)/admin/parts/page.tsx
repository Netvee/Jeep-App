import type { Metadata } from "next";
import Link from "@/components/link";
import { asc } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { Card, CardHeader, PageHeader, DemoBadge } from "@/components/ui";
import { ActionForm, Input, SubmitButton } from "@/components/forms";
import { addSupplierAction } from "@/app/actions/admin";
import { CATEGORY_LABEL } from "@/lib/labels";
import { PartForm } from "./part-form";

export const metadata: Metadata = { title: "ניהול חלקים" };

export default async function AdminParts() {
  const db = await getDb();
  const [parts, suppliers] = await Promise.all([db.select().from(s.parts).orderBy(asc(s.parts.category), asc(s.parts.nameHe)), db.select().from(s.suppliers)]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="חלקים, התאמות ומחירים" subtitle="״התאמה מאומתת״ דורשת ראיה ותאריך; מחיר ספק דורש ספק או קישור; כל מחיר נושא תאריך." />
      <Card>
        <CardHeader title={`פריטים (${parts.length})`} />
        <ul className="p-5 pt-3 grid gap-1 sm:grid-cols-2 text-sm">
          {parts.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/parts/${p.id}`} className="hover:underline">
                {p.nameHe}
              </Link>{" "}
              <span className="text-charcoal-500">· {CATEGORY_LABEL[p.category]}</span> {p.isDemo && <DemoBadge />}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="פריט חדש" />
        <div className="p-5 pt-3">
          <PartForm />
        </div>
      </Card>
      <Card>
        <CardHeader title="ספקים" subtitle="ספק יסומן כמאומת רק עם תאריך אימות" />
        <div className="p-5 pt-3 flex flex-col gap-3">
          <ul className="text-sm">
            {suppliers.map((x) => (
              <li key={x.id}>
                {x.name} {x.verified ? `· מאומת ${x.verifiedAt}` : "· לא מאומת"} {x.isDemo && <DemoBadge />}
              </li>
            ))}
          </ul>
          <ActionForm action={addSupplierAction} className="grid gap-2 sm:grid-cols-3">
            <Input name="name" placeholder="שם הספק" required />
            <Input name="url" placeholder="https://" dir="ltr" />
            <Input name="city" placeholder="עיר" />
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="verified" className="size-4" /> מאומת
            </label>
            <Input name="verifiedAt" type="date" aria-label="תאריך אימות" />
            <SubmitButton variant="secondary">הוספה</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}
