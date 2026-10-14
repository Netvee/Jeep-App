import type { Metadata } from "next";
import { getActiveVehicleDetails } from "@/server/context";
import { vehicleDisplayName } from "@/server/repo";
import { loadPartsWithFitment, sortByFitment } from "@/server/catalog";
import { PageHeader, Notice } from "@/components/ui";
import { PartsBrowser, type PartCard } from "./browser";

export const metadata: Metadata = { title: "קטלוג שדרוגים" };

export default async function PartsCatalogPage({ searchParams }: { searchParams: Promise<{ component?: string; q?: string; category?: string }> }) {
  const { db, active, variant, showDemo } = await getActiveVehicleDetails();
  const sp = await searchParams;
  const list = sortByFitment(
    await loadPartsWithFitment(db, {
      vehicle: active,
      variantYears: variant ? { from: variant.variant.yearFrom, to: variant.variant.yearTo } : null,
      showDemo,
    }),
  );
  const cards: PartCard[] = list.map((p) => ({
    id: p.part.id,
    nameHe: p.part.nameHe,
    nameEn: p.part.nameEn,
    brand: p.part.brand,
    partNumber: p.part.partNumber,
    category: p.part.category,
    componentKey: p.part.componentKey,
    aliases: p.part.aliases,
    description: p.part.description,
    fitment: p.fit.status,
    priceLabel: p.priceLabel,
    priceKind: p.bestPrice?.kind ?? null,
    isDemo: p.part.isDemo,
    complexity: p.part.installComplexity,
  }));
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="קטלוג שדרוגים"
        subtitle={active ? `התאמה מחושבת עבור: ${vehicleDisplayName(active)}${variant ? ` (${variant.variant.name})` : " — הרכב לא שויך לגרסה בקטלוג"}` : "הוסיפו רכב כדי לראות התאמה"}
      />
      {!variant && active && (
        <Notice tone="warn">
          הרכב הפעיל לא שויך לגרסה בקטלוג, ולכן כל הפריטים מוצגים כ״לא אומת״. שייכו גרסה בעריכת הפרופיל כדי לראות התאמות מתועדות.
        </Notice>
      )}
      <PartsBrowser parts={cards} initialComponent={sp.component ?? ""} initialQuery={sp.q ?? ""} initialCategory={sp.category ?? ""} />
    </div>
  );
}
