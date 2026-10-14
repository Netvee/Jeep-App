import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { getOwnedServiceRecord, listAttachments } from "@/server/repo";
import { Card, CardHeader, PageHeader, DefList, Val } from "@/components/ui";
import { AttachmentList } from "@/components/attachments";
import { AttachmentUpload } from "@/components/attachment-upload";
import { deleteServiceRecordAction } from "@/app/actions/maintenance";
import { formatDate, formatIls, formatKm } from "@/lib/units";

export const metadata: Metadata = { title: "טיפול" };

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await getGarage();
  const r = await getOwnedServiceRecord(db, user.id, id);
  if (!r) notFound();
  const [files, tasks] = await Promise.all([
    listAttachments(db, user.id, "service", r.id),
    r.completedTaskIds.length ? db.select().from(s.maintenanceTasks).where(inArray(s.maintenanceTasks.id, r.completedTaskIds)) : Promise.resolve([]),
  ]);
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader eyebrow={<Link href="/maintenance/history" className="hover:underline">היסטוריה</Link>} title={r.title} subtitle={formatDate(r.performedOn)} />
      <Card className="p-5">
        <DefList
          rows={[
            ["ק״מ", r.km != null ? formatKm(r.km) : <Val v={null} />],
            ["מוסך", <Val key="w" v={r.workshopName} />],
            ["עבודה שבוצעה", <Val key="wp" v={r.workPerformed} />],
            ["חלקים", <Val key="p" v={r.partsUsed} />],
            ["עלות", r.costIls != null ? `${formatIls(r.costIls)} · ${r.includesVat == null ? "מע״מ לא ידוע" : r.includesVat ? "כולל מע״מ" : "לפני מע״מ"}` : <Val v={null} />],
            ["תזכורות שהושלמו", tasks.length ? tasks.map((t) => t.title).join(", ") : "—"],
            ["הערות", <Val key="n" v={r.notes} />],
          ]}
        />
      </Card>
      <Card>
        <CardHeader title="קבלות ותמונות" />
        <div className="p-5 pt-3 flex flex-col gap-4">
          <AttachmentList rows={files} />
          <AttachmentUpload vehicleId={r.vehicleId} entityType="service" entityId={r.id} kinds={["receipt", "photo", "document"]} />
        </div>
      </Card>
      <form action={deleteServiceRecordAction}>
        <input type="hidden" name="id" value={r.id} />
        <button className="text-sm text-danger-700 hover:underline min-h-10">מחיקת רשומת הטיפול</button>
      </form>
    </div>
  );
}
