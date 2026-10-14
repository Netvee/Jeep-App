import Link from "@/components/link";
import type { Metadata } from "next";
import { ActionForm, Field, Input, SubmitButton } from "@/components/forms";
import { registerAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "הרשמה" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">פתיחת גראז׳</h1>
      <p className="text-charcoal-500 mb-6">הנתונים שלכם פרטיים כברירת מחדל.</p>
      <ActionForm action={registerAction} className="flex flex-col gap-4">
        <Field label="שם תצוגה" htmlFor="displayName">
          <Input id="displayName" name="displayName" autoComplete="nickname" required minLength={2} />
        </Field>
        <Field label="אימייל" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="סיסמה" htmlFor="password" hint="לפחות 10 תווים">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <SubmitButton pendingText="יוצר חשבון…">יצירת חשבון</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm">
        כבר רשומים?{" "}
        <Link href="/login" className="font-medium text-olive-700 underline">
          התחברות
        </Link>
      </p>
    </>
  );
}
