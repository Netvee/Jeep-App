import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, isNull, or } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { PageHeader, TabLinks, Card, CardHeader, EmptyState, Badge } from "@/components/ui";
import { formatDate, formatIls, todayIso } from "@/lib/units";
import { quoteTotal, COST_KIND_LABEL } from "@/lib/costs";
import { deleteQuoteAction } from "@/app/actions/upgrades";
import { QuoteForm } from "@/app/(app)/upgrades/[id]/client";

export const metadata: Metadata = { title: "הצעות מחיר" };

export default async function QuotesPage() {
  const { db, user, active } = await getGarage();
  const [quotes, workshops] = await Promise.all([
    db
      .select({ q: s.quotes, upgradeName: s.parts.nameHe, customName: s.vehicleUpgrades.customName })
      .from(s.quotes)
      .leftJoin(s.vehicleUpgrades, eq(s.vehicleUpgrades.id, s.quotes.upgradeId))
      .leftJoin(s.parts, eq(s.parts.id, s.vehicleUpgrades.partId))
      .where(eq(s.quotes.userId, user.id))
      .orderBy(desc(s.quotes.quotedOn)),
    db.select({ id: s.workshops.id, name: s.workshops.name }).from(s.workshops).where(or(isNull(s.workshops.ownerId), eq(s.workshops.ownerId, user.id))),
  ]);
  const groups = new Map<string, typeof quotes>();
  for (const q of quotes) {
    const key = q.q.upgradeId ? `u:${q.q.upgradeId}` : `t:${q.q.title}`;
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  const today = todayIso();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="הצעות מחיר והשוואה" subtitle="הצעות לאותו שדרוג מוצגות זו לצד זו. סכום חסר בשורה מסומן — ולא נספר כאפס." />
      <TabLinks
        active="quotes"
        tabs={[
          { key: "dir", label: "מדריך מוסכים", href: "/workshops" },
          { key: "quotes", label: "הצעות מחיר והשוואה", href: "/workshops/quotes" },
        ]}
      />
      {quotes.length === 0 && (
        <Card>
          <EmptyState title="אין הצעות מחיר">הוסיפו הצעה מתוך עמוד שדרוג או בטופס כאן.</EmptyState>
        </Card>
      )}
      {[...groups.entries()].map(([key, qs]) => {
        const name = qs[0].upgradeName ?? qs[0].customName ?? qs[0].q.title;
        const totals = qs.map((x) => quoteTotal(x.q.items));
        const cheapest = Math.min(...totals.filter((t) => !t.partial).map((t) => t.total));
        return (
          <section key={key}>
            <h2 className="text-lg font-semibold mb-3">
              {qs[0].q.upgradeId ? (
                <Link href={`/upgrades/${qs[0].q.upgradeId}`} className="hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}{" "}
              <span className="text-sm text-charcoal-500 font-normal">({qs.length} הצעות)</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {qs.map(({ q }, i) => {
                const t = totals[i];
                const expired = q.validUntil && q.validUntil < today;
                return (
                  <Card key={q.id} className="p-4 flex flex-col gap-2 text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!t.partial && t.total === cheapest && qs.length > 1 && <Badge tone="olive">הזולה מבין המלאות</Badge>}
                      {t.partial && <Badge tone="warn">חסרים סכומים</Badge>}
                      {expired && <Badge tone="danger">פג תוקף</Badge>}
                      <Badge>{q.includesVat == null ? "מע״מ לא ידוע" : q.includesVat ? "כולל מע״מ" : "לפני מע״מ"}</Badge>
                    </div>
                    <p className="font-semibold">{q.workshopName ?? "ללא שם מוסך"}</p>
                    <p className="text-xs text-charcoal-500">
                      {formatDate(q.quotedOn)}
                      {q.validUntil && ` · בתוקף עד ${formatDate(q.validUntil)}`}
                    </p>
                    <ul className="grid gap-1">
                      {q.items.map((it, j) => (
                        <li key={j} className="flex justify-between gap-2">
                          <span>
                            {it.description}
                            {it.kind && <span className="text-xs text-charcoal-400"> · {COST_KIND_LABEL[it.kind]}</span>}
                          </span>
                          <span>{it.amount == null ? <span className="text-warn-700">לא צוין</span> : formatIls(it.amount)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="font-semibold border-t border-sand-200 pt-2 mt-auto">
                      סה״כ: {formatIls(t.total)}
                      {t.partial && <span className="text-warn-700 font-normal"> + לא ידוע</span>}
                    </p>
                    <form action={deleteQuoteAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <button className="text-xs text-danger-700 hover:underline min-h-9">מחיקה</button>
                    </form>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
      {active && (
        <Card>
          <CardHeader title="הצעה חדשה (לא משויכת לשדרוג)" subtitle="למשל: טיפול, תיקון" />
          <div className="p-5 pt-3">
            <QuoteForm vehicleId={active.id} workshops={workshops} today={today} />
          </div>
        </Card>
      )}
    </div>
  );
}
