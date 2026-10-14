import Link from "@/components/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Camera, ChevronLeft, FileText, Route, Stethoscope } from "lucide-react";
import * as s from "@/db/schema";
import { getActiveVehicleDetails } from "@/server/context";
import { listUpgrades, vehicleDisplayName } from "@/server/repo";
import { remindersFor, planTotals, PLANNED_STATUSES } from "@/server/summaries";
import { buildViewerData } from "@/server/viewer-data";
import { LazyVehicleViewer } from "@/components/vehicle/lazy-viewer";
import { VehicleSvg } from "@/components/vehicle/drawing";
import { VehiclePhoto } from "@/components/vehicle/photo";
import { Card, CardHeader, Badge, DemoBadge, LinkButton, Notice, EmptyState, Stat } from "@/components/ui";
import { ReminderLine, BudgetBar } from "@/components/domain";
import { MileageForm } from "@/components/mileage-form";
import { OfflineSnapshot } from "@/components/offline-snapshot";
import { COVERAGE_LABEL, UPGRADE_STATUS_LABEL, BODY_LABEL, TYRE_TYPE_LABEL, LOCKERS_LABEL } from "@/lib/labels";
import { COMPONENT_BY_KEY } from "@/lib/components";
import { formatDate, formatKm, todayIso, daysBetween } from "@/lib/units";
import { URGENCY_LABEL } from "@/lib/triage";

export const metadata: Metadata = { title: "הגראז׳ שלי" };

