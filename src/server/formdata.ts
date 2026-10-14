/** Helpers that turn FormData into typed values; empty strings become null ("unknown"). */
import { UploadError } from "./uploads";
import { NotFoundError } from "./repo";

export function str(fd: FormData, key: string, max = 2000): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export function int(fd: FormData, key: string, opts: { min?: number; max?: number } = {}): number | null {
  const v = str(fd, key);
  if (v == null) return null;
  const n = Number(v.replace(/[,\s₪]/g, ""));
  if (!Number.isFinite(n)) throw new FieldError(key, "מספר לא תקין");
  const r = Math.round(n);
  if (opts.min != null && r < opts.min) throw new FieldError(key, `הערך חייב להיות לפחות ${opts.min}`);
  if (opts.max != null && r > opts.max) throw new FieldError(key, `הערך חייב להיות לכל היותר ${opts.max}`);
  return r;
}

export function float(fd: FormData, key: string, opts: { min?: number; max?: number } = {}): number | null {
  const v = str(fd, key);
  if (v == null) return null;
  const n = Number(v.replace(/,/g, "."));
  if (!Number.isFinite(n)) throw new FieldError(key, "מספר לא תקין");
  if (opts.min != null && n < opts.min) throw new FieldError(key, `הערך חייב להיות לפחות ${opts.min}`);
  if (opts.max != null && n > opts.max) throw new FieldError(key, `הערך חייב להיות לכל היותר ${opts.max}`);
  return n;
}

/** tri-state: "true" | "false" | "" (unknown) */
export function tri(fd: FormData, key: string): boolean | null {
  const v = fd.get(key);
  if (v === "true" || v === "on") return true;
  if (v === "false") return false;
  return null;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true";
}

export function date(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  if (v == null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new FieldError(key, "תאריך לא תקין");
  return v;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T | null {
  const v = str(fd, key);
  if (v == null) return null;
  if (!(allowed as readonly string[]).includes(v)) throw new FieldError(key, "ערך לא תקין");
  return v as T;
}

export function many<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T[] {
  return fd
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function file(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}

export class FieldError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
  }
}

/** Wraps an action body; converts known errors into an ActionState instead of a crash. */
export async function guard<T extends { ok?: boolean; error?: string; message?: string } | undefined>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    // let Next.js redirects / notFound propagate
    if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string") throw e;
    if (e instanceof FieldError) return { error: e.message };
    if (e instanceof UploadError || e instanceof NotFoundError) return { error: e.message };
    console.error(e);
    return { error: "אירעה שגיאה בשמירה. נסו שוב." };
  }
}
