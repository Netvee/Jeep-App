"use client";

import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { createTripAction } from "@/app/actions/trips";
import { CONDITION_LABEL } from "@/lib/checklists";

export function TripForm({ trails, vehicles, activeId, trailSlug }: { trails: { slug: string; name: string }[]; vehicles: { id: string; name: string }[]; activeId: string | null; trailSlug: string }) {
  return (
    <ActionForm action={createTripAction} className="flex flex-col gap-4">
      <Field label="שם הטיול" htmlFor="title">
        <Input id="title" name="title" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="תאריך" htmlFor="tripDate">
          <Input id="tripDate" name="tripDate" type="date" />
        </Field>
        <Field label="רכב" htmlFor="vehicleId">
          <Select id="vehicleId" name="vehicleId" defaultValue={activeId ?? ""}>
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="מסלול" htmlFor="trailSlug">
        <Select id="trailSlug" name="trailSlug" defaultValue={trailSlug}>
          <option value="">ללא מסלול שמור</option>
          {trails.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="grid gap-4 sm:grid-cols-2 rounded-xl border border-sand-200 p-4">
        <legend className="text-sm font-semibold px-1">נקודת מפגש</legend>
        <Field label="תיאור" htmlFor="meetingPointLabel" className="sm:col-span-2">
          <Input id="meetingPointLabel" name="meetingPointLabel" placeholder="למשל: חניון תחנת הדלק" />
        </Field>
        <Field label="קו רוחב (lat)" htmlFor="meetingLat">
          <Input id="meetingLat" name="meetingLat" inputMode="decimal" placeholder="31.12345" />
        </Field>
        <Field label="קו אורך (lng)" htmlFor="meetingLng">
          <Input id="meetingLng" name="meetingLng" inputMode="decimal" placeholder="35.12345" />
        </Field>
        <Field label="שעה" htmlFor="meetingTime">
          <Input id="meetingTime" name="meetingTime" type="time" />
        </Field>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium mb-2">תנאים צפויים</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONDITION_LABEL).map(([k, l]) => (
            <label key={k} className="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-3 min-h-10 text-sm cursor-pointer has-[:checked]:border-olive-500 has-[:checked]:bg-olive-100">
              <input type="checkbox" name="conditions" value={k} className="size-4 accent-olive-600" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="הערות" htmlFor="notes">
        <Textarea id="notes" name="notes" />
      </Field>
      <SubmitButton>יצירת טיול</SubmitButton>
    </ActionForm>
  );
}
