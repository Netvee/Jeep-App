import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { getOwnedVehicle, vehicleDisplayName } from "@/server/repo";
import { getCatalogueTree } from "@/server/catalogue-tree";
import { VehicleForm } from "@/components/vehicle-form";
import { updateVehicleAction, deleteMileageAction, removeVehiclePhotoAction } from "@/app/actions/vehicles";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { MileageForm } from "@/components/mileage-form";
import { PhotoUpload, DeleteVehicleForm } from "./client";
import { formatDate, formatKm, todayIso } from "@/lib/units";

export const metadata: Metadata = { title: "עריכת רכב" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, db } = await getGarage();
  const v = await getOwnedVehicle(db, user.id, id);
  if (!v) notFound();
  const [tree, logs] = await Promise.all([
    getCatalogueTree(db),
    db.select().from(s.mileageLogs).where(eq(s.mileageLogs.vehicleId, v.id)).orderBy(desc(s.mileageLogs.recordedOn), desc(s.mileageLogs.createdAt)),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      <div>
        <PageHeader title={`עריכה: ${vehicleDisplayName(v)}`} />
        <Card className="p-5 sm:p-7">
          <VehicleForm tree={tree} action={updateVehicleAction} mode="edit" initial={v} />
        </Card>
      </div>
      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        <Card id="photo">
          <CardHeader title="תמונת רכב" />
          <div className="p-5 pt-3 flex flex-col gap-3">
            {v.photoFileId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${v.photoFileId}`} alt="תמונת הרכב" className="rounded-xl w-full aspect-video object-cover" />
            ) : (
              <p className="text-sm text-charcoal-500">אין תמונה — מוצג איור כללי.</p>
            )}
            <PhotoUpload vehicleId={v.id} />
            {v.photoFileId && (
              <form action={removeVehiclePhotoAction}>
                <input type="hidden" name="vehicleId" value={v.id} />
                <button className="text-sm text-danger-700 underline min-h-10">הסרת תמונה (חזרה לאיור)</button>
              </form>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="היסטוריית קילומטראז׳" subtitle="קריאות שהוזנו ידנית, עם תאריך" />
          <div className="p-5 pt-3 flex flex-col gap-3">
            <MileageForm vehicleId={v.id} today={todayIso()} />
            <ul className="divide-y divide-sand-200 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 gap-2">
                  <span>
                    <span className="font-medium">{formatKm(l.km)}</span> · {formatDate(l.recordedOn)}
                    {l.note && <span className="block text-xs text-charcoal-500">{l.note}</span>}
                  </span>
                  <form action={deleteMileageAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="text-xs text-danger-700 hover:underline min-h-9 px-2" aria-label={`מחיקת קריאה ${l.km}`}>
                      מחיקה
                    </button>
                  </form>
                </li>
              ))}
              {!logs.length && <li className="py-2 text-charcoal-500">אין קריאות.</li>}
            </ul>
          </div>
        </Card>
        <Card>
          <CardHeader title="מחיקת רכב" />
          <div className="p-5 pt-3">
            <DeleteVehicleForm vehicleId={v.id} />
          </div>
        </Card>
      </div>
    </div>
  );
}
