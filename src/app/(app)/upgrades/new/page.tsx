import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getGarage } from "@/server/context";
import { Card, PageHeader } from "@/components/ui";
import { NewUpgradeForm } from "./form";
import { todayIso } from "@/lib/units";

export const metadata: Metadata = { title: "שדרוג ידני" };

export default async function NewUpgradePage({ searchParams }: { searchParams: Promise<{ status?: string; name?: string; component?: string; phase?: string }> }) {
  const { active } = await getGarage();
  if (!active) redirect("/onboarding");
  const sp = await searchParams;
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={sp.status === "installed" ? "רישום שדרוג מותקן" : "שדרוג ידני"}
        subtitle="לשדרוג שאינו בקטלוג, להדרכה, או לרישום שדרוג שכבר הותקן. התאמה לגרסה לא תחושב לפריט ידני."
      />
      <Card className="p-5 sm:p-7">
        <NewUpgradeForm vehicleId={active.id} today={todayIso()} defaults={{ status: sp.status, name: sp.name, component: sp.component, phase: sp.phase }} />
      </Card>
    </div>
  );
}
