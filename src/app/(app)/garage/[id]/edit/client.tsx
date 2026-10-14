"use client";

import { ActionForm, Input, SubmitButton } from "@/components/forms";
import { uploadVehiclePhotoAction, deleteVehicleAction } from "@/app/actions/vehicles";

export function PhotoUpload({ vehicleId }: { vehicleId: string }) {
  return (
    <ActionForm action={uploadVehiclePhotoAction} className="flex flex-col gap-2" resetOnSuccess>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <label className="text-sm font-medium" htmlFor="photo-in">
        העלאת תמונה
      </label>
      <input id="photo-in" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-4 file:py-2.5 file:font-medium" />
      <p className="text-xs text-charcoal-500">עד 10MB. מטא-נתוני EXIF (כולל מיקום GPS) מוסרים מ-JPEG/PNG.</p>
      <SubmitButton variant="secondary">שמירת תמונה</SubmitButton>
    </ActionForm>
  );
}

export function DeleteVehicleForm({ vehicleId }: { vehicleId: string }) {
  return (
    <ActionForm action={deleteVehicleAction} className="flex flex-col gap-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <p className="text-sm text-charcoal-600">המחיקה כוללת את כל השדרוגים, הטיפולים, המסמכים והתזכורות של הרכב ואינה הפיכה. מומלץ לייצא גיבוי לפני כן.</p>
      <label className="text-sm" htmlFor="confirm-del">
        להקליד <strong>מחק</strong> לאישור
      </label>
      <Input id="confirm-del" name="confirm" autoComplete="off" />
      <SubmitButton variant="danger" pendingText="מוחק…">
        מחיקת הרכב
      </SubmitButton>
    </ActionForm>
  );
}
