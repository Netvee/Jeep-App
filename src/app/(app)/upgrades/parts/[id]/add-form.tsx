"use client";

import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { addUpgradeAction } from "@/app/actions/upgrades";
import { PHASE_LABEL } from "@/lib/labels";

export function AddToPlanForm({ vehicleId, partId, incompatible }: { vehicleId: string; partId: string; incompatible: boolean }) {
  return (
    <ActionForm action={addUpgradeAction} className="flex flex-col gap-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="partId" value={partId} />
      {incompatible && <p className="text-sm text-danger-700 bg-danger-100 rounded-lg px-3 py-2">הפריט מתועד כלא מתאים לרכב. אפשר להוסיף לתוכנית, אך ההתנגשות תוצג.</p>}
      <PlanFields />
      <SubmitButton>הוספה לתוכנית</SubmitButton>
    </ActionForm>
  );
}

export function PlanFields({ defaults = {} }: { defaults?: { status?: string; phase?: string } }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="סטטוס" htmlFor="status">
          <Select id="status" name="status" defaultValue={defaults.status ?? "wishlist"}>
            <option value="wishlist">רשימת משאלות</option>
            <option value="planned">מתוכנן</option>
            <option value="purchased">נרכש</option>
          </Select>
        </Field>
        <Field label="עדיפות" htmlFor="priority">
          <Select id="priority" name="priority" defaultValue="3">
            <option value="1">1 — גבוהה</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5 — נמוכה</option>
          </Select>
        </Field>
      </div>
      <Field label="שלב" htmlFor="phase">
        <Select id="phase" name="phase" defaultValue={defaults.phase ?? ""}>
          <option value="">ללא</option>
          {Object.entries(PHASE_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="קבוצת חלופות" htmlFor="alternativeGroup" hint="שדרוגים עם אותו שם קבוצה יוצגו להשוואה (למשל: כננת)">
        <Input id="alternativeGroup" name="alternativeGroup" />
      </Field>
      <Field label="למה זה רלוונטי לי?" htmlFor="reason">
        <Textarea id="reason" name="reason" rows={2} />
      </Field>
    </>
  );
}
