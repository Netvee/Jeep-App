"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireUser, destroySession } from "@/server/auth";
import { verifyPassword } from "@/server/password";
import { str, oneOf, bool, guard, FieldError } from "@/server/formdata";
import type { ActionState } from "@/components/forms";

export async function savePrefsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    const displayName = str(fd, "displayName", 60);
    if (!displayName || displayName.length < 2) throw new FieldError("displayName", "שם קצר מדי");
    await db
      .update(s.users)
      .set({
        displayName,
        prefs: { ...user.prefs, pressureUnit: oneOf(fd, "pressureUnit", ["psi", "bar"] as const) ?? "psi", showDemoData: bool(fd, "showDemoData") },
      })
      .where(eq(s.users.id, user.id));
    return { ok: true, message: "ההגדרות נשמרו" };
  });
  revalidatePath("/", "layout");
  return res;
}

/** Permanently deletes the account and all owned data (cascade). Requires password re-entry. */
export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const user = await requireUser();
    const db = await getDb();
    if (!user.isDemoAccount) {
      const ok = await verifyPassword(String(fd.get("password") ?? ""), user.passwordHash);
      if (!ok) throw new FieldError("password", "הסיסמה שגויה");
    }
    if (str(fd, "confirm") !== "מחק את החשבון") throw new FieldError("confirm", "הקלידו בדיוק: מחק את החשבון");
    await db.delete(s.files).where(eq(s.files.ownerId, user.id));
    await db.delete(s.users).where(eq(s.users.id, user.id));
    return { ok: true };
  });
  if (res && "ok" in res && res.ok) {
    await destroySession();
    redirect("/");
  }
  return res;
}
