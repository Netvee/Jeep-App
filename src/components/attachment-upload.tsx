"use client";

import { ActionForm, Field, Input, Select, SubmitButton } from "./forms";
import { uploadAttachmentAction } from "@/app/actions/vehicles";

export function AttachmentUpload({
  vehicleId,
  entityType,
  entityId,
  kinds = ["document", "receipt", "photo"],
}: {
  vehicleId: string;
  entityType: "vehicle" | "upgrade" | "service" | "symptom" | "quote" | "document";
  entityId?: string;
  kinds?: ("photo" | "receipt" | "document" | "audio" | "video")[];
}) {
  const labels = { photo: "תמונה", receipt: "קבלה", document: "מסמך (PDF/תמונה)", audio: "הקלטה", video: "וידאו" };
  return (
    <ActionForm action={uploadAttachmentAction} resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="entityType" value={entityType} />
      {entityId && <input type="hidden" name="entityId" value={entityId} />}
      <Field label="קובץ" htmlFor={`f-${entityType}`}>
        <input
          id={`f-${entityType}`}
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,application/pdf,audio/*,video/mp4,video/webm,video/quicktime"
          className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-4 file:py-2.5 file:font-medium"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="סוג" htmlFor={`k-${entityType}`}>
          <Select id={`k-${entityType}`} name="kind" defaultValue={kinds[0]}>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="כותרת" htmlFor={`t-${entityType}`}>
          <Input id={`t-${entityType}`} name="title" placeholder="לא חובה" />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingText="מעלה…">
        העלאה
      </SubmitButton>
    </ActionForm>
  );
}
