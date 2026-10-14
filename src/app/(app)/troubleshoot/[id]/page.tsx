import type { Metadata } from "next";
import Link from "@/components/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { isUuid, listAttachments } from "@/server/repo";
import { PageHeader, Card, CardHeader, Badge, Notice, LinkButton } from "@/components/ui";
import { AttachmentList } from "@/components/attachments";
import { AttachmentUpload } from "@/components/attachment-upload";
import { toggleSymptomResolvedAction } from "@/app/actions/maintenance";
import { TRIAGE_CATEGORIES, URGENCY_LABEL, triage } from "@/lib/triage";
import { formatDate, formatKm } from "@/lib/units";

export const metadata: Metadata = { title: "תסמין" };

export default async function SymptomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { db, user } = await getGarage();
  const [row] = await db
    .select({ log: s.symptomLogs })
    .from(s.symptomLogs)
    .innerJoin(s.vehicles, eq(s.vehicles.id, s.symptomLogs.vehicleId))
    .where(and(eq(s.symptomLogs.id, id), eq(s.vehicles.userId, user.id)));
  if (!row) notFound();
  const l = row.log;
  const cat = TRIAGE_CATEGORIES.find((c) => c.key === l.category);
  const result = triage(l.category, l.answers);
  const files = await listAttachments(db, user.id, "symptom", l.id);
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader
        eyebrow={<Link href="/troubleshoot" className="hover:underline">יומן תסמינים</Link>}
        title={cat?.label ?? l.category}
        subtitle={`${formatDate(l.occurredOn)}${l.km != null ? ` · ${formatKm(l.km)}` : ""}`}
        actions={<Badge tone={l.resolved ? "olive" : l.urgency === "stop" ? "danger" : "warn"}>{l.resolved ? "טופל" : URGENCY_LABEL[l.urgency]}</Badge>}
      />
      {l.urgency === "stop" && !l.resolved && <Notice tone="danger" title="סומן כמצריך עצירה">{result.headline}</Notice>}
      <Card className="p-5 flex flex-col gap-3 text-sm">
        {l.description && <p className="text-[15px]">{l.description}</p>}
        <ul className="grid gap-1">
          {cat?.questions.map((q) => (
            <li key={q.id}>
              <span className="text-charcoal-500">{q.label} </span>
              {q.options.find((o) => o.value === l.answers[q.id])?.label ?? "לא נענה"}
            </li>
          ))}
        </ul>
        <div className="rounded-xl bg-sand-50 p-4">
          <p className="font-semibold">{result.headline}</p>
          {result.possibleCauses.length > 0 && <p className="mt-1">הסברים אפשריים (לא אבחנה): {result.possibleCauses.join("; ")}</p>}
        </div>
      </Card>
      <Card>
        <CardHeader title="תמונות והקלטות למכונאי" subtitle="לא מנותחות על ידי המערכת" />
        <div className="p-5 pt-3 flex flex-col gap-4">
          <AttachmentList rows={files} />
          <AttachmentUpload vehicleId={l.vehicleId} entityType="symptom" entityId={l.id} kinds={["photo", "audio", "video"]} />
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        <form action={toggleSymptomResolvedAction}>
          <input type="hidden" name="id" value={l.id} />
          <button className="rounded-xl border border-sand-300 bg-white px-4 min-h-11 font-medium">{l.resolved ? "סימון כפתוח" : "סימון כטופל"}</button>
        </form>
        <LinkButton href="/report" variant="secondary">
          הוספה לדוח למכונאי
        </LinkButton>
      </div>
    </div>
  );
}
