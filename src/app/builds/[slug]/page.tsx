import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { getDb } from "@/db";
import { Logo } from "@/components/logo";
import { COMPONENT_BY_KEY } from "@/lib/components";
import { summarizeCosts, type CostLine } from "@/lib/costs";
import { formatIlsRange } from "@/lib/units";

export const metadata: Metadata = { title: "פרופיל בנייה" };
export const dynamic = "force-dynamic";

/**
 * Public build profile. Renders ONLY whitelisted fields: make/model/generation/year, installed
 * upgrade names, optional photo and optional costs. Never: plate, VIN, documents, mileage
 * history, trips or locations.
 */
export default async function BuildPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const [row] = await db
    .select({
      b: s.buildProfiles,
      make: s.vehicles.make,
      model: s.vehicles.model,
      generation: s.vehicles.generation,
      year: s.vehicles.year,
      photoFileId: s.vehicles.photoFileId,
      vehicleId: s.vehicles.id,
    })
    .from(s.buildProfiles)
    .innerJoin(s.vehicles, eq(s.vehicles.id, s.buildProfiles.vehicleId))
    .where(and(eq(s.buildProfiles.slug, slug), eq(s.buildProfiles.isPublic, true)));
  if (!row) notFound();
  const ups = await db
    .select({ u: s.vehicleUpgrades, name: s.parts.nameHe, brand: s.parts.brand })
    .from(s.vehicleUpgrades)
    .leftJoin(s.parts, eq(s.parts.id, s.vehicleUpgrades.partId))
    .where(and(eq(s.vehicleUpgrades.vehicleId, row.vehicleId), eq(s.vehicleUpgrades.status, "installed")));
  const costs = row.b.showCosts && ups.length ? await db.select().from(s.upgradeCosts).where(inArray(s.upgradeCosts.upgradeId, ups.map((x) => x.u.id))) : [];
  return (
    <div className="min-h-dvh">
      <header className="bg-charcoal-900 text-sand-50">
        <div className="mx-auto max-w-3xl px-4 min-h-16 flex items-center">
          <Logo />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-5">
        <h1 className="text-3xl font-bold">{row.b.title}</h1>
        <p className="text-charcoal-600">{[row.make, row.model, row.generation, row.year].filter(Boolean).join(" · ")}</p>
        {row.b.showPhoto && row.photoFileId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${row.photoFileId}`} alt={row.b.title} className="rounded-2xl w-full aspect-video object-cover" />
        )}
        {row.b.summary && <p className="whitespace-pre-wrap">{row.b.summary}</p>}
        <section className="rounded-2xl bg-white border border-sand-200 p-5">
          <h2 className="font-semibold mb-3">שדרוגים מותקנים</h2>
          <ul className="divide-y divide-sand-200">
            {ups.map(({ u, name, brand }) => {
              const sum = row.b.showCosts ? summarizeCosts(costs.filter((c) => c.upgradeId === u.id) as CostLine[]) : null;
              return (
                <li key={u.id} className="py-2 flex justify-between gap-2 text-sm">
                  <span>
                    {name ?? u.customName} {brand && <span className="text-charcoal-500">· {brand}</span>}
                    <span className="block text-xs text-charcoal-500">{COMPONENT_BY_KEY[u.componentKey]?.name}</span>
                  </span>
                  {sum && sum.anyKnown && <span className="text-charcoal-600">{formatIlsRange(sum.min, sum.max)}</span>}
                </li>
              );
            })}
            {!ups.length && <li className="text-sm text-charcoal-500 py-2">אין שדרוגים רשומים.</li>}
          </ul>
        </section>
        <p className="text-xs text-charcoal-500">פרופיל ציבורי שפורסם בהסכמת הבעלים. אינו כולל מספר רישוי, מסמכים, קילומטראז׳ או מיקומים.</p>
      </main>
    </div>
  );
}