export default async function GaragePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, db, active, vehicles, variant, mileage, showDemo } = await getActiveVehicleDetails();
  if (!active) redirect("/onboarding");
  const { welcome } = await searchParams;
  const [upgrades, { reminders }, viewer, trips, symptoms, docCount] = await Promise.all([
    listUpgrades(db, user.id, active.id),
    remindersFor(db, active.id, mileage),
    buildViewerData(db, user.id, active, showDemo),
    db
      .select()
      .from(s.trips)
      .where(and(eq(s.trips.userId, user.id), eq(s.trips.vehicleId, active.id)))
      .orderBy(desc(s.trips.tripDate))
      .limit(5),
    db
      .select()
      .from(s.symptomLogs)
      .where(and(eq(s.symptomLogs.vehicleId, active.id), eq(s.symptomLogs.resolved, false)))
      .orderBy(desc(s.symptomLogs.occurredOn))
      .limit(3),
    db.$count(s.attachments, and(eq(s.attachments.userId, user.id), eq(s.attachments.vehicleId, active.id))),
  ]);
  const installed = upgrades.filter((u) => u.upgrade.status === "installed");
  const planned = upgrades.filter((u) => PLANNED_STATUSES.includes(u.upgrade.status));
  const totals = planTotals(upgrades);
  const urgent = reminders.filter((r) => r.status === "overdue" || r.status === "due_soon");
  const today = todayIso();
  const upcomingTrip = trips.find((t) => t.status === "planned" && t.tripDate && t.tripDate >= today);
  const pendingPost = trips.filter((t) => t.status === "completed" && t.tasks.some((x) => x.phase === "post" && !x.done));
  const name = vehicleDisplayName(active);

  const snapshot = {
    name,
    details: [
      ["רכב", [active.make, active.model, active.generation, active.year].filter(Boolean).join(" ") || "לא ידוע"],
      ["קילומטראז׳", mileage ? `${formatKm(mileage.km)} (${formatDate(mileage.recordedOn)})` : "לא ידוע"],
      ["צמיגים", active.tyreSize ?? "לא ידוע"],
      ["הילוך כוח", active.hasLowRange == null ? "לא ידוע" : active.hasLowRange ? "יש" : "אין"],
      ["נעילות", active.lockers ? LOCKERS_LABEL[active.lockers] : "לא ידוע"],
    ] as [string, string][],
    reminders: reminders.filter((r) => r.status !== "ok").slice(0, 8).map((r) => ({ title: r.task.title, status: r.status, reason: r.reason })),
    installed: installed.map((u) => u.part?.nameHe ?? u.upgrade.customName ?? "שדרוג"),
  };
  return (
    <div className="flex flex-col gap-6">
      <OfflineSnapshot vehicle={snapshot} />
      {welcome && (
        <Notice tone="olive" title="הרכב נוסף לגראז׳">
          הנה הגראז׳ שלכם. התחילו בהוספת שדרוגים מותקנים, טיפולים אחרונים ותזכורות.
        </Notice>
      )}
      {/* hero */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[1.2fr_1fr]">
          <div className="relative bg-gradient-to-br from-charcoal-800 to-charcoal-900 min-h-56 flex items-center justify-center">
            {active.photoFileId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${active.photoFileId}`} alt={`תמונה של ${name}`} className="absolute inset-0 size-full object-cover" />
            ) : (
              <div className="w-full px-4 py-6">
                {viewer.photoSet ? (
                  <>
                    <VehiclePhoto set={viewer.photoSet} alt={`איור להמחשה של ${name}`} className="w-full h-auto" priority />
                    <p className="text-center text-[11px] text-sand-400 mt-1">איור להמחשה — לא תמונה של הרכב</p>
                  </>
                ) : (
                  <>
                    <VehicleSvg view="side" shape={viewer.shape} overlays={{ installed: new Set(viewer.installed.map((u) => u.overlay!).filter(Boolean)), planned: new Set() }} title={`איור כללי של ${name}`} className="w-full" />
                    <p className="text-center text-[11px] text-sand-400 -mt-2">איור כללי — לא תמונה של הרכב</p>
                  </>
                )}
              </div>
            )}
            <Link href={`/garage/${active.id}/edit#photo`} className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 text-charcoal-900 text-xs font-medium px-3 min-h-9">
              <Camera size={14} /> {active.photoFileId ? "החלפת תמונה" : "הוספת תמונה"}
            </Link>
          </div>
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {active.isDemo && <DemoBadge />}
                {variant ? <Badge tone="olive">{COVERAGE_LABEL[variant.generation.coverage]}</Badge> : <Badge>לא משויך לקטלוג</Badge>}
                {vehicles.length > 1 && <Badge>{vehicles.length} רכבים בגראז׳</Badge>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{name}</h1>
              <p className="text-charcoal-600">
                {[active.make, active.model, active.generation && <span key="g" className="ltr">{active.generation}</span>, active.year, active.trim].filter(Boolean).map((x, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {x}
                  </span>
                ))}
              </p>
              {variant && <p className="text-xs text-charcoal-500 mt-1">גרסת קטלוג: {variant.variant.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="קילומטראז׳" value={mileage ? formatKm(mileage.km) : "לא ידוע"} hint={mileage ? `נרשם ${formatDate(mileage.recordedOn)}${daysBetween(mileage.recordedOn, today) > 60 ? " · מומלץ לעדכן" : ""}` : "טרם נרשם"} />
              <Stat label="צמיגים" value={active.tyreSize ? <span className="ltr">{active.tyreSize}</span> : "לא ידוע"} hint={active.tyreType ? TYRE_TYPE_LABEL[active.tyreType] : undefined} />
              <Stat label="מבנה" value={active.body ? BODY_LABEL[active.body] : "לא ידוע"} />
              <Stat label="נעילות" value={active.lockers ? LOCKERS_LABEL[active.lockers] : "לא ידוע"} hint={active.hasLowRange == null ? "הילוך כוח: לא ידוע" : active.hasLowRange ? "יש הילוך כוח" : "אין הילוך כוח"} />
            </div>
            <details className="rounded-xl border border-sand-200 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium min-h-8 flex items-center">עדכון קילומטראז׳</summary>
              <div className="mt-3">
                <MileageForm vehicleId={active.id} today={today} />
                <p className="text-xs text-charcoal-500 mt-2">אין סנכרון אוטומטי עם הרכב — הקילומטראז׳ מתעדכן רק כשאתם מזינים אותו.</p>
              </div>
            </details>
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/garage/${active.id}/edit`} variant="secondary">
                עריכת פרופיל
              </LinkButton>
              <LinkButton href="/report" variant="ghost">
                <FileText size={16} /> דוח למכונאי
              </LinkButton>
            </div>
          </div>
        </div>
      </Card>

      {/* visualizer */}
      <Card>
        <CardHeader title="הרכב שלי — רכיבים ושדרוגים" subtitle="הקישו על רכיב באיור כדי לראות תצורת יצרן, מה מותקן, מועמדים לשדרוג ובדיקות מומלצות." />
        <div className="p-5 pt-4">
          <LazyVehicleViewer data={viewer} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="שדרוגים מותקנים" action={<Link href="/upgrades?tab=installed" className="text-sm text-olive-700 hover:underline">הכול</Link>} />
          <div className="p-5 pt-3">
            {installed.length ? (
              <ul className="divide-y divide-sand-200">
                {installed.slice(0, 6).map((u) => (
                  <li key={u.upgrade.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/upgrades/${u.upgrade.id}`} className="font-medium hover:underline">
                        {u.part?.nameHe ?? u.upgrade.customName}
                      </Link>
                      <div className="text-xs text-charcoal-500">
                        {COMPONENT_BY_KEY[u.upgrade.componentKey]?.name} · {u.upgrade.installedOn ? formatDate(u.upgrade.installedOn) : "תאריך לא ידוע"}
                        {u.upgrade.installedKm != null && ` · ${formatKm(u.upgrade.installedKm)}`}
                      </div>
                    </div>
                    {u.part?.isDemo && <DemoBadge />}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="לא נרשמו שדרוגים מותקנים" action={<LinkButton href="/upgrades/new?status=installed" variant="secondary">רישום שדרוג קיים</LinkButton>} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="תוכנית שדרוגים" action={<Link href="/upgrades" className="text-sm text-olive-700 hover:underline">למתכנן</Link>} />
          <div className="p-5 pt-3 flex flex-col gap-4">
            {planned.length ? (
              <>
                <BudgetBar budget={active.budgetIls} totals={totals} />
                <ul className="flex flex-col gap-2">
                  {planned.slice(0, 4).map((u) => (
                    <li key={u.upgrade.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/upgrades/${u.upgrade.id}`} className="hover:underline truncate">
                        {u.part?.nameHe ?? u.upgrade.customName}
                      </Link>
                      <Badge tone={u.upgrade.status === "quoted" ? "info" : "neutral"}>{UPGRADE_STATUS_LABEL[u.upgrade.status]}</Badge>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState title="אין עדיין תוכנית" action={<LinkButton href="/upgrades/catalog" variant="secondary">לקטלוג השדרוגים</LinkButton>}>
                בחרו שדרוגים מהקטלוג כדי לראות התאמה, עלות כוללת ותקציב.
              </EmptyState>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="טיפולים ובדיקות" action={<Link href="/maintenance" className="text-sm text-olive-700 hover:underline">הכול</Link>} />
          <div className="p-5 pt-3">
            {reminders.length ? (
              <ul className="flex flex-col gap-3">
                {(urgent.length ? urgent : reminders).slice(0, 4).map((r) => (
                  <li key={r.task.id}>
                    <ReminderLine r={r} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="אין תזכורות" action={<LinkButton href="/maintenance?add=1" variant="secondary">הוספת תזכורת</LinkButton>}>
                הגדירו תזכורות לפי תאריך או ק״מ — מספר השירות של הרכב הוא המקור למרווחים הרשמיים.
              </EmptyState>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="מסמכים, טיולים ותסמינים" />
          <ul className="p-5 pt-3 flex flex-col gap-2">
            <li>
              <Link href="/garage/documents" className="flex items-center gap-3 rounded-xl bg-sand-50 hover:bg-sand-100 px-4 min-h-14">
                <FileText size={20} className="text-olive-600" />
                <span className="flex-1">מסמכים, קבלות ותמונות</span>
                <Badge>{docCount}</Badge>
                <ChevronLeft size={18} className="text-charcoal-400" />
              </Link>
            </li>
            <li>
              <Link href={upcomingTrip ? `/trips/${upcomingTrip.id}` : "/trips"} className="flex items-center gap-3 rounded-xl bg-sand-50 hover:bg-sand-100 px-4 min-h-14">
                <Route size={20} className="text-olive-600" />
                <span className="flex-1">
                  {upcomingTrip ? `הטיול הבא: ${upcomingTrip.title} · ${formatDate(upcomingTrip.tripDate)}` : "אין טיול מתוכנן"}
                  {pendingPost.length > 0 && <span className="block text-xs text-warn-700">בדיקות אחרי טיול ממתינות ב-{pendingPost.length} טיולים</span>}
                </span>
                <ChevronLeft size={18} className="text-charcoal-400" />
              </Link>
            </li>
            <li>
              <Link href="/troubleshoot" className="flex items-center gap-3 rounded-xl bg-sand-50 hover:bg-sand-100 px-4 min-h-14">
                <Stethoscope size={20} className="text-olive-600" />
                <span className="flex-1">
                  {symptoms.length ? `${symptoms.length} תסמינים פתוחים ביומן` : "יומן תסמינים"}
                  {symptoms[0] && <span className="block text-xs text-charcoal-500">אחרון: {URGENCY_LABEL[symptoms[0].urgency]}</span>}
                </span>
                <ChevronLeft size={18} className="text-charcoal-400" />
              </Link>
            </li>
          </ul>
        </Card>
      </div>
      <p className="text-xs text-charcoal-400">
        מספר רישוי, מסמכים והערות בעלות נשמרים כפרטיים ואינם משותפים.
      </p>
    </div>
  );
}
