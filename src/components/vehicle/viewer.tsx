"use client";

import Link from "@/components/link";
import { useCallback, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ZoomIn, ZoomOut, RotateCcw, X, Info } from "lucide-react";
import { COMPONENT_BY_KEY, SYSTEMS, VIEWS, SYSTEM_BY_KEY, type OverlayKey, type SystemKey, type ViewKey } from "@/lib/components";
import { SideView, FrontView, RearView, UnderView, type OverlayState } from "./drawing";
import { hotspots, W, H, type ShapeInput } from "./geometry";
import { cx, Badge, DemoBadge, FitmentBadge } from "@/components/ui";
import type { FitmentStatus } from "@/db/schema";
import { addInspectionTaskAction } from "@/app/actions/maintenance";

export type ViewerUpgrade = {
  id: string;
  name: string;
  componentKey: string;
  overlay: OverlayKey | null;
  statusLabel: string;
  detail: string | null;
  isDemo: boolean;
  liftCm?: number | null;
  tyreSize?: string | null;
};

export type ViewerCandidate = { partId: string; name: string; brand: string; fitment: FitmentStatus; priceLabel: string; priceKind: string | null; isDemo: boolean };
export type ViewerFactory = { label: string; value: string; sourceLabel: string; verified: boolean };

export type ViewerData = {
  vehicleId: string;
  shape: ShapeInput;
  plannedShape: ShapeInput;
  archetypeLabel: string;
  linkedToCatalogue: boolean;
  installed: ViewerUpgrade[];
  planned: ViewerUpgrade[];
  factory: Record<string, ViewerFactory[]>;
  candidates: Record<string, ViewerCandidate[]>;
};

type Mode = "current" | "preview" | "compare";

const ViewComp = { side: SideView, front: FrontView, rear: RearView, under: UnderView } as const;

