import type { Metadata } from "next";
import { getGarage } from "@/server/context";
import { getCatalogueTree } from "@/server/catalogue-tree";
import { VehicleForm } from "@/components/vehicle-form";
import { createVehicleAction } from "@/app/actions/vehicles";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "הוספת רכב" };

export default async function OnboardingPage() {
  const { db, vehicles } = await getGarage();
  const tree = await getCatalogueTree(db);
  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={vehicles.length ? "רכב נוסף" : "ברוכים הבאים"}
        title="הוספת רכב לגראז׳"
        subtitle="בחרו את הגרסה המדויקת מהקטלוג כדי לקבל התאמת חלקים ונתוני יצרן, או הזינו ידנית. אין צורך לנחש — ערכים לא ידועים נשארים ריקים."
      />
      <div className="rounded-2xl bg-white border border-sand-200 p-5 sm:p-7">
        <VehicleForm tree={tree} action={createVehicleAction} mode="create" />
      </div>
    </div>
  );
}
