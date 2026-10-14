"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Bookmark, Map as MapIcon, List } from "lucide-react";
import { LazyTrailMap } from "@/components/map/lazy-map";
import type { MapReport } from "@/components/map/trail-map";
import { Input, Select } from "@/components/forms";
import { Badge, DemoBadge, cx } from "@/components/ui";
import { REGION_LABEL, DIFFICULTY_RUBRIC, VERDICT_LABEL, type TrailMatch } from "@/lib/trails";
import { searchItems } from "@/lib/search";
import type { Region } from "@/db/schema";

export type TrailRow = {
  id: string;
  slug: string;
  name: string;
  region: Region;
  kind: "route" | "pin";
  isDemo: boolean;
  geometry: number[][] | null;
  start: [number, number];
  difficulty: number | null;
  distanceKm: number | null;
  durationMin: number | null;
  surfaces: string[];
  hasAccessNotes: boolean;
  reportsCount: number;
  saved: boolean;
  verdict: TrailMatch["verdict"] | null;
};

const VERDICT_TONE = { suitable: "olive", caution: "warn", not_recommended: "danger", insufficient_info: "neutral" } as const;

export function TrailsExplorer({ trails, reports }: { trails: TrailRow[]; reports: MapReport[] }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<string>("");
  const [maxDiff, setMaxDiff] = useState<string>("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [onlySuitable, setOnlySuitable] = useState(false);
  const [kind, setKind] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"split" | "list">("split");

  const filtered = useMemo(() => {
    let l = trails;
    if (region) l = l.filter((t) => t.region === region);
    if (maxDiff) l = l.filter((t) => t.difficulty != null && t.difficulty <= Number(maxDiff));
    if (onlySaved) l = l.filter((t) => t.saved);
    if (onlySuitable) l = l.filter((t) => t.verdict === "suitable");
    if (kind) l = l.filter((t) => t.kind === kind);
    return searchItems(l, q, (t) => [t.name, REGION_LABEL[t.region], ...t.surfaces]);
  }, [trails, region, maxDiff, onlySaved, onlySuitable, kind, q]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="absolute top-3 start-3 text-charcoal-400" size={20} aria-hidden />
          <Input aria-label="חיפוש מסלול" placeholder="חיפוש לפי שם או משטח" value={q} onChange={(e) => setQ(e.target.value)} className="ps-10" />
        </div>
        <Select aria-label="אזור" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">כל האזורים</option>
          {Object.entries(REGION_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
        <Select aria-label="קושי מרבי" value={maxDiff} onChange={(e) => setMaxDiff(e.target.value)}>
          <option value="">כל רמות הקושי</option>
          {DIFFICULTY_RUBRIC.map((d) => (
            <option key={d.level} value={d.level}>
              עד {d.level} · {d.label}
            </option>
          ))}
        </Select>
        <Select aria-label="סוג" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">מסלולים ונקודות</option>
          <option value="route">מסלולים מלאים</option>
          <option value="pin">נקודות מיקום בלבד</option>
        </Select>
        <div className="inline-flex rounded-xl bg-sand-100 p-1" role="group" aria-label="תצוגה">
          <button onClick={() => setView("split")} aria-pressed={view === "split"} className={cx("rounded-lg px-3 min-h-9 inline-flex items-center gap-1 text-sm", view === "split" && "bg-white shadow-sm")}>
            <MapIcon size={16} /> מפה
          </button>
          <button onClick={() => setView("list")} aria-pressed={view === "list"} className={cx("rounded-lg px-3 min-h-9 inline-flex items-center gap-1 text-sm", view === "list" && "bg-white shadow-sm")}>
            <List size={16} /> רשימה
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} className="size-4 accent-olive-600" /> שמורים בלבד
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={onlySuitable} onChange={(e) => setOnlySuitable(e.target.checked)} className="size-4 accent-olive-600" /> רק כשכל הדרישות המוצהרות מתקיימות
        </label>
        <span className="text-charcoal-500" aria-live="polite">
          {filtered.length} תוצאות
        </span>
      </div>

      <div className={cx("grid gap-4", view === "split" ? "lg:grid-cols-[1fr_420px]" : "")}>
        {view === "split" && (
          <div className="lg:sticky lg:top-20 self-start">
            <LazyTrailMap trails={filtered} reports={reports} selected={selected} onSelect={setSelected} height="min(70vh, 560px)" />
            <div className="flex flex-wrap gap-3 text-xs text-charcoal-600 mt-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-6 h-1 bg-olive-600 rounded" /> מסלול
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-6 border-t-2 border-dashed border-[#8b6a4f]" /> מסלול הדגמה (סינתטי)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-full bg-olive-500 border border-charcoal-900" /> נקודת מיקום בלבד
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-full bg-ember-600" /> דיווח קהילה
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-full bg-danger-700" /> הגבלה מאומתת
              </span>
            </div>
          </div>
        )}
        <ul className={cx("flex flex-col gap-3", view === "list" && "sm:grid sm:grid-cols-2 lg:grid-cols-3")}>
          {filtered.map((t) => (
            <li key={t.id}>
              <div
                onMouseEnter={() => setSelected(t.slug)}
                className={cx("rounded-2xl border bg-white p-4 transition-colors", selected === t.slug ? "border-olive-500" : "border-sand-200", t.isDemo && "bg-[repeating-linear-gradient(135deg,#fff,#fff_12px,#faf7f1_12px,#faf7f1_24px)]")}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/trails/${t.slug}`} className="font-semibold hover:underline">
                    {t.name}
                  </Link>
                  {t.saved && <Bookmark size={16} className="text-olive-600 shrink-0" aria-label="שמור" />}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {t.isDemo && <DemoBadge />}
                  <Badge>{REGION_LABEL[t.region]}</Badge>
                  <Badge tone={t.kind === "pin" ? "info" : "neutral"}>{t.kind === "pin" ? "נקודת מיקום — לא מסלול" : "מסלול מלא"}</Badge>
                  {t.difficulty != null ? <Badge tone="dark">קושי {t.difficulty}/5</Badge> : <Badge>קושי לא דורג</Badge>}
                  {t.hasAccessNotes && <Badge tone="warn">הגבלות גישה</Badge>}
                </div>
                <div className="text-sm text-charcoal-600 mt-2">
                  {t.distanceKm != null && `${t.distanceKm} ק״מ`}
                  {t.durationMin != null && ` · כ-${Math.round(t.durationMin / 6) / 10} שעות`}
                  {t.surfaces.length > 0 && ` · ${t.surfaces.join(", ")}`}
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  {t.verdict ? <Badge tone={VERDICT_TONE[t.verdict]}>{VERDICT_LABEL[t.verdict]}</Badge> : <span />}
                  <span className="text-xs text-charcoal-500">{t.reportsCount} דיווחים</span>
                </div>
              </div>
            </li>
          ))}
          {!filtered.length && <li className="text-sm text-charcoal-500">לא נמצאו מסלולים בסינון הנוכחי.</li>}
        </ul>
      </div>
    </div>
  );
}
