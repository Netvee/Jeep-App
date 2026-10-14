"use client";

import { ActionForm, Input, SubmitButton } from "./forms";
import { addMileageAction } from "@/app/actions/vehicles";

export function MileageForm({ vehicleId, today }: { vehicleId: string; today: string }) {
  return (
    <ActionForm action={addMileageAction} resetOnSuccess className="flex flex-col gap-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-32">
          <span className="font-medium">ק״מ במד-אוץ</span>
          <Input name="km" type="number" inputMode="numeric" min={0} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">תאריך</span>
          <Input name="recordedOn" type="date" defaultValue={today} max={today} />
        </label>
        <SubmitButton variant="secondary">עדכון</SubmitButton>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-charcoal-500">
        <input type="checkbox" name="correction" className="size-4 accent-olive-600" /> תיקון טעות (קריאה נמוכה מהקודמת)
      </label>
    </ActionForm>
  );
}
