"use client";

import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { savePrefsAction, deleteAccountAction } from "@/app/actions/settings";
import { saveBuildProfileAction } from "@/app/actions/community";

export function PrefsForm({ displayName, email, pressureUnit, showDemo }: { displayName: string; email: string; pressureUnit: string; showDemo: boolean }) {
  return (
    <ActionForm action={savePrefsAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="שם תצוגה" htmlFor="displayName">
          <Input id="displayName" name="displayName" defaultValue={displayName} required />
        </Field>
        <Field label="אימייל" htmlFor="email">
          <Input id="email" value={email} readOnly disabled />
        </Field>
        <Field label="יחידת לחץ אוויר" htmlFor="pressureUnit">
          <Select id="pressureUnit" name="pressureUnit" defaultValue={pressureUnit}>
            <option value="psi">PSI</option>
            <option value="bar">bar</option>
          </Select>
        </Field>
      </div>
      <label className="inline-flex items-start gap-2 text-sm">
        <input type="checkbox" name="showDemoData" defaultChecked={showDemo} className="size-4 mt-1 accent-olive-600" />
        <span>
          הצגת נתוני הדגמה (מסלולים, פריטים ומוסכים בדויים — מסומנים תמיד ״הדגמה״)
        </span>
      </label>
      <SubmitButton className="self-start">שמירה</SubmitButton>
    </ActionForm>
  );
}

export function BuildProfileForm({
  vehicleId,
  profile,
}: {
  vehicleId: string;
  profile: { title: string; summary: string | null; isPublic: boolean; showPhoto: boolean; showCosts: boolean; slug: string } | null;
}) {
  return (
    <ActionForm action={saveBuildProfileAction} className="flex flex-col gap-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="כותרת" htmlFor={`bt-${vehicleId}`}>
        <Input id={`bt-${vehicleId}`} name="title" defaultValue={profile?.title ?? ""} required />
      </Field>
      <Field label="תיאור" htmlFor={`bs-${vehicleId}`}>
        <Textarea id={`bs-${vehicleId}`} name="summary" rows={2} defaultValue={profile?.summary ?? ""} />
      </Field>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="isPublic" defaultChecked={profile?.isPublic} className="size-4 accent-olive-600" /> פרסום ציבורי
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="showPhoto" defaultChecked={profile?.showPhoto} className="size-4 accent-olive-600" /> כולל תמונת הרכב
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="showCosts" defaultChecked={profile?.showCosts} className="size-4 accent-olive-600" /> כולל עלויות
        </label>
      </div>
      {profile?.isPublic && (
        <p className="text-xs">
          כתובת ציבורית:{" "}
          <a href={`/builds/${profile.slug}`} className="text-olive-700 underline" dir="ltr">
            /builds/{profile.slug}
          </a>
        </p>
      )}
      <SubmitButton variant="secondary" className="self-start">
        שמירה
      </SubmitButton>
    </ActionForm>
  );
}

export function DeleteAccountForm({ isDemo }: { isDemo: boolean }) {
  return (
    <ActionForm action={deleteAccountAction} className="flex flex-col gap-3 rounded-xl border border-danger-100 p-4">
      <p className="font-semibold text-danger-700">מחיקת החשבון</p>
      <p className="text-sm text-charcoal-600">מוחק לצמיתות את כל הרכבים, הקבצים, הטיפולים, הטיולים והפוסטים. מומלץ להוריד גיבוי קודם.</p>
      {!isDemo && (
        <Field label="סיסמה" htmlFor="del-pass">
          <Input id="del-pass" name="password" type="password" autoComplete="current-password" required />
        </Field>
      )}
      <Field label="להקליד: מחק את החשבון" htmlFor="del-confirm">
        <Input id="del-confirm" name="confirm" autoComplete="off" />
      </Field>
      <SubmitButton variant="danger" className="self-start" pendingText="מוחק…">
        מחיקה לצמיתות
      </SubmitButton>
    </ActionForm>
  );
}
