import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, Field, Input, SubmitButton } from "@/components/forms";
import { loginAction, demoLoginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/server/auth";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "התחברות" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/garage");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">התחברות</h1>
      <p className="text-charcoal-500 mb-6">ברוכים השבים לגראז׳.</p>
      <ActionForm action={loginAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="אימייל" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="סיסמה" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton pendingText="מתחבר…">התחברות</SubmitButton>
      </ActionForm>
      <div className="mt-6 flex flex-col gap-3 text-sm">
        <p>
          אין חשבון?{" "}
          <Link href="/register" className="font-medium text-olive-700 underline">
            הרשמה
          </Link>
        </p>
        <form action={demoLoginAction}>
          <button className={buttonClass("ghost", "w-full")}>כניסה לחשבון הדגמה (נתונים בדויים)</button>
        </form>
      </div>
    </>
  );
}
