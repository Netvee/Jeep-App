"use client";

import { useState } from "react";
import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/forms";
import { addTripTaskAction, completeTripAction, updateTripAction } from "@/app/actions/trips";

export function AddTaskForm({ tripId, phase }: { tripId: string; phase: "pre" | "post" }) {
  return (
    <ActionForm action={addTripTaskAction} resetOnSuccess className="flex gap-2 mt-3">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="phase" value={phase} />
      <Input name="title" aria-label="משימה נוספת" placeholder="משימה נוספת" />
      <SubmitButton variant="secondary">הוספה</SubmitButton>
    </ActionForm>
  );
}

export function CompleteTripForm({ tripId }: { tripId: string }) {
  return (
    <ActionForm action={completeTripAction} className="flex flex-col gap-3">
      <input type="hidden" name="tripId" value={tripId} />
      <Field label="ק״מ בסיום (לא חובה)" htmlFor="km">
        <Input id="km" name="km" type="number" inputMode="numeric" min={0} />
      </Field>
      <SubmitButton>סימון כהושלם</SubmitButton>
    </ActionForm>
  );
}

export function EditTripForm({
  trip,
}: {
  trip: { id: string; title: string; tripDate: string | null; meetingPointLabel: string | null; meetingLat: number | null; meetingLng: number | null; meetingTime: string | null; notes: string | null };
}) {
  return (
    <ActionForm action={updateTripAction} className="flex flex-col gap-3 mt-3">
      <input type="hidden" name="tripId" value={trip.id} />
      <Field label="שם" htmlFor="et-title">
        <Input id="et-title" name="title" defaultValue={trip.title} />
      </Field>
      <Field label="תאריך" htmlFor="et-date">
        <Input id="et-date" name="tripDate" type="date" defaultValue={trip.tripDate ?? ""} />
      </Field>
      <Field label="נקודת מפגש" htmlFor="et-mp">
        <Input id="et-mp" name="meetingPointLabel" defaultValue={trip.meetingPointLabel ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="lat" htmlFor="et-lat">
          <Input id="et-lat" name="meetingLat" inputMode="decimal" defaultValue={trip.meetingLat ?? ""} />
        </Field>
        <Field label="lng" htmlFor="et-lng">
          <Input id="et-lng" name="meetingLng" inputMode="decimal" defaultValue={trip.meetingLng ?? ""} />
        </Field>
      </div>
      <Field label="שעה" htmlFor="et-time">
        <Input id="et-time" name="meetingTime" type="time" defaultValue={trip.meetingTime ?? ""} />
      </Field>
      <Field label="הערות" htmlFor="et-notes">
        <Textarea id="et-notes" name="notes" defaultValue={trip.notes ?? ""} />
      </Field>
      <SubmitButton variant="secondary">שמירה</SubmitButton>
    </ActionForm>
  );
}

export function CopyLink({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <input readOnly value={text} dir="ltr" className="w-full rounded-lg border border-sand-300 bg-sand-50 px-3 min-h-10 text-xs" onFocus={(e) => e.currentTarget.select()} aria-label={label} />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone("הועתק");
          } catch {
            setDone("ההעתקה נכשלה — סמנו והעתיקו ידנית");
          }
        }}
        className="self-start text-olive-700 underline min-h-9"
      >
        {label}
      </button>
      <span role="status" className="text-xs text-olive-700">
        {done}
      </span>
    </div>
  );
}
