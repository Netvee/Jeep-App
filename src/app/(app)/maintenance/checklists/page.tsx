import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { PageHeader, TabLinks, Notice } from "@/components/ui";
import { ChecklistBuilder } from "./builder";

export const metadata: Metadata = { title: "צ׳קליסטים לטיול" };

export default async function ChecklistsPage() {
  const { db, active } = await getGarage();
  if (!active) redirect("/onboarding");
  const installed = await db
    .select({ overlay: s.parts.overlay, component: s.vehicleUpgrades.componentKey })
    .from(s.vehicleUpgrades)
    .leftJoin(s.parts, eq(s.parts.id, s.vehicleUpgrades.partId))
    .where(and(eq(s.vehicleUpgrades.vehicleId, active.id), eq(s.vehicleUpgrades.status, "installed")));
  const equipment = {
    snorkel: installed.some((i) => i.overlay === "snorkel" || i.component === "air_intake"),
    winch: installed.some((i) => i.overlay === "winch"),
    lockers: active.lockers === "rear" || active.lockers === "front_rear" || installed.some((i) => i.overlay === "locker"),
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={vehicleDisplayName(active)} title="צ׳קליסטים לפני ואחרי טיול" subtitle="בחרו את תנאי הטיול. פריטים לפי ציוד מותקן (שנורקל, כננת, נעילות) מתווספים רק אם הם קיימים ברכב." />
      <TabLinks
        active="checklists"
        tabs={[
          { key: "reminders", label: "תזכורות", href: "/maintenance" },
          { key: "history", label: "היסטוריה וציר זמן", href: "/maintenance/history" },
          { key: "checklists", label: "צ׳קליסטים", href: "/maintenance/checklists" },
        ]}
      />
      <Notice tone="info">אלה המלצות הכנה ובדיקה כלליות — לא דרישות יצרן. לכל טיול שמור יש צ׳קליסט משלו בעמוד הטיול.</Notice>
      <ChecklistBuilder equipment={equipment} vehicleName={vehicleDisplayName(active)} />
    </div>
  );
}
