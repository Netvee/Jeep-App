import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq, isNull, or } from "drizzle-orm";
import * as s from "@/db/schema";
import { getActiveVehicleDetails } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { Card, PageHeader } from "@/components/ui";
import { ServiceForm } from "./form";
import { todayIso } from "@/lib/units";

export const metadata: Metadata = { title: "רישום טיפול" };

export default async function NewServicePage() {
  const { db, active, mileage, user } = await getActiveVehicleDetails();
  if (!active) redirect("/onboarding");
  const [tasks, workshops] = await Promise.all([
    db.select().from(s.maintenanceTasks).where(and(eq(s.maintenanceTasks.vehicleId, active.id), eq(s.maintenanceTasks.active, true))),
    db
      .select({ id: s.workshops.id, name: s.workshops.name, isDemo: s.workshops.isDemo })
      .from(s.workshops)
      .where(or(eq(s.workshops.ownerId, user.id), isNull(s.workshops.ownerId))),
  ]);
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow={vehicleDisplayName(active)} title="רישום טיפול" subtitle="מוסך, עבודה שבוצעה, חלקים ועלות. ניתן לצרף קבלה. סמנו אילו תזכורות הטיפול השלים." />
      <Card className="p-5 sm:p-7">
        <ServiceForm vehicleId={active.id} today={todayIso()} lastKm={mileage?.km ?? null} tasks={tasks.map((t) => ({ id: t.id, title: t.title }))} workshops={workshops} />
      </Card>
    </div>
  );
}
