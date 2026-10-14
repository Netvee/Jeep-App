"use client";

import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { addPrivateWorkshopAction } from "@/app/actions/community";
import { REGION_LABEL } from "@/lib/trails";

export function AddWorkshopForm() {
  return (
    <ActionForm action={addPrivateWorkshopAction} resetOnSuccess className="flex flex-col gap-3">
      <Field label="שם" htmlFor="w-name">
        <Input id="w-name" name="name" required />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="אזור" htmlFor="w-region">
          <Select id="w-region" name="region" required defaultValue="">
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
        <Field label="עיר" htmlFor="w-city">
          <Input id="w-city" name="city" />
        </Field>
      </div>
      <Field label="טלפון" htmlFor="w-phone">
        <Input id="w-phone" name="phone" type="tel" />
      </Field>
      <Field label="אתר" htmlFor="w-web">
        <Input id="w-web" name="website" type="url" placeholder="https://" />
      </Field>
      <Field label="התמחויות (מופרדות בפסיק)" htmlFor="w-spec">
        <Input id="w-spec" name="specialties" />
      </Field>
      <Field label="הערות" htmlFor="w-notes">
        <Textarea id="w-notes" name="notes" rows={2} />
      </Field>
      <SubmitButton variant="secondary">הוספה</SubmitButton>
    </ActionForm>
  );
}
