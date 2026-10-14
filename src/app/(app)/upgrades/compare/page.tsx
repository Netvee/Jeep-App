import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getGarage } from "@/server/context";
import { loadPlan } from "@/server/plan";
import { costSummary } from "@/server/summaries";
import { COST_KINDS, COST_KIND_LABEL } from "@/lib/costs";
import { UPGRADE_STATUS_LABEL } from "@/lib/labels";
import { formatIlsRange } from "@/lib/units";
import { PageHeader, FitmentBadge, DemoBadge, Card, EmptyState, Badge } from "@/components/ui";
import { CostSummaryView } from "@/components/domain";

export const metadata: Metadata = { title: "השוואת חלופות" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  const { db, user, active } = await getGarage();
  if (!active) redirect("/onboarding");
  const { upgrades, fitByPart } = await loadPlan(db, user.id, active);
  const list = upgrades.filter((u) => u.upgrade.alternativeGroup === group && u.upgrade.status !== "removed");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={<Link href="/upgrades" className="hover:underline">שדרוגים</Link>} title={`השוואת חלופות: ${group ?? ""}`} subtitle="השוואה של התאמה, עלויות ופשרות. ״לא ידוע״ אינו אפס." />
      {list.length < 2 ? (
        <Card>
          <EmptyState title="צריך לפחות שתי חלופות באותה קבוצה">הגדירו ״קבוצת חלופות״ זהה לשני שדרוגים או יותר.</EmptyState>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-sand-100">
                <th className="text-start p-3 w-40">היבט</th>
                {list.map((u) => (
                  <th key={u.upgrade.id} className="text-start p-3 align-top">
                    <Link href={`/upgrades/${u.upgrade.id}`} className="hover:underline">
                      {u.part?.nameHe ?? u.upgrade.customName}
                    </Link>
                    <div className="font-normal text-xs text-charcoal-500">{u.part?.brand ?? "ידני"}</div>
                    {u.part?.isDemo && <DemoBadge />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              <tr>
                <th className="text-start p-3 font-medium">סטטוס</th>
                {list.map((u) => (
                  <td key={u.upgrade.id} className="p-3">
                    <Badge>{UPGRADE_STATUS_LABEL[u.upgrade.status]}</Badge>
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-start p-3 font-medium">התאמה</th>
                {list.map((u) => (
                  <td key={u.upgrade.id} className="p-3">
                    {u.part ? <FitmentBadge status={fitByPart.get(u.part.id)?.fit.status ?? "unconfirmed"} /> : "—"}
                  </td>
                ))}
              </tr>
              {COST_KINDS.map((k) => (
                <tr key={k}>
                  <th className="text-start p-3 font-medium">{COST_KIND_LABEL[k]}</th>
                  {list.map((u) => {
                    const l = u.costs.find((c) => c.kind === k);
                    return (
                      <td key={u.upgrade.id} className="p-3">
                        {!l ? <span className="text-warn-700">לא ידוע</span> : l.notApplicable ? "לא רלוונטי" : formatIlsRange(l.amountMin, l.amountMax)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-sand-50">
                <th className="text-start p-3 font-semibold">סה״כ</th>
                {list.map((u) => (
                  <td key={u.upgrade.id} className="p-3">
                    <CostSummaryView s={costSummary(u)} compact />
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-start p-3 font-medium">מורכבות התקנה</th>
                {list.map((u) => (
                  <td key={u.upgrade.id} className="p-3">
                    {u.part?.installComplexity ? `${u.part.installComplexity}/5` : "לא ידוע"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-start p-3 font-medium">יתרונות</th>
                {list.map((u) => (
                  <td key={u.upgrade.id} className="p-3 align-top">
                    {u.part?.benefits.join(" · ") || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-start p-3 font-medium">פשרות</th>
                {list.map((u) => (
                  <td key={u.upgrade.id} className="p-3 align-top">
                    {u.part?.tradeoffs.join(" · ") || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-start p-3 font-medium">נלווים נדרשים</th>
                {list.map((u) => (
                  <td key={u.upgrade.id} className="p-3 align-top">
                    {u.part?.requiredSupporting.join(" · ") || "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
