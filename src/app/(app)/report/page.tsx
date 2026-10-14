import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { getActiveVehicleDetails } from "@/server/context";
import { listUpgrades, vehicleDisplayName } from "@/server/repo";
import { remindersFor } from "@/server/summaries";
import { BODY_LABEL, LOCKERS_LABEL, TYRE_TYPE_LABEL, PROVENANCE_LABEL } from "@/lib/labels";
import { COMPONENT_BY_KEY, SPEC_LABELS } from "@/lib/components";
import { TRIAGE_CATEGORIES, URGENCY_LABEL } from "@/lib/triage";
import { formatDate, formatIls, formatKm, todayIso } from "@/lib/units";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "דוח למכונאי" };

const SECTIONS = [
  ["spec", "מפרט הרכב"],
  ["mileage", "קילומטראז׳ נוכחי"],
  ["mods", "שדרוגים מותקנים"],
  ["history", "היסטוריית טיפולים"],
  ["reminders", "תזכורות פתוחות"],
  ["symptoms", "תסמינים פתוחים"],
  ["photos", "תמונות תסמינים"],
  ["plate", "מספר רישוי (פרטי)"],
  ["vin", "מספר שלדה (פרטי)"],
] as const;
const DEFAULT_ON = ["spec", "mileage", "mods", "history", "reminders", "symptoms", "photos"];

