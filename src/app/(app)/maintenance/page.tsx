import type { Metadata } from "next";
import Link from "@/components/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getActiveVehicleDetails } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { remindersFor } from "@/server/summaries";
import { Card, CardHeader, PageHeader, LinkButton, Notice, EmptyState, TabLinks, Badge } from "@/components/ui";
import { ReminderLine, TaskKindBadge } from "@/components/domain";
import { MileageForm } from "@/components/mileage-form";
import { deleteTaskAction, addOfficialTaskAction } from "@/app/actions/maintenance";
import { formatDate, formatKm, todayIso, daysBetween } from "@/lib/units";
import { TaskForm, DoneForm } from "./client";

export const metadata: Metadata = { title: "טיפולים" };

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<{ add?: string; saved?: string }> }) {
  const { db, active, mileage, variant } = await getActiveVehicleDetails();
  if (!active) redirect("/onboarding");
  const sp = await searchParams;
  const { reminders, tasks } = await remindersFor(db, active.id, mileage);
  const official = active.variantId ? await db.select().from(s.officialServiceItems).where(eq(s.officialServiceItems.variantId, active.variantId)) : [];
  const today = todayIso();
  const inactive = tasks.filter((t) => !t.active);
  const groups = [
    { key: "overdue", label: "באיחור" },
    { key: "due_soon", label: "בקרוב (30 יום / 1,000 ק״מ)" },
    { key: "unknown", label: "חסר מידע לחישוב" },
    { key: "ok", label: "בהמשך" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={vehicleDisplayName(active)}
        title="טיפולים ובדיקות"
        subtitle="תזכורות לפי תאריך ולפי ק״מ — המוקדם מביניהם קובע. מרווחי יצרן, תזכורות שהגדרתם והמלצות בדיקה כלליות מוצגים בנפרד."
        actions={
          <>
            <LinkButton href="/maintenance/new">רישום טיפול</LinkButton>
            <LinkButton href="/maintenance/checklists" variant="secondary">
              צ׳קליסט לטיול
            </LinkButton>
          </>
        }
      />
      <TabLinks
        active="reminders"
        tabs={[
          { key: "reminders", label: "תזכורות", href: "/maintenance" },
          { key: "history", label: "היסטוריה וציר זמן", href: "/maintenance/history" },
          { key: "checklists", label: "צ׳קליסטים", href: "/maintenance/checklists" },
        ]}
      />
      {sp.saved && <Notice tone="olive">הטיפול נשמר והתזכורות המקושרות עודכנו.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="flex flex-col gap-6">
          {reminders.length === 0 && (
            <Card>
              <EmptyState title="אין תזכורות פעילות">הוסיפו תזכורת לפי ספר השירות של הרכב, או המלצת בדיקה מתוך איור הרכב.</EmptyState>
            </Card>
          )}
          {groups.map((g) => {
            const list = reminders.filter((r) => r.status === g.key);
            if (!list.length) return null;
            return (
              <section key={g.key}>
                <h2 className="text-lg font-semibold mb-3">
                  {g.label} <span className="text-sm text-charcoal-500">({list.length})</span>
                </h2>
                <ul className="flex flex-col gap-3">
                  {list.map((r) => (
                    <li key={r.task.id}>
                      <Card className="p-4 flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <ReminderLine r={r} />
                          <TaskKindBadge kind={r.task.kind} />
                        </div>
                        <div className="text-xs text-charcoal-500 flex flex-wrap gap-x-3">
                          {r.task.intervalKm && <span>כל {formatKm(r.task.intervalKm)}</span>}
                          {r.task.intervalMonths && <span>כל {r.task.intervalMonths} חודשים</span>}
                          <span>
                            בוצע לאחרונה: {r.task.lastDoneOn ? formatDate(r.task.lastDoneOn) : "לא תועד"}
                            {r.task.lastDoneKm != null && ` · ${formatKm(r.task.lastDoneKm)}`}
                          </span>
                          {tasks.find((t) => t.id === r.task.id)?.sourceRef && <span>מקור: {tasks.find((t) => t.id === r.task.id)?.sourceRef}</span>}
                        </div>
                        {tasks.find((t) => t.id === r.task.id)?.notes && <p className="text-sm text-charcoal-600">{tasks.find((t) => t.id === r.task.id)?.notes}</p>}
                        <div className="flex flex-wrap gap-2 items-start">
                          <details className="flex-1 min-w-60">
                            <summary className="cursor-pointer text-sm text-olive-700 min-h-9 inline-flex items-center">סימון כבוצע</summary>
                            <DoneForm taskId={r.task.id} today={today} km={mileage?.km ?? null} />
                          </details>
                          <details className="flex-1 min-w-60">
                            <summary className="cursor-pointer text-sm text-olive-700 min-h-9 inline-flex items-center">עריכה</summary>
                            <TaskForm vehicleId={active.id} task={tasks.find((t) => t.id === r.task.id)} />
                          </details>
                          <form action={deleteTaskAction}>
                            <input type="hidden" name="taskId" value={r.task.id} />
                            <button className="text-sm text-danger-700 hover:underline min-h-9">מחיקה</button>
                          </form>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {inactive.length > 0 && (
            <p className="text-sm text-charcoal-500">{inactive.length} משימות חד-פעמיות הושלמו ואינן מוצגות.</p>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="קילומטראז׳" as="h3" subtitle={mileage ? `${formatKm(mileage.km)} · נרשם ${formatDate(mileage.recordedOn)}` : "טרם נרשם"} />
            <div className="p-5 pt-3 flex flex-col gap-2">
              {mileage && daysBetween(mileage.recordedOn, today) > 60 && <Notice tone="warn">הקריאה האחרונה ישנה — תזכורות לפי ק״מ עלולות להיות לא מדויקות.</Notice>}
              <MileageForm vehicleId={active.id} today={today} />
              <p className="text-xs text-charcoal-500">הקילומטראז׳ אינו מתעדכן אוטומטית; הוא אינו מוערך או מוחצן לפי זמן.</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="תזכורת חדשה" as="h3" />
            <div className="p-5 pt-3">
              <details open={!!sp.add || reminders.length === 0}>
                <summary className="cursor-pointer text-sm text-olive-700 min-h-9">הוספה</summary>
                <TaskForm vehicleId={active.id} />
              </details>
            </div>
          </Card>
          <Card>
            <CardHeader title="מרווחי יצרן" as="h3" subtitle={variant ? variant.variant.name : "הרכב לא משויך לגרסה"} />
            <div className="p-5 pt-3 text-sm flex flex-col gap-3">
              {official.length ? (
                official.map((o) => (
                  <div key={o.id} className="rounded-lg bg-sand-50 p-3">
                    <div className="font-medium">{o.title}</div>
                    <div className="text-xs text-charcoal-500">
                      {o.intervalKm && `כל ${formatKm(o.intervalKm)} `}
                      {o.intervalMonths && `או ${o.intervalMonths} חודשים`} · {o.sourceDocument} · אומת {formatDate(o.verifiedAt)}
                    </div>
                    <form action={addOfficialTaskAction} className="mt-2">
                      <input type="hidden" name="vehicleId" value={active.id} />
                      <input type="hidden" name="itemId" value={o.id} />
                      <button className="text-xs text-olive-700 hover:underline min-h-9">הוספה לתזכורות</button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-charcoal-600">
                  אין במערכת לוח טיפולים מאומת ממסמך יצרן לגרסה זו. איננו ממציאים מרווחים — היעזרו בספר השירות של הרכב או ביבואן, והגדירו תזכורת משלכם.
                </p>
              )}
              <Badge tone="neutral" className="self-start">
                מרווחים מוצגים כ״רשמיים״ רק עם מסמך ותאריך אימות
              </Badge>
            </div>
          </Card>
          <Link href="/troubleshoot" className="text-sm text-olive-700 hover:underline">
            משהו לא תקין? ליומן התסמינים ←
          </Link>
        </div>
      </div>
    </div>
  );
}
