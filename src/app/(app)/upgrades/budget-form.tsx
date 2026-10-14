"use client";

import { ActionForm, Input, SubmitButton } from "@/components/forms";
import { setBudgetAction } from "@/app/actions/upgrades";

export function BudgetForm({ vehicleId, budget }: { vehicleId: string; budget: number | null }) {
  return (
    <ActionForm action={setBudgetAction} className="flex items-end gap-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <label className="flex flex-col gap-1 text-sm flex-1">
        <span className="font-medium">תקציב (₪)</span>
        <Input name="budgetIls" type="number" inputMode="numeric" min={0} defaultValue={budget ?? ""} placeholder="ללא תקציב" />
      </label>
      <SubmitButton variant="secondary">עדכון</SubmitButton>
    </ActionForm>
  );
}