export default async function ReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user, active, variant, mileage } = await getActiveVehicleDetails();
  if (!active) redirect("/onboarding");
  const sp = await searchParams;
  const configured = sp.configured === "1";
  const on = (k: string) => (configured ? sp[k] === "on" : DEFAULT_ON.includes(k));
  const questions = typeof sp.questions === "string" ? sp.questions.slice(0, 3000) : "";

  const [upgrades, { reminders }, records, symptoms] = await Promise.all([
    listUpgrades(db, user.id, active.id),
    remindersFor(db, active.id, mileage),
    db.select().from(s.serviceRecords).where(eq(s.serviceRecords.vehicleId, active.id)).orderBy(desc(s.serviceRecords.performedOn)).limit(12),
    db.select().from(s.symptomLogs).where(and(eq(s.symptomLogs.vehicleId, active.id), eq(s.symptomLogs.resolved, false))).orderBy(desc(s.symptomLogs.occurredOn)),
  ]);
  const symptomPhotos =
    on("photos") && symptoms.length
      ? await db
          .select({ a: s.attachments, mime: s.files.mime })
          .from(s.attachments)
          .innerJoin(s.files, eq(s.files.id, s.attachments.fileId))
          .where(and(eq(s.attachments.userId, user.id), eq(s.attachments.entityType, "symptom"), inArray(s.attachments.entityId, symptoms.map((x) => x.id))))
      : [];
  const installed = upgrades.filter((u) => u.upgrade.status === "installed");
  const openRem = reminders.filter((r) => r.status === "overdue" || r.status === "due_soon" || r.status === "unknown");

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
      <aside className="no-print rounded-2xl bg-white border border-sand-200 p-5 lg:sticky lg:top-24">
        <h1 className="text-xl font-bold mb-1">דוח למכונאי</h1>
        <p className="text-sm text-charcoal-600 mb-4">בחרו מה לכלול. הדוח לא נשלח לאף אחד — הדפיסו או שמרו כ-PDF ושלחו בעצמכם.</p>
        <form method="get" className="flex flex-col gap-2">
          <input type="hidden" name="configured" value="1" />
          {SECTIONS.map(([k, l]) => (
            <label key={k} className="inline-flex items-center gap-2 text-sm min-h-9">
              <input type="checkbox" name={k} defaultChecked={on(k)} className="size-4 accent-olive-600" />
              {l}
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm mt-2">
            <span className="font-medium">שאלות למכונאי</span>
            <textarea name="questions" defaultValue={questions} rows={4} className="rounded-xl border border-sand-300 px-3 py-2" placeholder="שאלה בכל שורה" />
          </label>
          <button className="rounded-xl bg-charcoal-900 text-white min-h-11 mt-2">עדכון הדוח</button>
        </form>
        <PrintButton />
        <p className="text-xs text-charcoal-500 mt-2">ב״שמירה כ-PDF״ בחלון ההדפסה נוצר קובץ PDF עם עברית תקינה.</p>
      </aside>

      <article className="print-page rounded-2xl bg-white border border-sand-200 p-6 sm:p-10 text-[14px] leading-relaxed">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs text-charcoal-500">דוח רכב למכונאי · הופק {formatDate(todayIso())}</p>
            <h1 className="text-2xl font-bold">{vehicleDisplayName(active)}</h1>
            <p>{[active.make, active.model, active.generation, active.year, active.trim].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-xs text-charcoal-500 text-end">
            בעלים: {user.displayName}
            {active.isDemo && <p className="font-bold text-warn-700">רכב הדגמה — נתונים בדויים</p>}
          </div>
        </header>

        {on("spec") && (
          <Sec title="מפרט">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["גרסת קטלוג", variant ? variant.variant.name : "לא שויך"],
                  ["מנוע", active.engine],
                  ["תיבה", active.transmission],
                  ["הנעה", active.drivetrain],
                  ["מבנה", active.body ? BODY_LABEL[active.body] : null],
                  ["בסיס גלגלים", active.wheelbaseMm ? `${active.wheelbaseMm} מ״מ` : null],
                  ["צמיגים", active.tyreSize ? `${active.tyreSize}${active.tyreType ? ` · ${TYRE_TYPE_LABEL[active.tyreType]}` : ""}` : null],
                  ["חישוקים", active.wheelSpec],
                  ["מתלים", active.suspension],
                  ["הגבהה", active.liftCm != null ? `${active.liftCm} ס״מ` : null],
                  ["נעילות", active.lockers ? LOCKERS_LABEL[active.lockers] : null],
                  ...(on("plate") ? [["מספר רישוי", active.registrationPlate]] : []),
                  ...(on("vin") ? [["VIN", active.vin]] : []),
                ].map(([k, v]) => (
                  <tr key={k as string} className="border-b border-sand-200">
                    <th className="text-start py-1 w-40 font-medium text-charcoal-600">{k}</th>
                    <td className="py-1">{v ?? "לא ידוע"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {variant && variant.specs.length > 0 && (
              <p className="text-xs text-charcoal-500 mt-2">
                נתוני קטלוג: {variant.specs.map((x) => `${SPEC_LABELS[x.key] ?? x.key}: ${x.value}${x.unit ? ` ${x.unit}` : ""} (${PROVENANCE_LABEL[x.source]})`).join(" · ")}
              </p>
            )}
          </Sec>
        )}
        {on("mileage") && <Sec title="קילומטראז׳">{mileage ? `${formatKm(mileage.km)} — נרשם ידנית ב-${formatDate(mileage.recordedOn)}` : "לא נרשם"}</Sec>}
        {on("mods") && (
          <Sec title="שדרוגים ושינויים מותקנים">
            {installed.length ? (
              <ul className="list-disc ps-5">
                {installed.map((u) => (
                  <li key={u.upgrade.id}>
                    {u.part ? `${u.part.nameHe} (${u.part.brand})` : u.upgrade.customName} — {COMPONENT_BY_KEY[u.upgrade.componentKey]?.name}
                    {u.upgrade.installedOn && ` · הותקן ${formatDate(u.upgrade.installedOn)}`}
                    {u.upgrade.installedKm != null && ` · ${formatKm(u.upgrade.installedKm)}`}
                    {u.upgrade.installedBy && ` · ${u.upgrade.installedBy}`}
                  </li>
                ))}
              </ul>
            ) : (
              "לא נרשמו שדרוגים."
            )}
          </Sec>
        )}
        {on("history") && (
          <Sec title="היסטוריית טיפולים (אחרונים)">
            {records.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-charcoal-600">
                    <th className="text-start">תאריך</th>
                    <th className="text-start">ק״מ</th>
                    <th className="text-start">עבודה</th>
                    <th className="text-start">מוסך</th>
                    <th className="text-start">עלות</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-t border-sand-200 align-top">
                      <td className="py-1 whitespace-nowrap">{formatDate(r.performedOn)}</td>
                      <td className="py-1 whitespace-nowrap">{r.km != null ? formatKm(r.km) : "—"}</td>
                      <td className="py-1">
                        {r.title}
                        {r.workPerformed && <div className="text-xs text-charcoal-600">{r.workPerformed}</div>}
                      </td>
                      <td className="py-1">{r.workshopName ?? "—"}</td>
                      <td className="py-1 whitespace-nowrap">{r.costIls != null ? formatIls(r.costIls) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              "אין רשומות טיפול."
            )}
          </Sec>
        )}
        {on("reminders") && (
          <Sec title="טיפולים ובדיקות פתוחים">
            {openRem.length ? (
              <ul className="list-disc ps-5">
                {openRem.map((r) => (
                  <li key={r.task.id}>
                    {r.task.title} — {r.reason}
                  </li>
                ))}
              </ul>
            ) : (
              "אין."
            )}
          </Sec>
        )}
        {on("symptoms") && (
          <Sec title="תסמינים שדווחו (תיעוד בעלים — לא אבחנה)">
            {symptoms.length ? (
              <ul className="flex flex-col gap-2">
                {symptoms.map((x) => {
                  const cat = TRIAGE_CATEGORIES.find((c) => c.key === x.category);
                  return (
                    <li key={x.id}>
                      <strong>{cat?.label}</strong> · {formatDate(x.occurredOn)}
                      {x.km != null && ` · ${formatKm(x.km)}`} · {URGENCY_LABEL[x.urgency]}
                      {x.description && <div>{x.description}</div>}
                      <div className="text-xs text-charcoal-600">
                        {cat?.questions.map((q) => `${q.label} ${q.options.find((o) => o.value === x.answers[q.id])?.label ?? "—"}`).join(" · ")}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              "אין תסמינים פתוחים."
            )}
          </Sec>
        )}
        {on("photos") && symptomPhotos.some((p) => p.mime.startsWith("image/")) && (
          <Sec title="תמונות">
            <div className="grid grid-cols-2 gap-3">
              {symptomPhotos
                .filter((p) => p.mime.startsWith("image/") && p.mime !== "image/heic")
                .map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.a.id} src={`/api/files/${p.a.fileId}`} alt={p.a.title ?? "תמונה"} className="rounded-lg w-full" />
                ))}
            </div>
          </Sec>
        )}
        {questions && (
          <Sec title="שאלות למכונאי">
            <ol className="list-decimal ps-5">
              {questions
                .split("\n")
                .map((q) => q.trim())
                .filter(Boolean)
                .map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
            </ol>
          </Sec>
        )}
        <footer className="text-[11px] text-charcoal-500 border-t border-sand-200 pt-2 mt-6">
          הדוח מבוסס על נתונים שהבעלים הזינו. נתוני קטלוג מסומנים לפי מקורם. תסמינים הם תיעוד ולא אבחנה.
        </footer>
      </article>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid mb-6">
      <h2 className="text-lg font-bold border-b-2 border-charcoal-900 pb-1 mb-2">{title}</h2>
      {children}
    </section>
  );
}
