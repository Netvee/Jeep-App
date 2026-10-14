import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { isUuid } from "@/server/repo";
import { getCatalogueTree } from "@/server/catalogue-tree";
import { Card, CardHeader, PageHeader, FitmentBadge, DemoBadge } from "@/components/ui";
import { ActionForm, Input, Select, SubmitButton } from "@/components/forms";
import { upsertFitmentAction, addPriceAction, deletePriceAction } from "@/app/actions/admin";
import { formatDate, formatIlsRange } from "@/lib/units";
import { PRICE_KIND_LABEL } from "@/server/catalog";
import { PartForm } from "../part-form";

export const metadata: Metadata = { title: "עריכת פריט" };

export default async function AdminPart({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const db = await getDb();
  const [part] = await db.select().from(s.parts).where(eq(s.parts.id, id));
  if (!part) notFound();
  const [fits, prices, suppliers, tree] = await Promise.all([
    db.select({ f: s.fitments, vname: s.variants.name }).from(s.fitments).innerJoin(s.variants, eq(s.variants.id, s.fitments.variantId)).where(eq(s.fitments.partId, id)),
    db.select().from(s.prices).where(eq(s.prices.partId, id)).orderBy(desc(s.prices.observedAt)),
    db.select().from(s.suppliers),
    getCatalogueTree(db),
  ]);
  const variantOptions = tree.flatMap((g) => g.variants.map((v) => ({ id: v.id, label: `${g.makeEn} ${g.modelEn} ${g.code} · ${v.name}` })));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={<Link href="/admin/parts" className="hover:underline">חלקים</Link>} title={part.nameHe} actions={part.isDemo ? <DemoBadge /> : undefined} />
      <Card>
        <CardHeader title="התאמה לגרסאות" subtitle="ראיה = מסמך יצרן החלק / ספק המפרט גרסה ושנים. שם דגם בלבד אינו ראיה." />
        <div className="p-5 pt-3 flex flex-col gap-3">
          <ul className="flex flex-col gap-2 text-sm">
            {fits.map(({ f, vname }) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-sand-50 px-3 py-2">
                <FitmentBadge status={f.status} /> {vname} {f.verifiedAt && `· ${formatDate(f.verifiedAt)}`} {f.evidence && <span className="text-charcoal-500">· {f.evidence}</span>}
                <ActionForm action={upsertFitmentAction} className="ms-auto">
                  <input type="hidden" name="partId" value={part.id} />
                  <input type="hidden" name="variantId" value={f.variantId} />
                  <input type="hidden" name="status" value="unconfirmed" />
                  <input type="hidden" name="remove" value="1" />
                  <SubmitButton variant="ghost" className="min-h-9 text-xs">
                    הסרה
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
            {!fits.length && <li className="text-charcoal-500">אין רשומות — כל הרכבים יראו ״לא אומת״.</li>}
          </ul>
          <ActionForm action={upsertFitmentAction} className="grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="partId" value={part.id} />
            <Select name="variantId" required defaultValue="" aria-label="גרסה">
              <option value="" disabled>
                גרסה
              </option>
              {variantOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
            <Select name="status" required defaultValue="" aria-label="סטטוס">
              <option value="" disabled>
                סטטוס
              </option>
              <option value="verified">מאומת</option>
              <option value="owner_reported">דיווח בעלים</option>
              <option value="unconfirmed">לא אומת</option>
              <option value="incompatible">לא מתאים</option>
            </Select>
            <Input name="evidence" placeholder="ראיה (חובה למאומת/דיווח/לא מתאים)" className="sm:col-span-2" />
            <Input name="sourceUrl" placeholder="https:// קישור לראיה" dir="ltr" />
            <Input name="verifiedAt" type="date" aria-label="תאריך אימות" />
            <SubmitButton variant="secondary" className="self-start">
              שמירת התאמה
            </SubmitButton>
          </ActionForm>
        </div>
      </Card>
      <Card>
        <CardHeader title="מחירים" subtitle="כל מחיר עם סוג, מקור ותאריך תצפית" />
        <div className="p-5 pt-3 flex flex-col gap-3">
          <ul className="flex flex-col gap-2 text-sm">
            {prices.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-sand-50 px-3 py-2">
                <strong>{formatIlsRange(p.amountMin, p.amountMax)}</strong> · {PRICE_KIND_LABEL[p.kind]} · {formatDate(p.observedAt)} · {p.includesVat == null ? "מע״מ לא ידוע" : p.includesVat ? "כולל מע״מ" : "לפני מע״מ"}
                {p.isDemo && <DemoBadge />}
                <form action={deletePriceAction} className="ms-auto">
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-xs text-danger-700 hover:underline min-h-9">מחיקה</button>
                </form>
              </li>
            ))}
          </ul>
          <ActionForm action={addPriceAction} className="grid gap-2 sm:grid-cols-3">
            <input type="hidden" name="partId" value={part.id} />
            <Select name="kind" required defaultValue="" aria-label="סוג מחיר">
              <option value="" disabled>
                סוג
              </option>
              <option value="supplier">מחיר ספק</option>
              <option value="owner_reported">דיווח בעלים</option>
              <option value="estimate">הערכה</option>
            </Select>
            <Input name="amountMin" type="number" placeholder="מ- ₪" required />
            <Input name="amountMax" type="number" placeholder="עד ₪" />
            <Select name="supplierId" defaultValue="" aria-label="ספק">
              <option value="">ללא ספק</option>
              {suppliers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
            <Select name="includesVat" defaultValue="" aria-label="מע״מ">
              <option value="">מע״מ לא ידוע</option>
              <option value="true">כולל מע״מ</option>
              <option value="false">לפני מע״מ</option>
            </Select>
            <Input name="observedAt" type="date" required aria-label="תאריך תצפית" />
            <Input name="sourceUrl" placeholder="https:// מקור" dir="ltr" />
            <Input name="availability" placeholder="זמינות" />
            <SubmitButton variant="secondary">הוספת מחיר</SubmitButton>
          </ActionForm>
        </div>
      </Card>
      <Card>
        <CardHeader title="פרטי הפריט" />
        <div className="p-5 pt-3">
          <PartForm part={part} />
        </div>
      </Card>
    </div>
  );
}
