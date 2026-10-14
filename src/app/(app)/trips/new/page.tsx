import type { Metadata } from "next";
import { getGarage } from "@/server/context";
import { loadPublishedTrails } from "@/server/trails";
import { vehicleDisplayName } from "@/server/repo";
import { PageHeader, Card } from "@/components/ui";
import { TripForm } from "./form";

export const metadata: Metadata = { title: "טיול חדש" };

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ trail?: string }> }) {
  const { db, vehicles, active, showDemo } = await getGarage();
  const { trail } = await searchParams;
  const trails = await loadPublishedTrails(db, showDemo);
  return (
    <div className="max-w-2xl">
      <PageHeader title="טיול חדש" subtitle="צ׳קליסט ההכנות והבדיקות שאחרי הטיול ייבנה לפי התנאים והציוד המותקן ברכב." />
      <Card className="p-5 sm:p-7">
        <TripForm
          trails={trails.map((t) => ({ slug: t.slug, name: t.nameHe + (t.isDemo ? " (הדגמה)" : "") }))}
          vehicles={vehicles.map((v) => ({ id: v.id, name: vehicleDisplayName(v) }))}
          activeId={active?.id ?? null}
          trailSlug={trail ?? ""}
        />
      </Card>
    </div>
  );
}
