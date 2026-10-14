import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { getOwnedTrip } from "@/server/repo";
import { PageHeader, Card, CardHeader, Badge, DemoBadge, Notice, LinkButton, buttonClass } from "@/components/ui";
import { formatDate } from "@/lib/units";
import { CONDITION_LABEL } from "@/lib/checklists";
import { toggleTripTaskAction, shareTripAction, deleteTripAction, postTasksToMaintenanceAction } from "@/app/actions/trips";
import { AddTaskForm, CompleteTripForm, EditTripForm, CopyLink } from "./client";
import { MyLocation } from "@/components/my-location";

export const metadata: Metadata = { title: "טיול" };

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await getGarage();
  const trip = await getOwnedTrip(db, user.id, id);
  if (!trip) notFound();
  const [trail] = trip.trailId ? await db.select().from(s.trails).where(eq(s.trails.id, trip.trailId)) : [];
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const pre = trip.tasks.filter((t) => t.phase === "pre");
  const post = trip.tasks.filter((t) => t.phase === "post");
  const TaskList = (list: typeof pre) => (
    <ul className="flex flex-col">
      {list.map((t) => (
        <li key={t.id}>
          <form action={toggleTripTaskAction}>
            <input type="hidden" name="tripId" value={trip.id} />
            <input type="hidden" name="taskId" value={t.id} />
            <button className="w-full flex items-start gap-3 min-h-11 py-1.5 text-start" aria-pressed={t.done}>
              <span aria-hidden className={`mt-0.5 size-5 rounded border-2 flex items-center justify-center shrink-0 ${t.done ? "bg-olive-600 border-olive-600 text-white" : "border-sand-400"}`}>
                {t.done ? "✓" : ""}
              </span>
              <span className={t.done ? "line-through text-charcoal-400" : ""}>{t.title}</span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/trips" className="hover:underline">טיולים</Link>}
        title={trip.title}
        subtitle={[formatDate(trip.tripDate), trip.meetingTime && `מפגש ${trip.meetingTime}`].filter(Boolean).join(" · ")}
        actions={<Badge tone={trip.status === "completed" ? "olive" : "neutral"}>{trip.status === "completed" ? "הושלם" : "מתוכנן"}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="flex flex-col gap-6">
          {trail && (
            <Card className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-charcoal-500">מסלול</p>
                <Link href={`/trails/${trail.slug}`} className="font-semibold hover:underline">
                  {trail.nameHe}
                </Link>{" "}
                {trail.isDemo && <DemoBadge />}
              </div>
              <LinkButton href={`/trails/${trail.slug}`} variant="secondary">
                מפה ופרטים
              </LinkButton>
            </Card>
          )}
          {trip.conditions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trip.conditions.map((c) => (
                <Badge key={c}>{CONDITION_LABEL[c as keyof typeof CONDITION_LABEL] ?? c}</Badge>
              ))}
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title={`הכנות (${pre.filter((t) => t.done).length}/${pre.length})`} as="h3" />
              <div className="p-5 pt-2">
                {TaskList(pre)}
                <AddTaskForm tripId={trip.id} phase="pre" />
              </div>
            </Card>
            <Card>
              <CardHeader title={`אחרי הטיול (${post.filter((t) => t.done).length}/${post.length})`} as="h3" subtitle="בדיקות לפי התנאים בפועל" />
              <div className="p-5 pt-2">
                {TaskList(post)}
                <AddTaskForm tripId={trip.id} phase="post" />
                {trip.vehicleId && post.some((t) => !t.done) && (
                  <form action={postTasksToMaintenanceAction} className="mt-3">
                    <input type="hidden" name="tripId" value={trip.id} />
                    <button className={buttonClass("secondary", "w-full")}>העברת הבדיקות הפתוחות לתזכורות טיפולים</button>
                  </form>
                )}
              </div>
            </Card>
          </div>
          {trip.notes && (
            <Card className="p-5">
              <p className="whitespace-pre-wrap">{trip.notes}</p>
            </Card>
          )}
          <MyLocation />
        </div>
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="נקודת מפגש" as="h3" />
            <div className="p-5 pt-3 text-sm flex flex-col gap-2">
              <p>{trip.meetingPointLabel ?? "לא הוגדרה"}</p>
              {trip.meetingLat != null && trip.meetingLng != null && (
                <>
                  <p className="num font-mono select-all">
                    {trip.meetingLat.toFixed(5)}, {trip.meetingLng.toFixed(5)}
                  </p>
                  <CopyLink text={`${trip.meetingLat.toFixed(5)}, ${trip.meetingLng.toFixed(5)}`} label="העתקת קואורדינטות" />
                </>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="שיתוף לקריאה בלבד" as="h3" />
            <div className="p-5 pt-3 text-sm flex flex-col gap-3">
              {trip.shareToken ? (
                <>
                  <p>כל מי שיש לו את הקישור יכול לראות: שם, תאריך, נקודת מפגש, מסלול ורשימת ההכנות. פרטי הרכב, המסמכים והמיקום שלכם אינם משותפים.</p>
                  <CopyLink text={`${origin}/share/trip/${trip.shareToken}`} label="העתקת קישור" />
                  <form action={shareTripAction}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <button className={buttonClass("danger", "w-full")}>ביטול השיתוף</button>
                  </form>
                </>
              ) : (
                <>
                  <p>הטיול פרטי. יצירת קישור היא פעולה מפורשת שניתן לבטל בכל עת.</p>
                  <form action={shareTripAction}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <button className={buttonClass("primary", "w-full")}>יצירת קישור שיתוף</button>
                  </form>
                </>
              )}
            </div>
          </Card>
          {trip.status !== "completed" && (
            <Card>
              <CardHeader title="סיום טיול" as="h3" />
              <div className="p-5 pt-3">
                <CompleteTripForm tripId={trip.id} />
              </div>
            </Card>
          )}
          <details className="rounded-2xl border border-sand-200 bg-white p-5">
            <summary className="cursor-pointer font-medium">עריכת פרטים</summary>
            <EditTripForm trip={trip} />
          </details>
          {trip.status === "completed" && post.some((t) => !t.done) && <Notice tone="warn">נותרו בדיקות אחרי הטיול שלא סומנו.</Notice>}
          <form action={deleteTripAction}>
            <input type="hidden" name="tripId" value={trip.id} />
            <button className="text-sm text-danger-700 hover:underline min-h-10">מחיקת הטיול</button>
          </form>
        </div>
      </div>
    </div>
  );
}
