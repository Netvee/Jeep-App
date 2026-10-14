import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { getGarage } from "@/server/context";
import { Card, PageHeader, Badge, ProvenanceBadge, Notice, LinkButton, ExternalLink } from "@/components/ui";
import { VehicleSvg } from "@/components/vehicle/drawing";
import { buildShape } from "@/lib/vehicle-shape";
import { ARCHETYPES } from "@/components/vehicle/geometry";
import { SPEC_LABELS } from "@/lib/components";
import { BODY_LABEL, COVERAGE_LABEL, COVERAGE_HINT } from "@/lib/labels";
import { formatDate } from "@/lib/units";

export const metadata: Metadata = { title: "דור בקטלוג" };

export default async function GenerationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db } = await getGarage();
  const [row] = await db
    .select({ gen: s.generations, model: s.models, make: s.makes })
    .from(s.generations)
    .innerJoin(s.models, eq(s.models.id, s.generations.modelId))
    .innerJoin(s.makes, eq(s.makes.id, s.models.makeId))
    .where(eq(s.generations.slug, slug));
  if (!row) notFound();
  const variants = await db.select().from(s.variants).where(eq(s.variants.generationId, row.gen.id));
  const specs = variants.length ? await db.select().from(s.variantSpecs).where(inArray(s.variantSpecs.variantId, variants.map((v) => v.id))) : [];
  const images = await db.select().from(s.referenceImages).where(eq(s.referenceImages.generationId, row.gen.id));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href="/catalog" className="hover:underline">
            קטלוג רכבים
          </Link>
        }
        title={
          <>
            {row.make.nameHe} {row.model.nameHe} <span className="ltr">{row.gen.code}</span>
          </>
        }
        subtitle={`${row.make.nameEn} ${row.model.nameEn} · ${row.gen.yearFrom}–${row.gen.yearTo ?? "היום"}`}
        actions={<LinkButton href="/onboarding">הוספה לגראז׳</LinkButton>}
      />
      <div className="flex flex-wrap gap-2 items-center">
        <Badge tone={row.gen.coverage === "deep" ? "olive" : "neutral"}>{COVERAGE_LABEL[row.gen.coverage]}</Badge>
        <span className="text-sm text-charcoal-500">{COVERAGE_HINT[row.gen.coverage]}</span>
      </div>
      {images.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((im) => (
            <li key={im.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.fileId ? `/api/files/${im.fileId}` : im.url!} alt={`${row.model.nameEn} ${row.gen.code}`} className="rounded-xl w-full aspect-video object-cover" />
              <p className="text-xs text-charcoal-500 mt-1">
                {im.attribution} · {im.license} · <ExternalLink href={im.sourceUrl}>מקור</ExternalLink>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <Notice tone="info">אין עדיין תמונת ייחוס עם רישיון שימוש מתועד לדור זה. מוצג איור כללי בלבד.</Notice>
      )}
      {variants.length === 0 && <Notice tone="warn">לדור זה טרם הוזנו גרסאות. אפשר להוסיף רכב מדור זה ולהזין את הפרטים ידנית (כדיווח בעלים).</Notice>}
      <ul className="grid gap-5">
        {variants.map((v) => {
          const vs = specs.filter((x) => x.variantId === v.id);
          const wb = vs.find((x) => x.key === "wheelbase_mm");
          return (
            <li key={v.id}>
              <Card className="p-5 grid gap-5 md:grid-cols-[1fr_300px]">
                <div>
                  <h2 className="text-lg font-semibold">{v.name}</h2>
                  <p className="text-sm text-charcoal-500 mb-3">
                    <span className="num">
                      {v.yearFrom}–{v.yearTo ?? "היום"}
                    </span>{" "}
                    · {BODY_LABEL[v.body]}
                  </p>
                  <dl className="grid gap-2 text-sm">
                    {[
                      ["מנוע", v.engine],
                      ["תיבה", v.transmission],
                      ["הנעה", v.drivetrain],
                    ].map(([k, val]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-charcoal-500 w-24 shrink-0">{k}</dt>
                        <dd>{val ?? <span className="text-charcoal-400 italic">לא הוזן</span>}</dd>
                      </div>
                    ))}
                  </dl>
                  <h3 className="font-semibold text-sm mt-4 mb-2">מפרט ומקורות</h3>
                  <ul className="grid gap-1.5 text-sm">
                    {vs.map((x) => (
                      <li key={x.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-sand-50 px-3 py-2">
                        <span className="text-charcoal-500">{SPEC_LABELS[x.key] ?? x.key}:</span>
                        <span className="font-medium">
                          {x.value} {x.unit}
                        </span>
                        <ProvenanceBadge source={x.source} />
                        {x.verifiedAt && <span className="text-xs text-charcoal-500">אומת {formatDate(x.verifiedAt)}</span>}
                      </li>
                    ))}
                    {!vs.length && <li className="text-charcoal-500">אין נתוני מפרט.</li>}
                  </ul>
                  {vs[0]?.sourceRef && <p className="text-xs text-charcoal-500 mt-2">מקור: {vs[0].sourceRef}</p>}
                </div>
                <div>
                  <VehicleSvg
                    view="side"
                    shape={buildShape({ archetype: v.archetype, wheelbaseMm: wb ? Number(wb.value) : null, tyreSize: vs.find((x) => x.key === "factory_tyre")?.value ?? null, liftCm: 0, body: v.body })}
                    overlays={{ installed: new Set(), planned: new Set() }}
                    title="איור כללי"
                    className="w-full bg-sand-50 rounded-xl"
                  />
                  <p className="text-[11px] text-charcoal-500 text-center">איור כללי ({ARCHETYPES[v.archetype].label}) — לא תמונה של הגרסה</p>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
