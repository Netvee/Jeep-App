import type { Metadata } from "next";
import Link from "@/components/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Wrench, Settings2, Gauge, Stethoscope, Route } from "lucide-react";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { PageHeader, TabLinks, Card, EmptyState, LinkButton, Badge } from "@/components/ui";
import { formatDate, formatIls, formatKm } from "@/lib/units";
import { URGENCY_LABEL } from "@/lib/triage";

export const metadata: Metadata = { title: "היסטוריית טיפולים" };

type Event = { date: string; kind: "service" | "upgrade" | "mileage" | "symptom" | "trip"; title: string; detail?: string; href?: string; badge?: string };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { db, user, active } = await getGarage();
  if (!active) redirect("/onboarding");
  const { show = "all" } = await searchParams;
  const [records, upgrades, miles, symptoms, trips] = await Promise.all([
    db.select().from(s.serviceRecords).where(eq(s.serviceRecords.vehicleId, active.id)),
    db.select({ u: s.vehicleUpgrades, name: s.parts.nameHe }).from(s.vehicleUpgrades).leftJoin(s.parts, eq(s.parts.id, s.vehicleUpgrades.partId)).where(and(eq(s.vehicleUpgrades.vehicleId, active.id), eq(s.vehicleUpgrades.status, "installed"))),
    db.select().from(s.mileageLogs).where(eq(s.mileageLogs.vehicleId, active.id)),
    db.select().from(s.symptomLogs).where(eq(s.symptomLogs.vehicleId, active.id)),
    db.select().from(s.trips).where(and(eq(s.trips.userId, user.id), eq(s.trips.vehicleId, active.id))),
  ]);
  let events: Event[] = [
    ...records.map((r) => ({
      date: r.performedOn,
      kind: "service" as const,
      title: r.title,
      detail: [r.workshopName, r.km != null && formatKm(r.km), r.costIls != null && formatIls(r.costIls)].filter(Boolean).join(" · "),
      href: `/maintenance/records/${r.id}`,
    })),
    ...upgrades.filter((x) => x.u.installedOn).map((x) => ({ date: x.u.installedOn!, kind: "upgrade" as const, title: `הותקן: ${x.name ?? x.u.customName}`, detail: x.u.installedKm != null ? formatKm(x.u.installedKm) : undefined, href: `/upgrades/${x.u.id}` })),
    ...miles.map((m) => ({ date: m.recordedOn, kind: "mileage" as const, title: `קריאת מד-אוץ: ${formatKm(m.km)}`, detail: m.note ?? undefined })),
    ...symptoms.map((x) => ({ date: x.occurredOn, kind: "symptom" as const, title: `תסמין: ${x.description ?? x.category}`, badge: URGENCY_LABEL[x.urgency], href: `/troubleshoot/${x.id}` })),
    ...trips.filter((t) => t.tripDate).map((t) => ({ date: t.tripDate!, kind: "trip" as const, title: `טיול: ${t.title}`, href: `/trips/${t.id}` })),
  ];
  if (show !== "all") events = events.filter((e) => e.kind === show);
  events.sort((a, b) => b.date.localeCompare(a.date));
  const icon = { service: Wrench, upgrade: Settings2, mileage: Gauge, symptom: Stethoscope, trip: Route };
  const filters = [
    ["all", "הכול"],
    ["service", "טיפולים"],
    ["upgrade", "שדרוגים"],
    ["mileage", "ק״מ"],
    ["symptom", "תסמינים"],
    ["trip", "טיולים"],
  ];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={vehicleDisplayName(active)} title="היסטוריה וציר זמן" actions={<LinkButton href="/maintenance/new">רישום טיפול</LinkButton>} />
      <TabLinks
        active="history"
        tabs={[
          { key: "reminders", label: "תזכורות", href: "/maintenance" },
          { key: "history", label: "היסטוריה וציר זמן", href: "/maintenance/history" },
          { key: "checklists", label: "צ׳קליסטים", href: "/maintenance/checklists" },
        ]}
      />
      <nav aria-label="סינון" className="flex flex-wrap gap-2">
        {filters.map(([k, l]) => (
          <Link key={k} href={`/maintenance/history?show=${k}`} aria-current={show === k ? "true" : undefined} className={`rounded-full px-3 min-h-9 inline-flex items-center text-sm border ${show === k ? "bg-charcoal-900 text-white border-charcoal-900" : "bg-white border-sand-300"}`}>
            {l}
          </Link>
        ))}
      </nav>
      {events.length === 0 ? (
        <Card>
          <EmptyState title="אין רשומות עדיין" />
        </Card>
      ) : (
        <ol className="relative border-s-2 border-sand-300 ms-3 flex flex-col gap-4">
          {events.map((e, i) => {
            const Icon = icon[e.kind];
            const body = (
              <div className="rounded-xl bg-white border border-sand-200 px-4 py-3 hover:border-olive-500">
                <div className="text-xs text-charcoal-500">{formatDate(e.date)}</div>
                <div className="font-medium flex flex-wrap items-center gap-2">
                  {e.title} {e.badge && <Badge>{e.badge}</Badge>}
                </div>
                {e.detail && <div className="text-sm text-charcoal-600">{e.detail}</div>}
              </div>
            );
            return (
              <li key={i} className="ps-6 relative">
                <span className="absolute -start-[15px] top-3 size-7 rounded-full bg-sand-50 border-2 border-sand-300 flex items-center justify-center">
                  <Icon size={14} className="text-olive-700" aria-hidden />
                </span>
                {e.href ? <Link href={e.href}>{body}</Link> : body}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
