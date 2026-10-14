import type { Metadata } from "next";
import { getGarage } from "@/server/context";
import { getCatalogueTree } from "@/server/catalogue-tree";
import { PageHeader, Stat, Notice } from "@/components/ui";
import { CatalogueBrowser } from "./browser";

export const metadata: Metadata = { title: "קטלוג רכבים" };

export default async function CataloguePage() {
  const { db } = await getGarage();
  const tree = await getCatalogueTree(db);
  const makes = new Set(tree.map((g) => g.makeEn)).size;
  const variants = tree.reduce((n, g) => n + g.variants.length, 0);
  const byCov = (c: string) => tree.filter((g) => g.coverage === c).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="קטלוג רכבים" subtitle="יצרן → דגם → דור → טווח שנים → גרסה. הכיסוי מוצג בשקיפות — דור שמופיע ״ברישום בלבד״ עדיין ללא גרסאות ומפרט." />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="יצרנים" value={makes} />
        <Stat label="דורות" value={tree.length} />
        <Stat label="גרסאות" value={variants} />
        <Stat label="כיסוי מורחב / בסיסי" value={`${byCov("deep")} / ${byCov("basic")}`} />
        <Stat label="רישום בלבד" value={byCov("listed")} />
      </div>
      <Notice tone="info">
        כל נתוני המפרט בקטלוג מסומנים כרגע כ<strong>״עריכה — טרם אומת״</strong>: הם רוכזו מפרסומי יצרן פומביים אך טרם הוצלבו מול מסמך יצרן ספציפי. נתון יסומן כמאומת רק עם הפניה למסמך ותאריך
        אימות. אין בקטלוג תמונות ייחוס מורשות עדיין — מוצגים איורים כלליים בלבד.
      </Notice>
      <CatalogueBrowser tree={tree} />
    </div>
  );
}
