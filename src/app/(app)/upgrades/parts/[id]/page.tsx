import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getActiveVehicleDetails } from "@/server/context";
import { isUuid, vehicleDisplayName } from "@/server/repo";
import { loadPartsWithFitment, PRICE_KIND_LABEL } from "@/server/catalog";
import { Card, CardHeader, PageHeader, Badge, DemoBadge, FitmentBadge, Notice, ExternalLink, DefList } from "@/components/ui";
import { FITMENT_EXPLAIN } from "@/lib/fitment";
import { CATEGORY_LABEL } from "@/lib/labels";
import { COMPONENT_BY_KEY } from "@/lib/components";
import { formatDate, formatIlsRange } from "@/lib/units";
import { AddToPlanForm } from "./add-form";

export const metadata: Metadata = { title: "פרטי שדרוג" };

export default async function PartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { db, active, variant } = await getActiveVehicleDetails();
  const [pw] = await loadPartsWithFitment(db, {
    vehicle: active,
    variantYears: variant ? { from: variant.variant.yearFrom, to: variant.variant.yearTo } : null,
    showDemo: true,
    partIds: [id],
  });
  if (!pw) notFound();
  const { part, fit } = pw;
  const allFits = await db
    .select({ f: s.fitments, vname: s.variants.name, gname: s.generations.name, vFrom: s.variants.yearFrom, vTo: s.variants.yearTo })
    .from(s.fitments)
    .innerJoin(s.variants, eq(s.variants.id, s.fitments.variantId))
    .innerJoin(s.generations, eq(s.generations.id, s.variants.generationId))
    .where(eq(s.fitments.partId, part.id));
  const list = (xs: string[], empty: string) => (xs.length ? <ul className="list-disc ps-5 space-y-1">{xs.map((x) => <li key={x}>{x}</li>)}</ul> : <span className="text-charcoal-400 italic">{empty}</span>);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href="/upgrades/catalog" className="hover:underline">
            קטלוג שדרוגים · {CATEGORY_LABEL[part.category]}
          </Link>
        }
        title={part.nameHe}
        subtitle={
          <>
            <bdi>{part.brand}</bdi>
            {part.nameEn && (
              <>
                {" · "}
                <bdi>{part.nameEn}</bdi>
              </>
            )}
          </>
        }
        actions={part.isDemo ? <DemoBadge /> : undefined}
      />
      {part.isDemo && <Notice tone="warn">זהו פריט הדגמה — אינו מוצר אמיתי. ההתאמות והמחירים שלו בדויים ומוצגים רק להמחשת המערכת.</Notice>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="תיאור" />
            <div className="p-5 pt-3 flex flex-col gap-4 text-[15px]">
              <p>{part.description ?? "אין תיאור."}</p>
              <DefList
                rows={[
                  ["מק״ט", part.partNumber ? <span className="ltr">{part.partNumber}</span> : <span className="text-charcoal-400 italic">לא אומת — תלוי בגרסה/מידה</span>],
                  ["רכיב ברכב", COMPONENT_BY_KEY[part.componentKey]?.name ?? part.componentKey],
                  ["מורכבות התקנה", part.installComplexity ? `${part.installComplexity}/5` : <span className="text-charcoal-400 italic">לא ידוע</span>],
                  ["התקנה מקצועית", part.proInstallRecommended == null ? <span className="text-charcoal-400 italic">לא ידוע</span> : part.proInstallRecommended ? "מומלצת" : "אפשרית עצמאית למנוסים"],
                ]}
              />
            </div>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="יתרונות" as="h3" />
              <div className="p-5 pt-3 text-sm">{list(part.benefits, "לא צוינו")}</div>
            </Card>
            <Card>
              <CardHeader title="חסרונות ופשרות" as="h3" />
              <div className="p-5 pt-3 text-sm">{list(part.tradeoffs, "לא צוינו")}</div>
            </Card>
            <Card>
              <CardHeader title="השלכות תחזוקה" as="h3" />
              <div className="p-5 pt-3 text-sm">{list(part.maintenanceNotes, "לא צוינו")}</div>
            </Card>
            <Card>
              <CardHeader title="חלקים ושינויים נלווים" as="h3" />
              <div className="p-5 pt-3 text-sm">{list(part.requiredSupporting, "לא צוינו")}</div>
            </Card>
          </div>
          <Card>
            <CardHeader title="רישוי, ביטוח ואחריות" as="h3" />
            <div className="p-5 pt-3 text-sm">
              {part.legalNote ? (
                <>
                  <p>{part.legalNote}</p>
                  {part.legalSourceUrl ? (
                    <p className="text-xs mt-2">
                      מקור: <ExternalLink href={part.legalSourceUrl}>קישור</ExternalLink> · נבדק {formatDate(part.legalCheckedAt)}
                    </p>
                  ) : (
                    <Badge tone="warn" className="mt-2">
                      לא אומת מול מקור רשמי
                    </Badge>
                  )}
                </>
              ) : (
                <p className="text-charcoal-500">אין במערכת מידע מאומת על השפעה רגולטורית. אין להסיק מכך שאין השפעה.</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="התאמה לגרסאות" subtitle="התאמה נרשמת לגרסה מדויקת בלבד" as="h3" />
            <div className="p-5 pt-3">
              {allFits.length ? (
                <ul className="divide-y divide-sand-200 text-sm">
                  {allFits.map(({ f, vname, gname, vFrom, vTo }) => (
                    <li key={f.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium">
                          {gname} · {vname}
                        </span>{" "}
                        <span className="num text-xs text-charcoal-500">
                          {vFrom}–{vTo ?? "היום"}
                        </span>
                        {f.evidence && <div className="text-xs text-charcoal-500">{f.evidence}</div>}
                        {f.sourceUrl && (
                          <div className="text-xs">
                            <ExternalLink href={f.sourceUrl}>מקור</ExternalLink>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {f.verifiedAt && <span className="text-xs text-charcoal-500">{formatDate(f.verifiedAt)}</span>}
                        <FitmentBadge status={f.status} />
                        {f.isDemo && <DemoBadge />}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-500">טרם נרשמו נתוני התאמה לפריט זה. לכל רכב הוא יוצג כ״לא אומת״.</p>
              )}
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title={active ? `התאמה ל${vehicleDisplayName(active)}` : "התאמה"} as="h3" />
            <div className="p-5 pt-3 flex flex-col gap-2 text-sm">
              <FitmentBadge status={fit.status} />
              <p className="text-charcoal-600">{FITMENT_EXPLAIN[fit.status]}</p>
              {fit.warnings.map((w) => (
                <p key={w} className="text-warn-700 text-xs">
                  {w}
                </p>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="מחירים" subtitle="כל מחיר עם מקור ותאריך" as="h3" />
            <div className="p-5 pt-3">
              {pw.prices.length ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {pw.prices.map((p) => (
                    <li key={p.id} className="rounded-lg bg-sand-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{formatIlsRange(p.amountMin, p.amountMax)}</span>
                        <Badge tone={p.kind === "supplier" ? "olive" : p.kind === "owner_reported" ? "info" : "neutral"}>{PRICE_KIND_LABEL[p.kind]}</Badge>
                      </div>
                      <div className="text-xs text-charcoal-500 mt-1">
                        {p.supplierName ?? "ללא ספק"}
                        {p.supplierVerified ? " (ספק מאומת)" : ""} · {p.includesVat == null ? "מע״מ לא ידוע" : p.includesVat ? "כולל מע״מ" : "לפני מע״מ"} · {formatDate(p.observedAt)}
                        {p.availability && ` · ${p.availability}`}
                        {p.isDemo && " · הדגמה"}
                      </div>
                      {p.sourceUrl && (
                        <div className="text-xs mt-1">
                          <ExternalLink href={p.sourceUrl}>קישור לספק</ExternalLink>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-500">אין נתוני מחיר. המחיר יישאר ״לא ידוע״ בתוכנית עד שתזינו הצעה או הערכה.</p>
              )}
            </div>
          </Card>
          {active && (
            <Card>
              <CardHeader title="הוספה לתוכנית" as="h3" />
              <div className="p-5 pt-3">
                <AddToPlanForm vehicleId={active.id} partId={part.id} incompatible={fit.status === "incompatible"} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
