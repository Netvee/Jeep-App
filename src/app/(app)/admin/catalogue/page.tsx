import type { Metadata } from "next";
import { inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { getCatalogueTree } from "@/server/catalogue-tree";
import { Card, CardHeader, PageHeader, ProvenanceBadge, Badge } from "@/components/ui";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { importCatalogueAction, upsertSpecAction, addReferenceImageAction, addOfficialServiceItemAction } from "@/app/actions/admin";
import { SPEC_LABELS } from "@/lib/components";
import { COVERAGE_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "ניהול קטלוג" };

const EXAMPLE = `{
  "version": 1,
  "makes": [{
    "slug": "toyota", "nameEn": "Toyota", "nameHe": "טויוטה", "aliases": [],
    "models": [{
      "slug": "toyota-hilux", "nameEn": "Hilux", "nameHe": "היילקס", "aliases": [], "segment": "pickup",
      "generations": [{
        "slug": "toyota-hilux-an120", "code": "AN120/AN130", "name": "Hilux (דור 8)",
        "yearFrom": 2015, "yearTo": null, "coverage": "deep", "aliases": [],
        "variants": [{
          "slug": "hilux-an120-28d-dc", "name": "קבינה כפולה · 2.8", "yearFrom": 2015,
          "body": "pickup-double", "archetype": "pickup", "aliases": [],
          "specs": [{ "key": "wheelbase_mm", "value": "3085", "unit": "מ״מ",
                      "source": "manufacturer_document", "sourceRef": "שם המסמך, עמוד",
                      "confidence": "high", "verifiedAt": "2026-01-01" }]
        }]
      }]
    }]
  }]
}`;

export default async function AdminCatalogue({ searchParams }: { searchParams: Promise<{ gen?: string }> }) {
  const db = await getDb();
  const { gen } = await searchParams;
  const tree = await getCatalogueTree(db);
  const selected = tree.find((g) => g.slug === gen) ?? null;
  const specs = selected?.variants.length ? await db.select().from(s.variantSpecs).where(inArray(s.variantSpecs.variantId, selected.variants.map((v) => v.id))) : [];
  const official = selected?.variants.length ? await db.select().from(s.officialServiceItems).where(inArray(s.officialServiceItems.variantId, selected.variants.map((v) => v.id))) : [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="קטלוג רכבים" subtitle="ייבוא מובנה (upsert לפי slug) ועריכת מקור ורמת ודאות לכל ערך מפרט." />
      <Card>
        <CardHeader title="ייבוא JSON" subtitle="תבנית: version 1 · יצרן → דגם → דור → גרסה → מפרט. ערך ״manufacturer_document״ מחייב sourceRef ו-verifiedAt." />
        <div className="p-5 pt-3">
          <ActionForm action={importCatalogueAction} className="flex flex-col gap-3">
            <Field label="קובץ JSON" htmlFor="cat-file">
              <input id="cat-file" name="file" type="file" accept="application/json,.json" className="text-sm" />
            </Field>
            <Field label="או הדבקה" htmlFor="cat-json">
              <Textarea id="cat-json" name="json" rows={8} dir="ltr" className="font-mono text-xs" placeholder={EXAMPLE} />
            </Field>
            <SubmitButton className="self-start">אימות וייבוא</SubmitButton>
          </ActionForm>
        </div>
      </Card>
      <Card>
        <CardHeader title="עריכת דור" />
        <div className="p-5 pt-3 flex flex-col gap-4">
          <form method="get" className="flex gap-2 items-end">
            <Select name="gen" defaultValue={gen ?? ""} aria-label="דור">
              <option value="">בחרו דור</option>
              {tree.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.makeEn} {g.modelEn} {g.code} ({COVERAGE_LABEL[g.coverage]})
                </option>
              ))}
            </Select>
            <button className="rounded-xl bg-charcoal-900 text-white px-4 min-h-11">פתיחה</button>
          </form>
          {selected && (
            <>
              <ActionForm action={addReferenceImageAction} className="grid gap-2 sm:grid-cols-2 rounded-xl border border-sand-200 p-4">
                <input type="hidden" name="generationId" value={selected.id} />
                <p className="sm:col-span-2 font-medium text-sm">תמונת ייחוס (רק עם רישיון שימוש מתועד)</p>
                <Input name="url" placeholder="https://… כתובת התמונה" dir="ltr" required />
                <Input name="sourceUrl" placeholder="https://… עמוד המקור" dir="ltr" />
                <Input name="license" placeholder="רישיון (למשל CC BY-SA 4.0)" required />
                <Input name="attribution" placeholder="ייחוס (שם הצלם/בעל הזכויות)" required />
                <SubmitButton variant="secondary" className="self-start">
                  הוספה
                </SubmitButton>
              </ActionForm>
              {selected.variants.map((v) => (
                <div key={v.id} className="rounded-xl border border-sand-200 p-4 flex flex-col gap-3">
                  <p className="font-semibold">
                    {v.name} <span className="text-xs text-charcoal-500 ltr">{v.slug}</span>
                  </p>
                  <ul className="flex flex-col gap-2">
                    {specs
                      .filter((x) => x.variantId === v.id)
                      .map((x) => (
                        <li key={x.id}>
                          <details className="rounded-lg bg-sand-50 px-3 py-2">
                            <summary className="cursor-pointer text-sm flex flex-wrap items-center gap-2">
                              {SPEC_LABELS[x.key] ?? x.key}: <strong>{x.value}</strong> {x.unit} <ProvenanceBadge source={x.source} /> <Badge>{x.confidence}</Badge>
                            </summary>
                            <SpecForm variantId={v.id} spec={x} />
                          </details>
                        </li>
                      ))}
                  </ul>
                  <details>
                    <summary className="cursor-pointer text-sm text-olive-700">ערך מפרט חדש</summary>
                    <SpecForm variantId={v.id} />
                  </details>
                  <details>
                    <summary className="cursor-pointer text-sm text-olive-700">מרווח טיפול רשמי (ממסמך יצרן בלבד)</summary>
                    <ActionForm action={addOfficialServiceItemAction} className="grid gap-2 sm:grid-cols-3 mt-2">
                      <input type="hidden" name="variantId" value={v.id} />
                      <Input name="title" placeholder="פעולה" required />
                      <Input name="intervalKm" type="number" placeholder="כל X ק״מ" />
                      <Input name="intervalMonths" type="number" placeholder="כל X חודשים" />
                      <Input name="sourceDocument" placeholder="מסמך מקור (חובה)" required />
                      <Input name="sourcePage" placeholder="עמוד" />
                      <Input name="verifiedAt" type="date" required aria-label="תאריך אימות" />
                      <Input name="severeUseNote" placeholder="הערת שימוש מאומץ" className="sm:col-span-2" />
                      <SubmitButton variant="secondary">הוספה</SubmitButton>
                    </ActionForm>
                    <ul className="text-xs mt-2">
                      {official
                        .filter((o) => o.variantId === v.id)
                        .map((o) => (
                          <li key={o.id}>
                            {o.title} · {o.sourceDocument}
                          </li>
                        ))}
                    </ul>
                  </details>
                </div>
              ))}
              {!selected.variants.length && <p className="text-sm text-charcoal-500">אין גרסאות — הוסיפו דרך ייבוא JSON.</p>}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function SpecForm({ variantId, spec }: { variantId: string; spec?: typeof s.variantSpecs.$inferSelect }) {
  return (
    <ActionForm action={upsertSpecAction} className="grid gap-2 sm:grid-cols-3 mt-2">
      <input type="hidden" name="variantId" value={variantId} />
      <Field label="מפתח" htmlFor={`k-${spec?.id ?? variantId}`}>
        <Input id={`k-${spec?.id ?? variantId}`} name="key" defaultValue={spec?.key} required dir="ltr" readOnly={!!spec} />
      </Field>
      <Field label="ערך" htmlFor={`v-${spec?.id ?? variantId}`}>
        <Input id={`v-${spec?.id ?? variantId}`} name="value" defaultValue={spec?.value} required />
      </Field>
      <Field label="יחידה" htmlFor={`u-${spec?.id ?? variantId}`}>
        <Input id={`u-${spec?.id ?? variantId}`} name="unit" defaultValue={spec?.unit ?? ""} />
      </Field>
      <Field label="מקור" htmlFor={`s-${spec?.id ?? variantId}`}>
        <Select id={`s-${spec?.id ?? variantId}`} name="source" defaultValue={spec?.source ?? "editorial"}>
          <option value="manufacturer_document">מסמך יצרן</option>
          <option value="importer">יבואן</option>
          <option value="editorial">עריכה</option>
          <option value="owner_reported">דיווח בעלים</option>
        </Select>
      </Field>
      <Field label="ודאות" htmlFor={`c-${spec?.id ?? variantId}`}>
        <Select id={`c-${spec?.id ?? variantId}`} name="confidence" defaultValue={spec?.confidence ?? "medium"}>
          <option value="high">גבוהה</option>
          <option value="medium">בינונית</option>
          <option value="low">נמוכה</option>
        </Select>
      </Field>
      <Field label="תאריך אימות" htmlFor={`d-${spec?.id ?? variantId}`}>
        <Input id={`d-${spec?.id ?? variantId}`} name="verifiedAt" type="date" defaultValue={spec?.verifiedAt ?? ""} />
      </Field>
      <Field label="הפניה למקור" htmlFor={`r-${spec?.id ?? variantId}`} className="sm:col-span-2">
        <Input id={`r-${spec?.id ?? variantId}`} name="sourceRef" defaultValue={spec?.sourceRef ?? ""} />
      </Field>
      <SubmitButton variant="secondary" className="self-end">
        שמירה
      </SubmitButton>
    </ActionForm>
  );
}
