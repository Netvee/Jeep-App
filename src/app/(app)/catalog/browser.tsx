"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/forms";
import { Badge } from "@/components/ui";
import { searchItems } from "@/lib/search";
import { COVERAGE_LABEL } from "@/lib/labels";
import type { TreeGeneration } from "@/server/catalogue-tree";

export function CatalogueBrowser({ tree }: { tree: TreeGeneration[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => searchItems(tree, q, (g) => [g.makeEn, g.makeHe, ...g.makeAliases, g.modelEn, g.modelHe, ...g.modelAliases, g.code, g.name, ...g.aliases, ...g.variants.flatMap((v) => [v.name, ...v.aliases])]),
    [tree, q],
  );
  const byMake = new Map<string, TreeGeneration[]>();
  for (const g of list) byMake.set(g.makeHe, [...(byMake.get(g.makeHe) ?? []), g]);
  return (
    <div className="flex flex-col gap-5">
      <div className="relative max-w-xl">
        <Search className="absolute top-3 start-3 text-charcoal-400" size={20} aria-hidden />
        <Input aria-label="חיפוש בקטלוג" placeholder="חיפוש: לנדקרוזר, JL, Hilux, פג׳רו…" value={q} onChange={(e) => setQ(e.target.value)} className="ps-10" />
      </div>
      <p className="text-sm text-charcoal-500" aria-live="polite">
        {list.length} דורות
      </p>
      {[...byMake.entries()].map(([make, gens]) => (
        <section key={make}>
          <h2 className="font-semibold text-lg mb-2">{make}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gens.map((g) => (
              <li key={g.id}>
                <Link href={`/catalog/${g.slug}`} className="block rounded-xl border border-sand-200 bg-white px-4 py-3 hover:border-olive-500 min-h-16">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {g.modelHe} <span className="ltr text-charcoal-500 text-sm">{g.code}</span>
                    </span>
                    <Badge tone={g.coverage === "deep" ? "olive" : g.coverage === "basic" ? "info" : "neutral"}>{COVERAGE_LABEL[g.coverage]}</Badge>
                  </div>
                  <div className="text-xs text-charcoal-500 mt-1">
                    <span className="num">
                      {g.yearFrom}–{g.yearTo ?? "היום"}
                    </span>{" "}
                    · {g.variants.length} גרסאות
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
