import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { getOwnedUpgrade, listAttachments, vehicleDisplayName } from "@/server/repo";
import { loadPlan } from "@/server/plan";
import { costSummary } from "@/server/summaries";
import { checkPlan } from "@/lib/plan-checks";
import { COST_KINDS, COST_KIND_LABEL, COST_SOURCE_LABEL, quoteTotal } from "@/lib/costs";
import { COMPONENT_BY_KEY } from "@/lib/components";
import { UPGRADE_STATUS_LABEL, PHASE_LABEL } from "@/lib/labels";
import { formatDate, formatIls, formatIlsRange, formatKm, todayIso } from "@/lib/units";
import { Card, CardHeader, PageHeader, Badge, DemoBadge, FitmentBadge, Notice, LinkButton } from "@/components/ui";
import { CostSummaryView } from "@/components/domain";
import { AttachmentList } from "@/components/attachments";
import { AttachmentUpload } from "@/components/attachment-upload";
import { deleteUpgradeAction, deleteQuoteAction } from "@/app/actions/upgrades";
import { CostLineEditor, InstallForm, EditUpgradeForm, QuoteForm } from "./client";

export const metadata: Metadata = { title: "שדרוג" };

export default async function UpgradeDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const { id } = await params;
  const { added } = await searchParams;
  const { db, user } = await getGarage();
  const row = await getOwnedUpgrade(db, user.id, id);
  if (!row) notFound();
  const { upgrade, vehicle, part } = row;
  const [{ items, facts, fitByPart, upgrades }, files, quotes, workshops] = await Promise.all([
    loadPlan(db, user.id, vehicle),
    listAttachments(db, user.id, "upgrade", upgrade.id),
    db.select().from(s.quotes).where(and(eq(s.quotes.userId, user.id), eq(s.quotes.upgradeId, upgrade.id))).orderBy(desc(s.quotes.quotedOn)),
    db.select({ id: s.workshops.id, name: s.workshops.name }).from(s.workshops).where(eq(s.workshops.isDemo, false)),
  ]);
  const me = upgrades.find((u) => u.upgrade.id === upgrade.id)!;
  const summary = costSummary(me);
  const checks = checkPlan(items, facts).filter((c) => c.itemId === upgrade.id);
  const fit = part ? fitByPart.get(part.id)?.fit : null;
  const name = part?.nameHe ?? upgrade.customName ?? "שדרוג";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href="/upgrades" className="hover:underline">
            שדרוגים · {vehicleDisplayName(vehicle)}
          </Link>
        }
        title={name}
        subtitle={`${part ? part.brand : "שדרוג ידני"} · ${COMPONENT_BY_KEY[upgrade.componentKey]?.name ?? upgrade.componentKey}`}
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <Badge tone={upgrade.status === "installed" ? "olive" : "neutral"}>{UPGRADE_STATUS_LABEL[upgrade.status]}</Badge>
            {upgrade.phase && <Badge>{PHASE_LABEL[upgrade.phase]}</Badge>}
            {fit && <FitmentBadge status={fit.status} />}
            {part?.isDemo && <DemoBadge />}
          </div>
        }
      />
      {added && <Notice tone="olive">נוסף לתוכנית. השלימו עלויות (או סמנו ״לא ידוע״/״לא רלוונטי״) כדי לקבל עלות כוללת אמינה.</Notice>}
      {checks.length > 0 && (
        <Notice tone={checks.some((c) => c.level === "conflict") ? "danger" : "warn"} title="לתשומת לב">
          <ul className="list-disc ps-5">
            {checks.map((c, i) => (
              <li key={i}>{c.text}</li>
            ))}
          </ul>
        </Notice>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="פירוק עלויות" subtitle="עלות שלא הוזנה נשארת ״לא ידוע״ ואינה נספרת כאפס" />
            <div className="p-5 pt-3 flex flex-col gap-3">
              {COST_KINDS.map((k) => {
                const line = me.costs.find((c) => c.kind === k);
                return (
                  <div key={k} className="rounded-xl border border-sand-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{COST_KIND_LABEL[k]}</span>
                      <span className="text-sm">
                        {!line ? (
                          <Badge tone="warn">לא ידוע</Badge>
                        ) : line.notApplicable ? (
                          <Badge>לא רלוונטי (0 ₪)</Badge>
                        ) : (
                          <span className="font-semibold">{formatIlsRange(line.amountMin, line.amountMax)}</span>
                        )}
                      </span>
                    </div>
                    {line && !line.notApplicable && (
                      <div className="text-xs text-charcoal-500 mt-1">
                        {COST_SOURCE_LABEL[line.source]} · {line.includesVat == null ? "מע״מ לא ידוע" : line.includesVat ? "כולל מע״מ" : "לפני מע״מ"} · {formatDate(line.recordedOn)}
                        {line.note && ` · ${line.note}`}
                      </div>
                    )}
                    <CostLineEditor upgradeId={upgrade.id} kind={k} line={line ?? null} today={todayIso()} />
                  </div>
                );
              })}
              <div className="rounded-xl bg-sand-100 px-4 py-3 flex items-center justify-between gap-2">
                <span className="font-semibold">סה״כ משוער להתקנה</span>
                <CostSummaryView s={summary} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="הצעות מחיר" subtitle="שמירה והשוואה. דבר לא נשלח למוסך אוטומטית." />
            <div className="p-5 pt-3 flex flex-col gap-4">
              {quotes.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {quotes.map((q) => {
                    const t = quoteTotal(q.items);
                    return (
                      <li key={q.id} className="rounded-xl border border-sand-200 p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">{q.title}</span>
                          <span className="font-semibold">
                            {formatIls(t.total)}
                            {t.partial && <span className="text-warn-700 font-normal"> + שורות ללא סכום</span>}
                          </span>
                        </div>
                        <div className="text-xs text-charcoal-500">
                          {q.workshopName ?? "ללא מוסך"} · {formatDate(q.quotedOn)}
                          {q.validUntil && ` · בתוקף עד ${formatDate(q.validUntil)}`} · {q.includesVat == null ? "מע״מ לא ידוע" : q.includesVat ? "כולל מע״מ" : "לפני מע״מ"}
                        </div>
                        <ul className="mt-2 grid gap-1">
                          {q.items.map((it, i) => (
                            <li key={i} className="flex justify-between gap-2">
                              <span>
                                {it.description}
                                {it.kind && <span className="text-xs text-charcoal-400"> ({COST_KIND_LABEL[it.kind]})</span>}
                              </span>
                              <span>{it.amount == null ? <span className="text-warn-700">לא צוין</span> : formatIls(it.amount)}</span>
                            </li>
                          ))}
                        </ul>
                        <form action={deleteQuoteAction} className="mt-2">
                          <input type="hidden" name="id" value={q.id} />
                          <button className="text-xs text-danger-700 hover:underline min-h-9">מחיקת הצעה</button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
              <details className="rounded-xl border border-dashed border-sand-400 px-4 py-3">
                <summary className="cursor-pointer font-medium min-h-8 flex items-center">הוספת הצעת מחיר</summary>
                <div className="mt-3">
                  <QuoteForm vehicleId={vehicle.id} upgradeId={upgrade.id} workshops={workshops} today={todayIso()} />
                </div>
              </details>
              {quotes.length > 1 && (
                <LinkButton href={`/workshops/quotes`} variant="secondary" className="self-start">
                  השוואת הצעות
                </LinkButton>
              )}
            </div>
          </Card>

          <Card id="files">
            <CardHeader title="תמונות, קבלות והערות" />
            <div className="p-5 pt-3 flex flex-col gap-4">
              <AttachmentList rows={files} />
              <AttachmentUpload vehicleId={vehicle.id} entityType="upgrade" entityId={upgrade.id} kinds={["photo", "receipt", "document"]} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          {upgrade.status === "installed" ? (
            <Card>
              <CardHeader title="מותקן ברכב" as="h3" />
              <div className="p-5 pt-3 text-sm flex flex-col gap-1">
                <p>תאריך: {formatDate(upgrade.installedOn)}</p>
                <p>קילומטראז׳: {upgrade.installedKm != null ? formatKm(upgrade.installedKm) : "לא ידוע"}</p>
                <p>הותקן על ידי: {upgrade.installedBy ?? "לא ידוע"}</p>
                <Link href="/garage" className="text-olive-700 hover:underline mt-2">
                  לצפייה באיור הרכב ←
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="סימון כמותקן" subtitle="מעביר לרשומת הרכב עם תאריך וק״מ" as="h3" />
              <div className="p-5 pt-3">
                <InstallForm upgradeId={upgrade.id} today={todayIso()} canApplyToProfile={!!(part?.liftCm || part?.tyreSize)} />
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="פרטים" as="h3" />
            <div className="p-5 pt-3">
              <EditUpgradeForm upgrade={upgrade} isCustom={!part} />
            </div>
          </Card>
          {part && (
            <LinkButton href={`/upgrades/parts/${part.id}`} variant="secondary">
              פרטי הפריט בקטלוג
            </LinkButton>
          )}
          <form action={deleteUpgradeAction}>
            <input type="hidden" name="upgradeId" value={upgrade.id} />
            <button className="text-sm text-danger-700 hover:underline min-h-10">מחיקת השדרוג</button>
          </form>
        </div>
      </div>
    </div>
  );
}
