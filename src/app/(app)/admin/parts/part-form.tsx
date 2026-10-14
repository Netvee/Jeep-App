import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { createPartAction, updatePartAction } from "@/app/actions/admin";
import { CATEGORY_LABEL } from "@/lib/labels";
import { COMPONENTS } from "@/lib/components";
import type * as s from "@/db/schema";

type Part = typeof s.parts.$inferSelect;

export function PartForm({ part }: { part?: Part }) {
  const arr = (a?: string[]) => (a ?? []).join("\n");
  return (
    <ActionForm action={part ? updatePartAction : createPartAction} className="grid gap-3 sm:grid-cols-2">
      {part && <input type="hidden" name="partId" value={part.id} />}
      <Field label="שם (עברית)" htmlFor="nameHe">
        <Input id="nameHe" name="nameHe" defaultValue={part?.nameHe} required />
      </Field>
      <Field label="שם (אנגלית)" htmlFor="nameEn">
        <Input id="nameEn" name="nameEn" defaultValue={part?.nameEn ?? ""} dir="ltr" />
      </Field>
      <Field label="מותג" htmlFor="brand">
        <Input id="brand" name="brand" defaultValue={part?.brand} required />
      </Field>
      <Field label="מק״ט (רק אם אומת)" htmlFor="partNumber">
        <Input id="partNumber" name="partNumber" defaultValue={part?.partNumber ?? ""} dir="ltr" />
      </Field>
      <Field label="קטגוריה" htmlFor="category">
        <Select id="category" name="category" defaultValue={part?.category ?? ""} required>
          <option value="" disabled>
            בחרו
          </option>
          {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="רכיב" htmlFor="componentKey">
        <Select id="componentKey" name="componentKey" defaultValue={part?.componentKey ?? ""} required>
          <option value="" disabled>
            בחרו
          </option>
          {COMPONENTS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="תיאור" htmlFor="description" className="sm:col-span-2">
        <Textarea id="description" name="description" defaultValue={part?.description ?? ""} />
      </Field>
      {(
        [
          ["aliases", "כינויים לחיפוש (שורה לכל אחד)"],
          ["benefits", "יתרונות"],
          ["tradeoffs", "פשרות"],
          ["maintenanceNotes", "השלכות תחזוקה"],
          ["requiredSupporting", "חלקים/שינויים נלווים"],
        ] as const
      ).map(([k, l]) => (
        <Field key={k} label={l} htmlFor={k}>
          <Textarea id={k} name={k} rows={3} defaultValue={arr(part?.[k])} />
        </Field>
      ))}
      <Field label="מורכבות התקנה 1–5" htmlFor="installComplexity">
        <Input id="installComplexity" name="installComplexity" type="number" min={1} max={5} defaultValue={part?.installComplexity ?? ""} />
      </Field>
      <Field label="התקנה מקצועית" htmlFor="proInstallRecommended">
        <Select id="proInstallRecommended" name="proInstallRecommended" defaultValue={part?.proInstallRecommended == null ? "" : String(part.proInstallRecommended)}>
          <option value="">לא ידוע</option>
          <option value="true">מומלצת</option>
          <option value="false">לא נדרשת</option>
        </Select>
      </Field>
      <Field label="שכבת איור" htmlFor="overlay" hint="lift, bigtyres, winch, bumper, roofrack, snorkel, sliders, skid, lights, compressor, locker, recovery, storage, cooling">
        <Input id="overlay" name="overlay" defaultValue={part?.overlay ?? ""} dir="ltr" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="הגבהה (ס״מ)" htmlFor="liftCm">
          <Input id="liftCm" name="liftCm" inputMode="decimal" defaultValue={part?.liftCm ?? ""} />
        </Field>
        <Field label="מידת צמיג" htmlFor="tyreSize">
          <Input id="tyreSize" name="tyreSize" defaultValue={part?.tyreSize ?? ""} dir="ltr" />
        </Field>
      </div>
      <Field label="הערה רגולטורית/ביטוח/אחריות" htmlFor="legalNote" className="sm:col-span-2" hint="ללא מקור — תוצג כ״לא אומת״">
        <Textarea id="legalNote" name="legalNote" rows={2} defaultValue={part?.legalNote ?? ""} />
      </Field>
      <Field label="מקור רגולטורי" htmlFor="legalSourceUrl">
        <Input id="legalSourceUrl" name="legalSourceUrl" defaultValue={part?.legalSourceUrl ?? ""} dir="ltr" />
      </Field>
      <Field label="תאריך בדיקה" htmlFor="legalCheckedAt">
        <Input id="legalCheckedAt" name="legalCheckedAt" type="date" defaultValue={part?.legalCheckedAt ?? ""} />
      </Field>
      <SubmitButton className="self-start">{part ? "שמירה" : "יצירת פריט"}</SubmitButton>
    </ActionForm>
  );
}