export function VehicleViewer({ data, compact = false }: { data: ViewerData; compact?: boolean }) {
  const [view, setView] = useState<ViewKey>("side");
  const [mode, setMode] = useState<Mode>("current");
  const [system, setSystem] = useState<SystemKey | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const installedOverlays = useMemo(
    () => new Set(data.installed.filter((u) => u.overlay && !hidden.has(u.id)).map((u) => u.overlay!)),
    [data.installed, hidden],
  );
  const plannedOverlays = useMemo(() => new Set(data.planned.filter((u) => u.overlay).map((u) => u.overlay!)), [data.planned]);
  const current: OverlayState = { installed: installedOverlays, planned: new Set() };
  const preview: OverlayState = { installed: installedOverlays, planned: plannedOverlays };
  const hiddenLift = data.installed.some((u) => hidden.has(u.id) && u.overlay === "lift");
  const currentShape = hiddenLift ? { ...data.shape, liftCm: 0 } : data.shape;

  const componentsWithInstalled = useMemo(() => new Set(data.installed.map((u) => u.componentKey)), [data.installed]);
  const componentsWithPlanned = useMemo(() => new Set(data.planned.map((u) => u.componentKey)), [data.planned]);

  return (
    <div className="flex flex-col gap-3">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div role="tablist" aria-label="זווית תצוגה" className="inline-flex rounded-xl bg-sand-100 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              role="tab"
              aria-selected={view === v.key}
              onClick={() => setView(v.key)}
              className={cx("rounded-lg px-3.5 min-h-10 text-sm font-medium", view === v.key ? "bg-white shadow-sm text-charcoal-900" : "text-charcoal-600 hover:text-charcoal-900")}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="מצב תצוגה" className="inline-flex rounded-xl bg-sand-100 p-1">
          {(
            [
              ["current", "מצב נוכחי"],
              ["preview", "תצוגת תכנון"],
              ["compare", "השוואה"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              role="radio"
              aria-checked={mode === k}
              onClick={() => setMode(k)}
              className={cx("rounded-lg px-3 min-h-10 text-sm font-medium", mode === k ? "bg-charcoal-900 text-sand-50" : "text-charcoal-600 hover:text-charcoal-900")}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="סינון לפי מערכת">
        <button
          onClick={() => setSystem(null)}
          aria-pressed={system === null}
          className={cx("rounded-full px-3 min-h-9 text-xs font-medium border whitespace-nowrap", system === null ? "bg-charcoal-900 text-white border-charcoal-900" : "bg-white border-sand-300")}
        >
          כל המערכות
        </button>
        {SYSTEMS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSystem(system === s.key ? null : s.key)}
            aria-pressed={system === s.key}
            className={cx("rounded-full px-3 min-h-9 text-xs font-medium border whitespace-nowrap inline-flex items-center gap-1.5", system === s.key ? "text-white border-transparent" : "bg-white border-sand-300")}
            style={system === s.key ? { background: s.color } : undefined}
          >
            <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      <div className={cx("grid gap-4", selected && !compact ? "lg:grid-cols-[1fr_380px]" : "")}>
        <div className="min-w-0">
          {mode === "compare" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Stage title="נוכחי (מותקן)" view={view} shape={currentShape} overlays={current} system={system} selected={selected} onSelect={setSelected} installedKeys={componentsWithInstalled} plannedKeys={new Set()} small />
              <Stage title="אחרי התוכנית" view={view} shape={data.plannedShape} overlays={{ installed: new Set([...installedOverlays, ...plannedOverlays]), planned: new Set() }} system={system} selected={selected} onSelect={setSelected} installedKeys={componentsWithInstalled} plannedKeys={componentsWithPlanned} small />
            </div>
          ) : (
            <Stage
              view={view}
              shape={mode === "preview" ? data.plannedShape : currentShape}
              overlays={mode === "preview" ? preview : current}
              system={system}
              selected={selected}
              onSelect={setSelected}
              installedKeys={componentsWithInstalled}
              plannedKeys={mode === "preview" ? componentsWithPlanned : new Set()}
            />
          )}
          <Disclaimer label={data.archetypeLabel} linked={data.linkedToCatalogue} />
          {mode === "compare" && <CompareList data={data} />}
          {data.installed.length > 0 && mode !== "compare" && (
            <fieldset className="mt-3">
              <legend className="text-sm font-medium text-charcoal-700 mb-1.5">שדרוגים מותקנים באיור</legend>
              <div className="flex flex-wrap gap-2">
                {data.installed.map((u) => (
                  <label key={u.id} className="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-3 min-h-10 text-sm cursor-pointer has-[:checked]:border-olive-500 has-[:checked]:bg-olive-100">
                    <input
                      type="checkbox"
                      className="accent-olive-600 size-4"
                      checked={!hidden.has(u.id)}
                      onChange={() =>
                        setHidden((h) => {
                          const n = new Set(h);
                          if (n.has(u.id)) n.delete(u.id);
                          else n.add(u.id);
                          return n;
                        })
                      }
                    />
                    {u.name}
                    {!u.overlay && <span className="text-xs text-charcoal-400">(ללא איור)</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
        {selected && (
          <ComponentPanel
            componentKey={selected}
            data={data}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

function Disclaimer({ label, linked }: { label: string; linked: boolean }) {
  return (
    <p className="mt-2 flex gap-2 text-xs text-charcoal-500 leading-relaxed">
      <Info size={14} className="shrink-0 mt-0.5" aria-hidden />
      <span>
        איור כללי ({label}) — פרופורציות משוערות לפי בסיס הגלגלים, מידת הצמיגים וההגבהה שהוזנו. זהו איור קוסמטי: אינו שרטוט מדויק של הגרסה ואינו מדמה מרווח גחון, גיאומטריית מתלים או התאמת חלקים.
        {!linked && " הרכב לא שויך לגרסה בקטלוג, ולכן נבחר סוג גוף לפי הנתונים שהוזנו."}
      </span>
    </p>
  );
}

function Stage({
  view,
  shape,
  overlays,
  system,
  selected,
  onSelect,
  installedKeys,
  plannedKeys,
  title,
  small,
}: {
  view: ViewKey;
  shape: ShapeInput;
  overlays: OverlayState;
  system: SystemKey | null;
  selected: string | null;
  onSelect: (k: string | null) => void;
  installedKeys: Set<string>;
  plannedKeys: Set<string>;
  title?: string;
  small?: boolean;
}) {
  const [z, setZ] = useState({ k: 1, x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: number; lastDist?: number } | null>(null);
  const spots = useMemo(() => hotspots(view, shape), [view, shape]);
  const Comp = ViewComp[view];

  const clamp = useCallback((n: { k: number; x: number; y: number }) => {
    const k = Math.min(4, Math.max(1, n.k));
    const maxX = (W * (k - 1)) / 1;
    const maxY = (H * (k - 1)) / 1;
    return { k, x: Math.min(0, Math.max(-maxX, n.x)), y: Math.min(0, Math.max(-maxY, n.y)) };
  }, []);
  const zoomAt = useCallback(
    (factor: number, px = W / 2, py = H / 2) =>
      setZ((p) => {
        const k = Math.min(4, Math.max(1, p.k * factor));
        const ratio = k / p.k;
        return clamp({ k, x: px - (px - p.x) * ratio, y: py - (py - p.y) * ratio });
      }),
    [clamp],
  );
  const toSvg = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  };

  const onPointerDown = (e: RPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { moved: 0 };
  };
  const onPointerMove = (e: RPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !drag.current) return;
    const r = ref.current!.getBoundingClientRect();
    const scale = W / r.width;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag.current.lastDist) {
        const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
        zoomAt(dist / drag.current.lastDist, mid.x, mid.y);
      }
      drag.current.lastDist = dist;
      drag.current.moved += 10;
      return;
    }
    const dx = (e.clientX - prev.x) * scale;
    const dy = (e.clientY - prev.y) * scale;
    drag.current.moved += Math.abs(dx) + Math.abs(dy);
    if (z.k > 1) {
      if (drag.current.moved > 4) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      setZ((p) => clamp({ ...p, x: p.x + dx, y: p.y + dy }));
    }
  };
  const onPointerUp = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && drag.current) drag.current.lastDist = undefined;
  };
  const clickSpot = (key: string) => {
    if (drag.current && drag.current.moved > 6) return;
    onSelect(selected === key ? null : key);
  };

  return (
    <figure className="relative rounded-2xl bg-gradient-to-b from-sand-100 to-sand-50 border border-sand-200 overflow-hidden">
      {title && <figcaption className="absolute top-2 start-3 z-10 text-xs font-semibold text-charcoal-700 bg-white/80 rounded-full px-2.5 py-1">{title}</figcaption>}
      <div
        ref={ref}
        tabIndex={0}
        aria-label="איור הרכב — ניתן להגדיל עם + ו-‑, ולהזיז עם החיצים"
        className="touch-none select-none outline-none"
        style={{ aspectRatio: `${W} / ${H}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          const p = toSvg(e.clientX, e.clientY);
          zoomAt(z.k >= 3 ? 0.25 : 1.6, p.x, p.y);
        }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          const p = toSvg(e.clientX, e.clientY);
          zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          const step = 40;
          if (e.key === "+" || e.key === "=") zoomAt(1.25);
          else if (e.key === "-") zoomAt(0.8);
          else if (e.key === "0") setZ({ k: 1, x: 0, y: 0 });
          else if (e.key === "ArrowLeft") setZ((p) => clamp({ ...p, x: p.x + step }));
          else if (e.key === "ArrowRight") setZ((p) => clamp({ ...p, x: p.x - step }));
          else if (e.key === "ArrowUp") setZ((p) => clamp({ ...p, y: p.y + step }));
          else if (e.key === "ArrowDown") setZ((p) => clamp({ ...p, y: p.y - step }));
          else return;
          e.preventDefault();
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full block" role="group" aria-label="איור רכב אינטראקטיבי">
          <g transform={`translate(${z.x} ${z.y}) scale(${z.k})`}>
            <Comp shape={shape} overlays={overlays} />
            {spots.map((h, i) => {
              const def = COMPONENT_BY_KEY[h.key];
              if (!def) return null;
              const dim = system && def.system !== system;
              const sysColor = SYSTEM_BY_KEY[def.system].color;
              const isSel = selected === h.key;
              const showMarker = !dim && (system ? true : installedKeys.has(h.key) || plannedKeys.has(h.key));
              return (
                <g key={`${h.key}-${i}`}>
                  <rect
                    x={h.x}
                    y={h.y}
                    width={h.w}
                    height={h.h}
                    rx={8}
                    role="button"
                    tabIndex={dim ? -1 : 0}
                    aria-label={`${def.name}${installedKeys.has(h.key) ? " — יש שדרוג מותקן" : ""}${plannedKeys.has(h.key) ? " — יש שדרוג מתוכנן" : ""}`}
                    aria-pressed={isSel}
                    className="cursor-pointer outline-none [&:focus-visible]:stroke-[#d9692b] hover:fill-white/10"
                    fill={isSel ? "rgba(217,105,43,0.12)" : system && !dim ? `${sysColor}22` : "transparent"}
                    stroke={isSel ? "#d9692b" : system && !dim ? sysColor : "transparent"}
                    strokeWidth={isSel ? 3 / z.k : 2 / z.k}
                    strokeDasharray={isSel ? undefined : "6 4"}
                    onClick={() => clickSpot(h.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(selected === h.key ? null : h.key);
                      }
                    }}
                  >
                    <title>{def.name}</title>
                  </rect>
                  {showMarker && (
                    <circle
                      cx={h.x + h.w / 2}
                      cy={h.y + 8 / z.k}
                      r={6 / z.k}
                      pointerEvents="none"
                      fill={installedKeys.has(h.key) ? "#5b6b3a" : plannedKeys.has(h.key) ? "#d9692b" : sysColor}
                      stroke="white"
                      strokeWidth={2 / z.k}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {!small && (
        <div className="absolute bottom-2 end-2 flex gap-1">
          <IconBtn label="הגדלה" onClick={() => zoomAt(1.3)}>
            <ZoomIn size={18} />
          </IconBtn>
          <IconBtn label="הקטנה" onClick={() => zoomAt(1 / 1.3)}>
            <ZoomOut size={18} />
          </IconBtn>
          <IconBtn label="איפוס תצוגה" onClick={() => setZ({ k: 1, x: 0, y: 0 })}>
            <RotateCcw size={18} />
          </IconBtn>
        </div>
      )}
      {!small && (
        <div className="absolute bottom-2 start-3 hidden sm:flex gap-3 text-[11px] text-charcoal-500 bg-white/75 rounded-full px-3 py-1">
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-olive-600" /> מותקן
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-ember-500" /> מתוכנן
          </span>
          <span>הקישו על רכיב לפרטים</span>
        </div>
      )}
    </figure>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="size-11 inline-flex items-center justify-center rounded-xl bg-white/90 border border-sand-300 text-charcoal-800 hover:bg-white shadow-sm">
      {children}
    </button>
  );
}

function CompareList({ data }: { data: ViewerData }) {
  return (
    <div className="mt-3 rounded-xl border border-sand-200 bg-white p-4 text-sm">
      <p className="font-semibold mb-2">מה משתנה בתוכנית</p>
      {data.planned.length === 0 ? (
        <p className="text-charcoal-500">אין שדרוגים מתוכננים. הוסיפו שדרוגים מהקטלוג כדי לראות השוואה.</p>
      ) : (
        <ul className="grid gap-1.5">
          {data.planned.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2">
              <Link href={`/upgrades/${u.id}`} className="hover:underline">
                {u.name}
              </Link>
              <span className="text-xs text-charcoal-500 shrink-0">
                {COMPONENT_BY_KEY[u.componentKey]?.name} · {u.statusLabel}
                {!u.overlay && " · ללא איור"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.shape.tyreDiameterMm !== data.plannedShape.tyreDiameterMm || data.shape.liftCm !== data.plannedShape.liftCm ? (
        <p className="text-xs text-charcoal-500 mt-2">
          שינוי הגובה באיור מבוסס על הגבהה נומינלית ועל קוטר צמיג נומינלי בלבד — הגובה בפועל תלוי במשקל, בעומס ובהתקנה.
        </p>
      ) : null}
    </div>
  );
}

function ComponentPanel({ componentKey, data, onClose }: { componentKey: string; data: ViewerData; onClose: () => void }) {
  const def = COMPONENT_BY_KEY[componentKey];
  if (!def) return null;
  const sys = SYSTEM_BY_KEY[def.system];
  const factory = data.factory[componentKey] ?? [];
  const installed = data.installed.filter((u) => u.componentKey === componentKey);
  const planned = data.planned.filter((u) => u.componentKey === componentKey);
  const candidates = data.candidates[componentKey] ?? [];
  return (
    <aside aria-label={`פרטי רכיב: ${def.name}`} className="rounded-2xl border border-sand-200 bg-white p-5 flex flex-col gap-4 lg:max-h-[42rem] lg:overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-medium" style={{ color: sys.color }}>
            {sys.label}
          </span>
          <h3 className="text-xl font-bold">{def.name}</h3>
        </div>
        <button onClick={onClose} aria-label="סגירת פרטי רכיב" className="size-11 inline-flex items-center justify-center rounded-full hover:bg-sand-100">
          <X size={20} />
        </button>
      </div>
      <p className="text-sm text-charcoal-700">{def.purpose}</p>

      <section>
        <h4 className="text-sm font-semibold mb-1.5">תצורת יצרן</h4>
        {factory.length ? (
          <ul className="grid gap-1.5 text-sm">
            {factory.map((f, i) => (
              <li key={i} className="rounded-lg bg-sand-50 px-3 py-2">
                <span className="text-charcoal-500">{f.label}: </span>
                {f.value}
                <div className="mt-1">
                  <Badge tone={f.verified ? "olive" : "neutral"}>{f.sourceLabel}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-charcoal-500">{data.linkedToCatalogue ? "אין נתוני יצרן לרכיב זה בקטלוג." : "הרכב לא שויך לגרסה בקטלוג — אין נתוני יצרן."}</p>
        )}
      </section>

      <section>
        <h4 className="text-sm font-semibold mb-1.5">מותקן ברכב</h4>
        {installed.length ? (
          <ul className="grid gap-2">
            {installed.map((u) => (
              <li key={u.id} className="rounded-lg border border-olive-200 bg-olive-100/50 px-3 py-2 text-sm">
                <Link href={`/upgrades/${u.id}`} className="font-medium hover:underline">
                  {u.name}
                </Link>{" "}
                {u.isDemo && <DemoBadge />}
                {u.detail && <div className="text-xs text-charcoal-600 mt-0.5">{u.detail}</div>}
                <div className="text-xs mt-1">
                  <Link href={`/upgrades/${u.id}#files`} className="text-olive-700 hover:underline">
                    תמונות, קבלות והערות ←
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-charcoal-500">לא נרשם שדרוג מותקן לרכיב זה.</p>
        )}
      </section>

      {planned.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold mb-1.5">מתוכנן</h4>
          <ul className="grid gap-1.5 text-sm">
            {planned.map((u) => (
              <li key={u.id} className="rounded-lg border border-ember-100 bg-ember-100/40 px-3 py-2">
                <Link href={`/upgrades/${u.id}`} className="font-medium hover:underline">
                  {u.name}
                </Link>
                <div className="text-xs text-charcoal-600">{u.statusLabel}{u.detail ? ` · ${u.detail}` : ""}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-sm font-semibold">מועמדים לשדרוג</h4>
          <Link href={`/upgrades/catalog?component=${componentKey}`} className="text-xs text-olive-700 hover:underline">
            לקטלוג ←
          </Link>
        </div>
        {candidates.length ? (
          <ul className="grid gap-2">
            {candidates.slice(0, 6).map((c) => (
              <li key={c.partId} className="rounded-lg border border-sand-200 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/upgrades/parts/${c.partId}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  {c.isDemo && <DemoBadge />}
                </div>
                <div className="text-xs text-charcoal-500">{c.brand}</div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <FitmentBadge status={c.fitment} />
                  <span className="text-xs text-charcoal-700">{c.priceLabel}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-charcoal-500">אין פריטים בקטלוג לרכיב זה עדיין.</p>
        )}
      </section>

      <section>
        <h4 className="text-sm font-semibold mb-1.5">בדיקות מומלצות</h4>
        <p className="text-xs text-charcoal-500 mb-2">המלצות בדיקה כלליות — אינן מרווחי טיפול של היצרן.</p>
        <ul className="grid gap-1.5">
          {def.inspections.map((t) => (
            <li key={t} className="flex items-center justify-between gap-2 text-sm rounded-lg bg-sand-50 px-3 py-2">
              <span>{t}</span>
              <form action={addInspectionTaskAction}>
                <input type="hidden" name="vehicleId" value={data.vehicleId} />
                <input type="hidden" name="title" value={t} />
                <button className="text-xs text-olive-700 hover:underline whitespace-nowrap min-h-9 px-1">+ לתזכורות</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
