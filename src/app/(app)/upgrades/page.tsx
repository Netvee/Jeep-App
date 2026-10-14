import Link from "@/components/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, Info, Lightbulb, XCircle } from "lucide-react";
import { getActiveVehicleDetails } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { loadPlan } from "@/server/plan";
import { remindersFor, costSummary, planTotals, PLANNED_STATUSES } from "@/server/summaries";
import { checkPlan, recommend } from "@/lib/plan-checks";
import { PHASE_LABEL, PHASE_HINT, UPGRADE_STATUS_LABEL } from "@/lib/labels";
import { COMPONENT_BY_KEY } from "@/lib/components";
import { formatDate, formatKm } from "@/lib/units";
import { Card, CardHeader, PageHeader, LinkButton, Badge, DemoBadge, FitmentBadge, EmptyState, TabLinks } from "@/components/ui";
import { BudgetBar, CostSummaryView, TotalText } from "@/components/domain";
import { BudgetForm } from "./budget-form";
import type { UpgradePhase } from "@/db/schema";

export const metadata: Metadata = { title: "שדרוגים" };

export default async function UpgradesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { user, db, active, mileage } = await getActiveVehicleDetails();
  if (!active) redirect("/onboarding");
  const { tab = "plan" } = await searchParams;
  const [{ upgrades, items, facts, fitByPart }, { reminders }] = await Promise.all([loadPlan(db, user.id, active), remindersFor(db, active.id, mileage)]);
  const checks = checkPlan(items, facts);
  const recs = recommend(items, facts, reminders.filter((r) => r.status === "overdue").length);
  const totals = planTotals(upgrades);
  const planned = upgrades.filter((u) => PLANNED_STATUSES.includes(u.upgrade.status));
  const installed = upgrades.filter((u) => u.upgrade.status === "installed");
  const purchasedTotal = planTotals(upgrades, ["purchased"]);
  const phases: (UpgradePhase | null)[] = ["essential", "protection", "capability", "comfort", null];
  const groups = [...new Set(planned.map((u) => u.upgrade.alternativeGroup).filter(Boolean))] as string[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={vehicleDisplayName(active)}
        title="שדרוגים"
        subtitle="תכננו לפי שלבים, השוו חלופות וראו עלות כוללת — עלויות לא ידועות נשארות גלויות ואינן נספרות כאפס."
        actions={
          <>
            <LinkButton href="/upgrades/catalog">קטלוג שדרוגים</LinkButton>
            <LinkButton href="/upgrades/new" variant="secondary">
              שדרוג ידני
            </LinkButton>
          </>
        }
      />
      <TabLinks
        active={tab}
        tabs={[
          { key: "plan", label: `תוכנית (${planned.length})`, href: "/upgrades" },
          { key: "installed", label: `מותקנים (${installed.length})`, href: "/upgrades?tab=installed" },
        ]}
      />

      {tab === "installed" ? (
        <Card>
          <CardHeader title="שדרוגים מותקנים ברכב" subtitle="מופיעים גם באיור הרכב ובפאנל הרכיב המתאים" />
          <div className="p-5 pt-3">
            {installed.length ? (
              <ul className="divide-y divide-sand-200">
                {installed.map((u) => (
                  <li key={u.upgrade.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link href={`/upgrades/${u.upgrade.id}`} className="font-medium hover:underline">
                        {u.part?.nameHe ?? u.upgrade.customName}
                      </Link>{" "}
                      {u.part?.isDemo && <DemoBadge />}
                      <div className="text-xs text-charcoal-500">
                        {COMPONENT_BY_KEY[u.upgrade.componentKey]?.name} · הותקן {u.upgrade.installedOn ? formatDate(u.upgrade.installedOn) : "בתאריך לא ידוע"}
                        {u.upgrade.installedKm != null && ` · ${formatKm(u.upgrade.installedKm)}`}
                        {u.upgrade.installedBy && ` · ${u.upgrade.installedBy}`}
                      </div>
                    </div>
                    <CostSummaryView s={costSummary(u)} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="לא נרשמו שדרוגים מותקנים" action={<LinkButton href="/upgrades/new?status=installed">רישום שדרוג קיים</LinkButton>} />
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
            <Card>
              <CardHeader title="תקציב ועלות כוללת" subtitle="סכום הטווחים הידועים של שדרוגים שטרם נרכשו" />
              <div className="p-5 pt-3 flex flex-col gap-4">
                <BudgetBar budget={active.budgetIls} totals={totals} />
                {purchasedTotal.upgradesCount > 0 && (
                  <p className="text-xs text-charcoal-500">
                    בנוסף: {purchasedTotal.upgradesCount} פריטים שנרכשו וממתינים להתקנה (<TotalText t={purchasedTotal} />).
                  </p>
                )}
                <BudgetForm vehicleId={active.id} budget={active.budgetIls} />
              </div>
            </Card>
            <Card>
              <CardHeader title="מה כדאי לשקול" subtitle="לפי השימוש והתצורה שהוזנו" />
              <ul className="p-5 pt-3 flex flex-col gap-3">
                {recs.length ? (
                  recs.map((r) => (
                    <li key={r.title} className="flex gap-3">
                      <Lightbulb size={18} className={r.kind === "upgrade" ? "text-olive-600 shrink-0 mt-0.5" : "text-ember-600 shrink-0 mt-0.5"} aria-hidden />
                      <div className="text-sm">
                        <Link href={r.href} className="font-medium hover:underline">
                          {r.title}
                        </Link>
                        <p className="text-charcoal-600">{r.why}</p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-charcoal-500">אין המלצות כרגע. עדכנו את ״למה הרכב משמש״ בפרופיל לקבלת המלצות.</li>
                )}
              </ul>
            </Card>
          </div>

          {checks.filter((c) => c.level !== "info").length > 0 && (
            <Card>
              <CardHeader title="תלויות והתנגשויות" />
              <ul className="p-5 pt-3 flex flex-col gap-2 text-sm">
                {checks
                  .filter((c) => c.level !== "info")
                  .map((c, i) => (
                    <li key={i} className="flex gap-2">
                      {c.level === "conflict" ? <XCircle size={18} className="text-danger-700 shrink-0" /> : <AlertTriangle size={18} className="text-warn-700 shrink-0" />}
                      {c.itemId ? (
                        <Link href={`/upgrades/${c.itemId}`} className="hover:underline">
                          {c.text}
                        </Link>
                      ) : (
                        c.text
                      )}
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-charcoal-600">השוואת חלופות:</span>
              {groups.map((g) => (
                <LinkButton key={g} href={`/upgrades/compare?group=${encodeURIComponent(g)}`} variant="secondary" className="min-h-9 text-sm">
                  {g}
                </LinkButton>
              ))}
            </div>
          )}

          {planned.length === 0 && (
            <Card>
              <EmptyState title="התוכנית ריקה" action={<LinkButton href="/upgrades/catalog">בחירה מהקטלוג</LinkButton>}>
                הוסיפו שדרוגים מהקטלוג (עם התאמה לגרסה) או שדרוג ידני, וחלקו אותם לשלבים.
              </EmptyState>
            </Card>
          )}

          {phases.map((ph) => {
            const list = planned.filter((u) => (u.upgrade.phase ?? null) === ph);
            if (!list.length) return null;
            const t = planTotals(list, ["wishlist", "planned", "quoted", "purchased"]);
            return (
              <section key={ph ?? "none"}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h2 className="text-lg font-semibold">
                    {ph ? PHASE_LABEL[ph] : "ללא שלב"} <span className="text-sm text-charcoal-500 font-normal">{ph ? `· ${PHASE_HINT[ph]}` : ""}</span>
                  </h2>
                  <span className="text-sm text-charcoal-600">
                    <TotalText t={t} />
                  </span>
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((u) => {
                    const fit = u.part ? fitByPart.get(u.part.id)?.fit.status : null;
                    const itemChecks = checks.filter((c) => c.itemId === u.upgrade.id && c.level !== "info");
                    return (
                      <li key={u.upgrade.id}>
                        <Card className="p-4 h-full flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link href={`/upgrades/${u.upgrade.id}`} className="font-semibold hover:underline">
                                {u.part?.nameHe ?? u.upgrade.customName}
                              </Link>
                              <div className="text-xs text-charcoal-500">
                                {u.part ? u.part.brand : "שדרוג ידני"} · {COMPONENT_BY_KEY[u.upgrade.componentKey]?.name} · עדיפות {u.upgrade.priority}
                              </div>
                            </div>
                            <Badge tone={u.upgrade.status === "quoted" ? "info" : u.upgrade.status === "purchased" ? "olive" : "neutral"}>{UPGRADE_STATUS_LABEL[u.upgrade.status]}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {fit && <FitmentBadge status={fit} />}
                            {u.part?.isDemo && <DemoBadge />}
                            {u.upgrade.alternativeGroup && <Badge tone="info">חלופה: {u.upgrade.alternativeGroup}</Badge>}
                          </div>
                          {u.upgrade.reason && <p className="text-sm text-charcoal-600">{u.upgrade.reason}</p>}
                          <div className="mt-auto pt-2 border-t border-sand-200">
                            <CostSummaryView s={costSummary(u)} />
                          </div>
                          {itemChecks.map((c, i) => (
                            <p key={i} className="text-xs text-warn-700 flex gap-1">
                              <Info size={14} className="shrink-0" /> {c.text}
                            </p>
                          ))}
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
