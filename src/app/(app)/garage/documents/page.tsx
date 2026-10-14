import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui";
import { AttachmentList } from "@/components/attachments";
import { AttachmentUpload } from "@/components/attachment-upload";

export const metadata: Metadata = { title: "מסמכים וקבלות" };

const GROUPS: { type: (typeof s.attachments.$inferSelect)["entityType"]; label: string }[] = [
  { type: "document", label: "מסמכי רכב" },
  { type: "vehicle", label: "תמונות רכב" },
  { type: "upgrade", label: "שדרוגים — קבלות ותמונות" },
  { type: "service", label: "טיפולים — קבלות" },
  { type: "quote", label: "הצעות מחיר" },
  { type: "symptom", label: "תסמינים — תמונות והקלטות" },
];

export default async function DocumentsPage() {
  const { db, user, active } = await getGarage();
  if (!active) redirect("/onboarding");
  const rows = await db
    .select({ a: s.attachments, mime: s.files.mime, filename: s.files.filename, size: s.files.sizeBytes })
    .from(s.attachments)
    .innerJoin(s.files, eq(s.files.id, s.attachments.fileId))
    .where(and(eq(s.attachments.userId, user.id), eq(s.attachments.vehicleId, active.id)))
    .orderBy(desc(s.attachments.createdAt));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={vehicleDisplayName(active)}
        title="מסמכים, קבלות ותמונות"
        subtitle="כל הקבצים פרטיים ונגישים רק לכם. רישיון רכב, ביטוח, קבלות ותמונות — במקום אחד."
        actions={<Badge tone="dark">פרטי</Badge>}
      />
      <Card>
        <CardHeader title="העלאת מסמך" subtitle="PDF, JPEG, PNG או WebP עד 10MB" />
        <div className="p-5 pt-3">
          <AttachmentUpload vehicleId={active.id} entityType="document" entityId={active.id} />
        </div>
      </Card>
      {GROUPS.map((g) => {
        const list = rows.filter((r) => r.a.entityType === g.type);
        if (!list.length && g.type !== "document") return null;
        return (
          <section key={g.type}>
            <h2 className="text-lg font-semibold mb-3">
              {g.label} <span className="text-charcoal-400 text-sm">({list.length})</span>
            </h2>
            <AttachmentList rows={list} empty="אין עדיין מסמכים." />
          </section>
        );
      })}
    </div>
  );
}
