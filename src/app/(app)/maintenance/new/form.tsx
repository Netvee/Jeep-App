"use client";

import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { createServiceRecordAction } from "@/app/actions/maintenance";

export function ServiceForm({
  vehicleId,
  today,
  lastKm,
  tasks,
  workshops,
}: {
  vehicleId: string;
  today: string;
  lastKm: number | null;
  tasks: { id: string; title: string }[];
  workshops: { id: string; name: string; isDemo: boolean }[];
}) {
  return (
    <ActionForm action={createServiceRecordAction} className="flex flex-col gap-4">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="כותרת" htmlFor="title">
        <Input id="title" name="title" required placeholder="למשל: טיפול 50,000" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="תאריך" htmlFor="performedOn">
          <Input id="performedOn" name="performedOn" type="date" required defaultValue={today} max={today} />
        </Field>
        <Field label="ק״מ בטיפול" htmlFor="km" hint={lastKm != null ? `קריאה אחרונה: ${lastKm.toLocaleString("he-IL")}` : undefined}>
          <Input id="km" name="km" type="number" inputMode="numeric" min={0} />
        </Field>
        <Field label="מוסך מהרשימה" htmlFor="workshopId">
          <Select id="workshopId" name="workshopId" defaultValue="">
            <option value="">—</option>
            {workshops.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
                {w.isDemo ? " (הדגמה)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="או שם מוסך" htmlFor="workshopName">
          <Input id="workshopName" name="workshopName" />
        </Field>
      </div>
      <Field label="עבודה שבוצעה" htmlFor="workPerformed">
        <Textarea id="workPerformed" name="workPerformed" rows={3} />
      </Field>
      <Field label="חלקים" htmlFor="partsUsed">
        <Textarea id="partsUsed" name="partsUsed" rows={2} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="עלות (₪)" htmlFor="costIls" hint="ריק = לא ידוע">
          <Input id="costIls" name="costIls" type="number" inputMode="numeric" min={0} />
        </Field>
        <Field label="מע״מ" htmlFor="includesVat">
          <Select id="includesVat" name="includesVat" defaultValue="">
            <option value="">לא ידוע</option>
            <option value="true">כולל</option>
            <option value="false">לפני מע״מ</option>
          </Select>
        </Field>
      </div>
      {tasks.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium mb-2">התזכורות שהטיפול השלים (יתאפסו מתאריך/ק״מ הטיפול)</legend>
          <div className="flex flex-col gap-2">
            {tasks.map((t) => (
              <label key={t.id} className="inline-flex items-center gap-2 text-sm min-h-10">
                <input type="checkbox" name="completedTaskIds" value={t.id} className="size-4 accent-olive-600" />
                {t.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Field label="קבלה (לא חובה)" htmlFor="receipt">
        <input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-4 file:py-2.5 file:font-medium" />
      </Field>
      <Field label="הערות" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} />
      </Field>
      <SubmitButton>שמירת טיפול</SubmitButton>
    </ActionForm>
  );
}
