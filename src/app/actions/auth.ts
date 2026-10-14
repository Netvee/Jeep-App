"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword, newToken } from "@/server/password";
import { createSession, destroySession, isAdminEmail, rateLimit } from "@/server/auth";
import { seedDemoGarage } from "@/server/demo-garage";
import type { ActionState } from "@/components/forms";

const registerSchema = z.object({
  displayName: z.string().trim().min(2, "שם קצר מדי").max(60),
  email: z.string().trim().toLowerCase().email("כתובת אימייל לא תקינה").max(200),
  password: z.string().min(10, "סיסמה של 10 תווים לפחות").max(200),
});

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!rateLimit(`reg:${await clientKey()}`, 10)) return { error: "יותר מדי ניסיונות. נסו שוב מאוחר יותר." };
  const db = await getDb();
  const { email, password, displayName } = parsed.data;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) return { error: "כתובת האימייל כבר רשומה. נסו להתחבר." };
  const [u] = await db
    .insert(users)
    .values({ email, displayName, passwordHash: await hashPassword(password), role: isAdminEmail(email) ? "admin" : "user" })
    .returning();
  await createSession(u.id);
  redirect("/onboarding");
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "נא למלא אימייל וסיסמה" };
  if (!rateLimit(`login:${email}:${await clientKey()}`)) return { error: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." };
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // constant-ish time: always run a verification
  const ok = u ? await verifyPassword(password, u.passwordHash) : (await verifyPassword(password, DUMMY), false);
  if (!u || !ok) return { error: "אימייל או סיסמה שגויים" };
  if (isAdminEmail(u.email) && u.role !== "admin") await db.update(users).set({ role: "admin" }).where(eq(users.id, u.id));
  await createSession(u.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/garage");
}

const DUMMY = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/** Creates a throw-away, clearly labelled demo account with a sample garage. */
export async function demoLoginAction() {
  if (!rateLimit(`demo:${await clientKey()}`, 20, 60 * 60 * 1000)) redirect("/?error=rate");
  const db = await getDb();
  const [u] = await db
    .insert(users)
    .values({
      email: `demo-${newToken().slice(0, 12).toLowerCase()}@demo.invalid`,
      displayName: "משתמש הדגמה",
      passwordHash: await hashPassword(newToken()),
      isDemoAccount: true,
      prefs: { showDemoData: true },
    })
    .returning();
  await seedDemoGarage(db, u.id);
  await createSession(u.id);
  redirect("/garage");
}
