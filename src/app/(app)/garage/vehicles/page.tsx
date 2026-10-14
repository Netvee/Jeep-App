import Link from "@/components/link";
import type { Metadata } from "next";
import { getGarage } from "@/server/context";
import { latestMileage, vehicleDisplayName } from "@/server/repo";
import { setActiveVehicleAction } from "@/app/actions/vehicles";
import { Card, PageHeader, LinkButton, Badge, DemoBadge, buttonClass } from "@/components/ui";
import { formatKm, formatDate } from "@/lib/units";

export const metadata: Metadata = { title: "הרכבים שלי" };

export default async function VehiclesPage() {
  const { db, vehicles, active } = await getGarage();
  const rows = await Promise.all(vehicles.map(async (v) => ({ v, m: await latestMileage(db, v.id) })));
  return (
    <div>
      <PageHeader title="הרכבים שלי" subtitle="בחרו רכב פעיל — כל המסכים (שדרוגים, טיפולים, מסלולים) מתייחסים לרכב הפעיל." actions={<LinkButton href="/onboarding">הוספת רכב</LinkButton>} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ v, m }) => (
          <li key={v.id}>
            <Card className="p-5 h-full flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {v.id === active?.id && <Badge tone="olive">פעיל</Badge>}
                {v.isDemo && <DemoBadge />}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{vehicleDisplayName(v)}</h2>
                <p className="text-sm text-charcoal-500">{[v.make, v.model, v.generation, v.year].filter(Boolean).join(" · ") || "פרטים לא הוזנו"}</p>
                <p className="text-sm mt-1">{m ? `${formatKm(m.km)} · ${formatDate(m.recordedOn)}` : "קילומטראז׳ לא ידוע"}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                {v.id !== active?.id && (
                  <form action={setActiveVehicleAction.bind(null, v.id)}>
                    <button className={buttonClass("primary")}>הפוך לפעיל</button>
                  </form>
                )}
                <Link href={`/garage/${v.id}/edit`} className={buttonClass("secondary")}>
                  עריכה
                </Link>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
