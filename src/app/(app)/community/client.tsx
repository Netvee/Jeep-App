"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { createPostAction } from "@/app/actions/community";

export function PostForm({
  vehicleId,
  parts,
  workshops,
  defaultKind,
  disabled,
}: {
  vehicleId: string;
  parts: { id: string; name: string; isDemo: boolean }[];
  workshops: { id: string; name: string; isDemo: boolean }[];
  defaultKind?: string;
  disabled?: boolean;
}) {
  const [kind, setKind] = useState(defaultKind ?? "upgrade_experience");
  if (disabled) return <p className="text-sm text-charcoal-500">חשבון הדגמה אינו יכול לפרסם בקהילה.</p>;
  return (
    <ActionForm action={createPostAction} resetOnSuccess className="flex flex-col gap-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="סוג" htmlFor="kind">
        <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="upgrade_experience">חוויית שדרוג</option>
          <option value="install_cost">עלות התקנה בפועל</option>
          <option value="reliability">אמינות</option>
          <option value="workshop_review">ביקורת מוסך</option>
        </Select>
      </Field>
      <Field label="כותרת" htmlFor="p-title">
        <Input id="p-title" name="title" required />
      </Field>
      <Field label="תוכן" htmlFor="p-body">
        <Textarea id="p-body" name="body" required rows={4} />
      </Field>
      {kind !== "workshop_review" && (
        <Field label="פריט (לא חובה)" htmlFor="p-part">
          <Select id="p-part" name="partId" defaultValue="">
            <option value="">—</option>
            {parts
              .filter((p) => !p.isDemo)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
      )}
      {(kind === "workshop_review" || kind === "install_cost") && (
        <Field label="מוסך" htmlFor="p-ws">
          <Select id="p-ws" name="workshopId" defaultValue="" required={kind === "workshop_review"}>
            <option value="">—</option>
            {workshops
              .filter((w) => !w.isDemo)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </Select>
        </Field>
      )}
      {kind === "workshop_review" && (
        <Field label="דירוג" htmlFor="p-rating">
          <Select id="p-rating" name="rating" defaultValue="">
            <option value="">—</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {(kind === "install_cost" || kind === "upgrade_experience") && (
        <Field label="עלות בפועל (₪)" htmlFor="p-cost">
          <Input id="p-cost" name="costIls" type="number" inputMode="numeric" min={0} />
        </Field>
      )}
      <SubmitButton>פרסום</SubmitButton>
    </ActionForm>
  );
}
