import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getActiveVehicleDetails } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { PageHeader, Card, CardHeader, Notice, Badge, EmptyState } from "@/components/ui";
import { TRIAGE_CATEGORIES, URGENCY_LABEL } from "@/lib/triage";
import { formatDate, todayIso } from "@/lib/units";
import { TriageFlow } from "./flow";

export const metadata: Metadata = { title: "אבחון תסמינים" };

export default async function TroubleshootPage() {
  const { db, active, mileage } = await getActiveVehicleDetails();
  if (!active) redirect("/onboarding");
  const logs = await db.select().from(s.symptomLogs).where(eq(s.symptomLogs.vehicleId, active.id)).orderBy(desc(s.symptomLogs.occurredOn));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={vehicleDisplayName(active)}
        title="יומן תסמינים ומיון ראשוני"
        subtitle="תיעוד מסודר של נורות, רעשים, נזילות ותקלות — עם שאלות המשך והמלצה על הצעד הבא. זה אינו אבחון."
      />
      <Notice tone="warn" title="חשוב">
        המערכת אינה מאבחנת תקלות מרחוק ואינה מנתחת תמונות או הקלטות — הקבצים נשמרים כדי להציג למכונאי. אם יש עשן, ריח דלק, אובדן בלימה או סכנה מיידית — עצרו במקום בטוח והזעיקו
        עזרה. אין לנטרל מערכות בטיחות.
      </Notice>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <Card className="p-5 sm:p-6">
          <TriageFlow vehicleId={active.id} categories={TRIAGE_CATEGORIES} today={todayIso()} lastKm={mileage?.km ?? null} />
        </Card>
        <Card>
          <CardHeader title="היומן" as="h2" />
          <div className="p-5 pt-3">
            {logs.length ? (
              <ul className="flex flex-col gap-2">
                {logs.map((l) => (
                  <li key={l.id}>
                    <Link href={`/troubleshoot/${l.id}`} className="block rounded-xl bg-sand-50 hover:bg-sand-100 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{TRIAGE_CATEGORIES.find((c) => c.key === l.category)?.label}</span>
                        <Badge tone={l.resolved ? "olive" : l.urgency === "stop" ? "danger" : l.urgency === "workshop" ? "warn" : "neutral"}>{l.resolved ? "טופל" : URGENCY_LABEL[l.urgency]}</Badge>
                      </div>
                      <div className="text-xs text-charcoal-500 mt-0.5 line-clamp-2">
                        {formatDate(l.occurredOn)}
                        {l.description && ` · ${l.description}`}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="אין תסמינים ביומן" />
            )}
          </div>
        </Card>
      </div>
      <Card className="p-5 text-sm text-charcoal-600">
        <h2 className="font-semibold text-charcoal-900 mb-1">אבחון OBD-II</h2>
        אין כרגע חיבור לקורא OBD-II. דפדפנים אינם יכולים להתחבר לכל מתאם, ולכן לא נציג נתונים חיים עד שתיתמך התקנה מוגדרת (למשל מתאם BLE מסוים דרך Web Bluetooth, בדפדפנים התומכים בכך).
        בינתיים — רשמו כאן קודי תקלה שקיבלתם מהמוסך או מקורא עצמאי.
      </Card>
    </div>
  );
}
