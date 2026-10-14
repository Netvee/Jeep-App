"use client";

import Link from "@/components/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/forms";
import { Card, DemoBadge, FitmentBadge, EmptyState } from "@/components/ui";
import { searchItems } from "@/lib/search";
import { CATEGORY_LABEL } from "@/lib/labels";
import { COMPONENTS, COMPONENT_BY_KEY } from "@/lib/components";
import { FITMENT_EXPLAIN, FITMENT_LABEL } from "@/lib/fitment";
import type { FitmentStatus, PartCategory } from "@/db/schema";

export type PartCard = {
  id: string;
  nameHe: string;
  nameEn: string | null;
  brand: string;
  partNumber: string | null;
  category: PartCategory;
  componentKey: string;
  aliases: string[];
  description: string | null;
  fitment: FitmentStatus;
  priceLabel: string;
  priceKind: string | null;
  isDemo: boolean;
  complexity: number | null;
};

export function PartsBrowser({ parts, initialComponent, initialQuery, initialCategory }: { parts: PartCard[]; initialComponent: string; initialQuery: string; initialCategory: string }) {
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [component, setComponent] = useState(initialComponent);
  const [fit, setFit] = useState<string>("");
  const [hideIncompatible, setHideIncompatible] = useState(true);

  const filtered = useMemo(() => {
    let list = parts;
    if (category) list = list.filter((p) => p.category === category);
    if (component) list = list.filter((p) => p.componentKey === component);
    if (fit) list = list.filter((p) => p.fitment === fit);
    if (hideIncompatible && fit !== "incompatible") list = list.filter((p) => p.fitment !== "incompatible");
    return searchItems(list, q, (p) => [p.nameHe, p.nameEn, p.brand, p.partNumber, ...p.aliases, CATEGORY_LABEL[p.category], COMPONENT_BY_KEY[p.componentKey]?.name]);
  }, [parts, q, category, component, fit, hideIncompatible]);

  const usedComponents = [...new Set(parts.map((p) => p.componentKey))];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute top-3 start-3 text-charcoal-400" size={20} aria-hidden />
          <Input aria-label="חיפוש חלקים" placeholder="כננת, winch, מגביה, KO2, שנורקל…" value={q} onChange={(e) => setQ(e.target.value)} className="ps-10" />
        </div>
        <Select aria-label="קטגוריה" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">כל הקטגוריות</option>
          {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
        <Select aria-label="רכיב" value={component} onChange={(e) => setComponent(e.target.value)}>
          <option value="">כל הרכיבים</option>
          {COMPONENTS.filter((c) => usedComponents.includes(c.key) || c.key === component).map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="סינון לפי התאמה">
        {(["", "verified", "owner_reported", "unconfirmed", "incompatible"] as const).map((k) => (
          <button
            key={k || "all"}
            onClick={() => setFit(k)}
            aria-pressed={fit === k}
            className={`rounded-full px-3 min-h-9 text-xs font-medium border ${fit === k ? "bg-charcoal-900 text-white border-charcoal-900" : "bg-white border-sand-300"}`}
            title={k ? FITMENT_EXPLAIN[k] : undefined}
          >
            {k ? FITMENT_LABEL[k] : "כל רמות ההתאמה"}
          </button>
        ))}
        <label className="inline-flex items-center gap-2 text-xs text-charcoal-600 ms-2">
          <input type="checkbox" checked={hideIncompatible} onChange={(e) => setHideIncompatible(e.target.checked)} className="size-4 accent-olive-600" />
          הסתרת פריטים לא מתאימים
        </label>
      </div>
      <p className="text-sm text-charcoal-500" aria-live="polite">
        {filtered.length} פריטים
      </p>
      {filtered.length === 0 ? (
        <Card>
          <EmptyState title="לא נמצאו פריטים">נסו מילה אחרת (בעברית או באנגלית) או הסירו סינונים.</EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link href={`/upgrades/parts/${p.id}`} className="block h-full rounded-2xl bg-white border border-sand-200 p-4 hover:border-olive-500 transition-colors">
                <div className="text-xs text-charcoal-500 flex items-center justify-between gap-2">
                  <span>
                    {CATEGORY_LABEL[p.category]} · {COMPONENT_BY_KEY[p.componentKey]?.name}
                  </span>
                  {p.isDemo && <DemoBadge />}
                </div>
                <h3 className="font-semibold mt-1">{p.nameHe}</h3>
                <p className="text-sm text-charcoal-600">
                  <bdi>{p.brand}</bdi>
                  {p.nameEn && (
                    <>
                      {" · "}
                      <bdi className="text-charcoal-500">{p.nameEn}</bdi>
                    </>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <FitmentBadge status={p.fitment} />
                </div>
                <p className="text-xs text-charcoal-600 mt-2">{p.priceLabel}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
