/**
 * Generic vehicle illustration renderer (no hooks — usable from server components).
 * Upgrade overlays are drawn on top; `planned` overlays are drawn as a dashed preview.
 */
import type { OverlayKey } from "@/lib/components";
import { sideGeometry, frontGeometry, underGeometry, GROUND, W, H, type ShapeInput, type SideGeo, type FrontGeo, type UnderGeo } from "./geometry";

export type OverlayState = { installed: Set<OverlayKey>; planned: Set<OverlayKey> };

const C = {
  body: "#5d6b44",
  bodyDark: "#4a5636",
  bodyLight: "#7a8a5c",
  glass: "#2f3b44",
  glassHi: "#55636d",
  trim: "#26292c",
  tyre: "#1b1d1f",
  tyreSide: "#2b2e31",
  rim: "#b8ab90",
  rimDark: "#8e8269",
  chassis: "#33373b",
  steel: "#44494e",
  light: "#f3ead6",
  tail: "#a8321f",
  ground: "#d8cbb0",
  shadow: "rgba(29,31,33,0.18)",
  planned: "#d9692b",
  board: "#c4561a",
};

type DrawProps = { shape: ShapeInput; overlays: OverlayState; idPrefix?: string };

/** Paint for an overlay depending on installed/planned status (returns null if neither). */
function paint(o: OverlayState, key: OverlayKey): null | { planned: boolean; fill: (c: string) => string; stroke: (c: string) => string; dash?: string; opacity: number } {
  if (o.installed.has(key)) return { planned: false, fill: (c) => c, stroke: (c) => c, opacity: 1 };
  if (o.planned.has(key)) return { planned: true, fill: () => "rgba(217,105,43,0.18)", stroke: () => C.planned, dash: "7 5", opacity: 1 };
  return null;
}

/* ================================================================= SIDE */

function bodyPath(g: SideGeo) {
  const { a, X, y, fx, rx, archR, archCY, len } = g;
  const rockY = y(a.rocker);
  const dy = rockY - archCY;
  const hw = Math.sqrt(Math.max(archR * archR - dy * dy, 1));
  const large = dy > 0 ? 1 : 0;
  const top: string[] = [];
  if (a.rearStyle === "slant") {
    top.push(`M ${X(0)} ${y(a.rocker + 150)}`, `L ${X(0)} ${y(a.hoodF - 130)}`, `Q ${X(10)} ${y(a.hoodF)} ${X(140)} ${y(a.hoodF)}`);
    top.push(`L ${X(a.hoodLen)} ${y(a.cowl)}`, `L ${X(a.hoodLen + a.rake)} ${y(a.roof)}`, `L ${X(len - 300)} ${y(a.roof)}`);
    top.push(`Q ${X(len - 120)} ${y(a.roof - 10)} ${X(len - 40)} ${y(a.roof - 330)}`, `L ${X(len)} ${y(a.belt - 40)}`, `L ${X(len)} ${y(a.rocker + 150)}`);
  } else if (a.rearStyle === "bed") {
    top.push(`M ${X(0)} ${y(a.rocker + 150)}`, `L ${X(0)} ${y(a.hoodF - 110)}`, `Q ${X(10)} ${y(a.hoodF)} ${X(130)} ${y(a.hoodF)}`);
    top.push(`L ${X(a.hoodLen)} ${y(a.cowl)}`, `L ${X(a.hoodLen + a.rake)} ${y(a.roof)}`, `L ${X(a.cabLen! - 80)} ${y(a.roof)}`);
    top.push(`Q ${X(a.cabLen!)} ${y(a.roof)} ${X(a.cabLen!)} ${y(a.roof - 80)}`, `L ${X(a.cabLen!)} ${y(a.bedTop!)}`, `L ${X(len)} ${y(a.bedTop!)}`, `L ${X(len)} ${y(a.rocker + 150)}`);
  } else {
    top.push(`M ${X(0)} ${y(a.rocker + 130)}`, `L ${X(0)} ${y(a.hoodF - 30)}`, `Q ${X(0)} ${y(a.hoodF)} ${X(50)} ${y(a.hoodF)}`);
    top.push(`L ${X(a.hoodLen)} ${y(a.cowl)}`, `L ${X(a.hoodLen + a.rake)} ${y(a.roof)}`, `L ${X(len - 50)} ${y(a.roof)}`);
    top.push(`Q ${X(len)} ${y(a.roof)} ${X(len)} ${y(a.roof - 50)}`, `L ${X(len)} ${y(a.rocker + 130)}`);
  }
  const bottom = [
    `L ${X(len - 40)} ${rockY}`,
    `L ${rx + hw} ${rockY}`,
    `A ${archR} ${archR} 0 ${large} 0 ${rx - hw} ${rockY}`,
    `L ${fx + hw} ${rockY}`,
    `A ${archR} ${archR} 0 ${large} 0 ${fx - hw} ${rockY}`,
    `L ${X(40)} ${rockY}`,
    "Z",
  ];
  return [...top, ...bottom].join(" ");
}

function Wheel({ cx, cy, R, rimR, chunky, spokes = 6 }: { cx: number; cy: number; R: number; rimR: number; chunky: boolean; spokes?: number }) {
  const blocks = chunky ? 22 : 0;
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill={C.tyre} />
      {Array.from({ length: blocks }).map((_, i) => {
        const ang = (i / blocks) * Math.PI * 2;
        return (
          <rect
            key={i}
            x={cx + Math.cos(ang) * (R - 1.5) - 3}
            y={cy + Math.sin(ang) * (R - 1.5) - 2}
            width={6}
            height={4}
            fill={C.tyreSide}
            transform={`rotate(${(ang * 180) / Math.PI + 90} ${cx + Math.cos(ang) * (R - 1.5)} ${cy + Math.sin(ang) * (R - 1.5)})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={R * 0.86} fill={C.tyreSide} />
      <circle cx={cx} cy={cy} r={rimR} fill={C.rim} />
      <circle cx={cx} cy={cy} r={rimR * 0.82} fill={C.rimDark} />
      {Array.from({ length: spokes }).map((_, i) => {
        const ang = (i / spokes) * Math.PI * 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(ang) * rimR * 0.8} y2={cy + Math.sin(ang) * rimR * 0.8} stroke={C.rim} strokeWidth={rimR * 0.22} strokeLinecap="round" />;
      })}
      <circle cx={cx} cy={cy} r={rimR * 0.24} fill={C.trim} />
    </g>
  );
}

function SideWindows(g: SideGeo, fourDoor: boolean) {
  const { a, X, y, len, fx, rx, s, wb } = g;
  const beltY = y(a.belt);
  const topY = y(a.roof - 70);
  // windshield line x at a given height
  const wsX = (mm: number) => X(a.hoodLen + (a.rake * (mm - a.cowl)) / (a.roof - a.cowl));
  const start = wsX(a.belt) + 10;
  const startTop = wsX(a.roof - 70) + 10;
  const end = a.rearStyle === "bed" ? X(a.cabLen! - 70) : a.rearStyle === "slant" ? X(len - 260) : X(len - 70);
  const bPillar = fourDoor ? fx + wb * s * 0.47 : fx + wb * s * 0.62;
  const cPillar = a.rearStyle === "bed" ? end : fourDoor ? rx - 8 : end;
  const els: React.ReactNode[] = [];
  els.push(<path key="w1" d={`M ${start} ${beltY} L ${startTop} ${topY} L ${bPillar - 7} ${topY} L ${bPillar - 7} ${beltY} Z`} fill={C.glass} />);
  if (fourDoor || a.rearStyle === "bed") els.push(<rect key="w2" x={bPillar + 7} y={topY} width={Math.max(cPillar - bPillar - 14, 0)} height={beltY - topY} fill={C.glass} rx={3} />);
  if (a.rearStyle !== "bed" && cPillar < end - 20) {
    if (a.rearStyle === "slant")
      els.push(<path key="w3" d={`M ${cPillar + 12} ${topY} L ${X(len - 300)} ${topY} Q ${X(len - 200)} ${topY} ${X(len - 130)} ${beltY} L ${cPillar + 12} ${beltY} Z`} fill={C.glass} />);
    else els.push(<rect key="w3" x={cPillar + 12} y={topY} width={end - cPillar - 12} height={beltY - topY} fill={C.glass} rx={3} />);
  }
  // highlight streak
  els.push(<path key="hi" d={`M ${start + 12} ${beltY - 6} L ${startTop + 22} ${topY + 6}`} stroke={C.glassHi} strokeWidth={4} opacity={0.6} />);
  // door seams + handles
  const doorBottom = y(a.rocker + 40);
  const seams = [wsX(a.cowl) + 4, bPillar];
  if (fourDoor && a.rearStyle !== "bed") seams.push(rx - (g.archR * 1.05));
  if (a.rearStyle === "bed") seams.push(X(a.cabLen! - 70));
  seams.forEach((x, i) => els.push(<line key={`s${i}`} x1={x} y1={beltY} x2={x} y2={doorBottom} stroke={C.bodyDark} strokeWidth={1.5} />));
  els.push(<rect key="h1" x={bPillar - 34} y={beltY + 12} width={20} height={4} rx={2} fill={C.trim} />);
  if (fourDoor) els.push(<rect key="h2" x={seams[2] - 30} y={beltY + 12} width={20} height={4} rx={2} fill={C.trim} />);
  // mirror
  els.push(<path key="mir" d={`M ${wsX(a.belt) - 4} ${beltY - 4} l -16 -10 l -4 12 Z`} fill={C.trim} />);
  return els;
}

function SideOverlays(g: SideGeo, o: OverlayState) {
  const { a, X, y, len, fx, rx, R, wb, s } = g;
  const out: React.ReactNode[] = [];
  const add = (key: OverlayKey, fn: (p: NonNullable<ReturnType<typeof paint>>) => React.ReactNode) => {
    const p = paint(o, key);
    if (p) out.push(<g key={key} data-overlay={key} data-planned={p.planned || undefined}>{fn(p)}</g>);
  };
  const roofStart = X(a.hoodLen + a.rake + 40);
  const roofEnd = a.rearStyle === "bed" ? X(a.cabLen! - 60) : X(len - 80);
  add("roofrack", (p) => (
    <g stroke={p.stroke(C.trim)} strokeDasharray={p.dash} fill={p.fill(C.steel)}>
      <rect x={roofStart} y={y(a.roof + 85)} width={roofEnd - roofStart} height={7} rx={2} />
      {[0, 0.33, 0.66, 1].map((t) => (
        <rect key={t} x={roofStart + t * (roofEnd - roofStart) - 3} y={y(a.roof + 85)} width={6} height={y(a.roof) - y(a.roof + 85)} />
      ))}
    </g>
  ));
  // recovery boards are only drawn on the roof rack in side view (rear view shows them otherwise)
  if (o.installed.has("roofrack") || o.planned.has("roofrack"))
    add("recovery", (p) => (
      <rect x={roofStart + 30} y={y(a.roof + 85) - 10} width={Math.min(220, roofEnd - roofStart - 60)} height={9} rx={4} fill={p.planned ? p.fill("") : C.board} stroke={p.planned ? C.planned : "#8f3d10"} strokeDasharray={p.dash} />
    ));
  add("snorkel", (p) => {
    const baseX = X(a.hoodLen - 220);
    const baseY = y(a.cowl - 160);
    const wsX = (mm: number) => X(a.hoodLen + (a.rake * (mm - a.cowl)) / (a.roof - a.cowl));
    return (
      <g fill="none" stroke={p.planned ? C.planned : C.trim} strokeDasharray={p.dash} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${baseX} ${baseY} L ${baseX} ${y(a.cowl + 30)} L ${wsX(a.roof - 40) - 14} ${y(a.roof - 40)} L ${wsX(a.roof + 60) - 14} ${y(a.roof + 60)}`} strokeWidth={9} />
        <rect x={wsX(a.roof + 60) - 30} y={y(a.roof + 110)} width={34} height={26} rx={5} fill={p.planned ? "rgba(217,105,43,0.18)" : C.trim} strokeWidth={2} />
      </g>
    );
  });
  add("sliders", (p) => (
    <rect x={fx + R * 1.3} y={y(a.rocker + 25)} width={rx - fx - R * 2.6} height={12} rx={6} fill={p.fill(C.steel)} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} />
  ));
  add("skid", (p) => (
    <path
      d={`M ${fx + R * 0.85} ${y(a.rocker - 70)} L ${fx + wb * s * 0.58} ${y(a.rocker - 70)} L ${fx + wb * s * 0.62} ${y(a.rocker - 20)}`}
      fill="none"
      stroke={p.planned ? C.planned : "#7d8489"}
      strokeWidth={7}
      strokeDasharray={p.dash}
      strokeLinecap="round"
    />
  ));
  add("bumper", (p) => (
    <path
      d={`M ${X(-90)} ${y(a.rocker + 230)} L ${X(160)} ${y(a.rocker + 230)} L ${X(160)} ${y(a.rocker - 40)} L ${X(-40)} ${y(a.rocker - 40)} L ${X(-90)} ${y(a.rocker + 40)} Z`}
      fill={p.fill(C.steel)}
      stroke={p.stroke(C.trim)}
      strokeDasharray={p.dash}
      strokeWidth={2}
    />
  ));
  add("winch", (p) => (
    <g fill={p.fill(C.trim)} stroke={p.stroke("#111")} strokeDasharray={p.dash} strokeWidth={1.5}>
      <rect x={X(-60)} y={y(a.rocker + 190)} width={X(110) - X(-60)} height={y(a.rocker + 70) - y(a.rocker + 190)} rx={6} />
      <rect x={X(-100)} y={y(a.rocker + 150)} width={X(-55) - X(-100)} height={y(a.rocker + 100) - y(a.rocker + 150)} rx={2} />
      <path d={`M ${X(-100)} ${y(a.rocker + 125)} q -10 0 -10 12 q 0 10 8 10`} fill="none" strokeWidth={3} />
    </g>
  ));
  add("lights", (p) => {
    const lx = X(a.hoodLen - 40);
    const ly = y(a.cowl + 40);
    return (
      <g fill={p.planned ? "rgba(217,105,43,0.25)" : C.light} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} strokeWidth={2}>
        <rect x={lx - 18} y={ly - 22} width={22} height={22} rx={4} />
        <line x1={lx - 7} y1={ly} x2={lx - 7} y2={y(a.cowl)} />
      </g>
    );
  });
  add("storage", (p) =>
    a.rearStyle === "bed" ? (
      <rect x={X(a.cabLen! + 60)} y={y(a.bedTop! + 260)} width={X(len - 40) - X(a.cabLen! + 60)} height={y(a.bedTop!) - y(a.bedTop! + 260)} rx={8} fill={p.fill(C.steel)} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} />
    ) : null,
  );
  return out;
}

export function SideView({ shape, overlays }: DrawProps) {
  const g = sideGeometry(shape);
  const { a, X, y, fx, rx, R, axleY, rimR, len, archR, archCY } = g;
  const chunky = overlays.installed.has("bigtyres") || overlays.planned.has("bigtyres");
  const plannedTyre = !overlays.installed.has("bigtyres") && overlays.planned.has("bigtyres");
  const rockY = y(a.rocker);
  return (
    <g>
      <ellipse cx={(g.x0 + g.xEnd) / 2} cy={GROUND + 4} rx={(g.xEnd - g.x0) / 2 + 30} ry={10} fill={C.shadow} />
      {/* chassis / underside band */}
      <rect x={fx - R * 0.6} y={rockY - 2} width={rx - fx + R * 1.2} height={Math.max(axleY - rockY - R * 0.15, 8)} fill={C.chassis} rx={3} />
      {/* springs / shocks visible in arch gaps */}
      {[fx, rx].map((x, i) => (
        <g key={i} stroke={C.steel} strokeWidth={4} fill="none">
          <path d={`M ${x - 8} ${axleY - 6} L ${x - 8} ${archCY - archR * 0.55}`} />
          <path d={`M ${x + 6} ${axleY - 8} ${Array.from({ length: 6 }).map((_, k) => `L ${x + (k % 2 ? -2 : 14)} ${axleY - 8 - ((axleY - (archCY - archR * 0.6)) * (k + 1)) / 6}`).join(" ")}`} />
        </g>
      ))}
      {/* wheel wells */}
      {[fx, rx].map((x, i) => (
        <circle key={`well${i}`} cx={x} cy={archCY} r={archR - 1} fill="#2a2c2e" />
      ))}
      {/* body */}
      <path d={bodyPath(g)} fill={C.body} stroke={C.bodyDark} strokeWidth={1.5} />
      {/* shoulder highlight */}
      <path d={`M ${X(40)} ${y(a.hoodF - 30)} L ${X(a.hoodLen)} ${y(a.cowl - 30)}`} stroke={C.bodyLight} strokeWidth={3} opacity={0.6} />
      {SideWindows(g, shape.fourDoor)}
      {/* fender flares */}
      {a.flares &&
        [fx, rx].map((x, i) => (
          <path key={i} d={`M ${x - archR - 12} ${rockY + 2} A ${archR + 12} ${archR + 12} 0 0 1 ${x + archR + 12} ${rockY + 2}`} transform={`translate(0 ${archCY - rockY})`} fill="none" stroke={C.trim} strokeWidth={13} strokeLinecap="round" clipPath="none" />
        ))}
      {/* lights */}
      {a.roundLights ? (
        <circle cx={X(10)} cy={y(a.hoodF - 140)} r={20 * (g.s / 0.17)} fill={C.light} stroke={C.trim} strokeWidth={3} />
      ) : (
        <rect x={X(-5)} y={y(a.hoodF - 30)} width={X(170) - X(-5)} height={y(a.hoodF - 140) - y(a.hoodF - 30)} rx={6} fill={C.light} stroke={C.trim} strokeWidth={2} />
      )}
      <rect x={X(len - 25)} y={y(a.belt - 40)} width={X(len + 5) - X(len - 25)} height={y(a.rocker + 300) - y(a.belt - 40)} fill={C.tail} rx={3} />
      {/* bumpers (stock) */}
      <rect x={X(-60)} y={y(a.rocker + 200)} width={X(120) - X(-60)} height={y(a.rocker + 30) - y(a.rocker + 200)} rx={8} fill={C.trim} />
      <rect x={X(len - 120)} y={y(a.rocker + 200)} width={X(len + 50) - X(len - 120)} height={y(a.rocker + 30) - y(a.rocker + 200)} rx={8} fill={C.trim} />
      {/* rear spare */}
      {a.spareRear && <Wheel cx={X(len + 70)} cy={y(a.belt - 60)} R={R * 0.92} rimR={rimR * 0.92} chunky={chunky} spokes={5} />}
      {SideOverlays(g, overlays)}
      {/* wheels */}
      {[fx, rx].map((x, i) => (
        <g key={i} opacity={plannedTyre ? 0.95 : 1}>
          <Wheel cx={x} cy={axleY} R={R} rimR={rimR} chunky={chunky} />
          {plannedTyre && <circle cx={x} cy={axleY} r={R + 3} fill="none" stroke={C.planned} strokeWidth={3} strokeDasharray="7 5" />}
        </g>
      ))}
      <line x1={0} y1={GROUND + 1} x2={W} y2={GROUND + 1} stroke={C.ground} strokeWidth={2} />
    </g>
  );
}

/* ========================================================== FRONT / REAR */

function FrontTyres(g: FrontGeo, chunky: boolean) {
  const { cx, halfTrack, tw, R, axleY } = g;
  return [-1, 1].map((side) => (
    <g key={side}>
      <rect x={cx + side * halfTrack - tw / 2} y={axleY - R} width={tw} height={2 * R} rx={tw * 0.28} fill={C.tyre} />
      {chunky &&
        Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={cx + side * halfTrack - tw / 2 + 3} x2={cx + side * halfTrack + tw / 2 - 3} y1={axleY - R + ((i + 1) * 2 * R) / 8} y2={axleY - R + ((i + 1) * 2 * R) / 8} stroke={C.tyreSide} strokeWidth={4} />
        ))}
    </g>
  ));
}

function Cabin(g: FrontGeo, rear: boolean) {
  const { a, cx, halfW, y } = g;
  const topW = a.rearStyle === "slant" ? halfW * 0.72 : halfW * 0.84;
  const botW = halfW * 0.93;
  const roofY = y(a.roof);
  const beltY = y(a.rearStyle === "bed" && rear ? a.bedTop! : a.belt);
  return (
    <g>
      <path d={`M ${cx - botW} ${beltY} L ${cx - topW} ${roofY + 6} Q ${cx - topW} ${roofY} ${cx - topW + 10} ${roofY} L ${cx + topW - 10} ${roofY} Q ${cx + topW} ${roofY} ${cx + topW} ${roofY + 6} L ${cx + botW} ${beltY} Z`} fill={C.body} stroke={C.bodyDark} strokeWidth={1.5} />
      <path d={`M ${cx - botW + 16} ${beltY - 8} L ${cx - topW + 12} ${roofY + 14} L ${cx + topW - 12} ${roofY + 14} L ${cx + botW - 16} ${beltY - 8} Z`} fill={C.glass} />
      <path d={`M ${cx - botW + 40} ${beltY - 14} L ${cx - topW + 40} ${roofY + 22}`} stroke={C.glassHi} strokeWidth={5} opacity={0.5} />
    </g>
  );
}

function AxleFront(g: FrontGeo, ifs: boolean, tint?: string) {
  const { cx, halfTrack, tw, axleY, y, a } = g;
  if (!ifs)
    return (
      <g>
        <rect x={cx - halfTrack + tw / 2} y={axleY - 9} width={2 * halfTrack - tw} height={18} rx={9} fill={tint ?? C.steel} />
        <circle cx={cx - halfTrack * 0.25} cy={axleY} r={30} fill={tint ?? C.steel} stroke={C.trim} strokeWidth={2} />
      </g>
    );
  return (
    <g stroke={tint ?? C.steel} strokeWidth={7} strokeLinecap="round">
      <rect x={cx - 34} y={axleY - 26} width={68} height={44} rx={10} fill={tint ?? C.steel} stroke="none" />
      <line x1={cx - 34} y1={axleY} x2={cx - halfTrack + tw / 2} y2={axleY} />
      <line x1={cx + 34} y1={axleY} x2={cx + halfTrack - tw / 2} y2={axleY} />
      <line x1={cx - 60} y1={y(a.rocker - 40)} x2={cx - halfTrack + tw / 2} y2={axleY + 22} strokeWidth={5} />
      <line x1={cx + 60} y1={y(a.rocker - 40)} x2={cx + halfTrack - tw / 2} y2={axleY + 22} strokeWidth={5} />
    </g>
  );
}

function Springs(g: FrontGeo) {
  const { cx, halfTrack, tw, axleY, y, a } = g;
  return [-1, 1].map((side) => {
    const x = cx + side * (halfTrack - tw * 0.95);
    const top = y(a.rocker + 20);
    const n = 7;
    const pts = Array.from({ length: n + 1 }).map((_, k) => `${x + (k % 2 ? -11 : 11)},${top + ((axleY - 10 - top) * k) / n}`);
    return <polyline key={side} points={pts.join(" ")} fill="none" stroke={C.steel} strokeWidth={4} />;
  });
}

export function FrontView({ shape, overlays }: DrawProps) {
  const g = frontGeometry(shape);
  const { a, cx, halfW, y } = g;
  const chunky = overlays.installed.has("bigtyres") || overlays.planned.has("bigtyres");
  const out: React.ReactNode[] = [];
  const add = (key: OverlayKey, fn: (p: NonNullable<ReturnType<typeof paint>>) => React.ReactNode) => {
    const p = paint(overlays, key);
    if (p) out.push(<g key={key} data-overlay={key} data-planned={p.planned || undefined}>{fn(p)}</g>);
  };
  add("roofrack", (p) => <rect x={cx - halfW * 0.86} y={y(a.roof + 95)} width={halfW * 1.72} height={10} rx={3} fill={p.fill(C.steel)} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} />);
  add("lights", (p) => (
    <g fill={p.planned ? "rgba(217,105,43,0.25)" : C.light} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} strokeWidth={2}>
      <rect x={cx - halfW * 0.6} y={y(a.rocker + 300)} width={30} height={26} rx={5} />
      <rect x={cx + halfW * 0.6 - 30} y={y(a.rocker + 300)} width={30} height={26} rx={5} />
    </g>
  ));
  add("snorkel", (p) => (
    <g fill="none" stroke={p.planned ? C.planned : C.trim} strokeDasharray={p.dash} strokeWidth={11} strokeLinecap="round">
      <path d={`M ${cx - halfW * 1.0} ${y(a.cowl - 160)} L ${cx - halfW * 0.96} ${y(a.roof + 60)}`} />
      <rect x={cx - halfW * 1.03} y={y(a.roof + 120)} width={28} height={30} rx={6} strokeWidth={2} fill={p.planned ? "rgba(217,105,43,0.18)" : C.trim} />
    </g>
  ));
  add("bumper", (p) => (
    <rect x={cx - halfW * 1.0} y={y(a.rocker + 230)} width={halfW * 2} height={y(a.rocker - 50) - y(a.rocker + 230)} rx={10} fill={p.fill(C.steel)} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} strokeWidth={2} />
  ));
  add("winch", (p) => (
    <g fill={p.fill(C.trim)} stroke={p.stroke("#111")} strokeDasharray={p.dash} strokeWidth={1.5}>
      <rect x={cx - 70} y={y(a.rocker + 190)} width={140} height={y(a.rocker + 60) - y(a.rocker + 190)} rx={10} />
      <rect x={cx - 26} y={y(a.rocker + 140)} width={52} height={14} rx={7} fill={p.planned ? "none" : C.steel} />
    </g>
  ));
  add("cooling", (p) => <rect x={cx - halfW * 0.3} y={y(a.hoodF - 70)} width={halfW * 0.6} height={y(a.rocker + 280) - y(a.hoodF - 70)} rx={6} fill="none" stroke={p.planned ? C.planned : C.bodyLight} strokeWidth={3} strokeDasharray={p.dash ?? "2 3"} />);
  add("skid", (p) => <path d={`M ${cx - halfW * 0.55} ${y(a.rocker - 80)} L ${cx + halfW * 0.55} ${y(a.rocker - 80)}`} stroke={p.planned ? C.planned : "#7d8489"} strokeWidth={8} strokeDasharray={p.dash} strokeLinecap="round" />);
  return (
    <g>
      <ellipse cx={cx} cy={GROUND + 4} rx={halfW + 40} ry={10} fill={C.shadow} />
      {Springs(g)}
      {AxleFront(g, shape.frontIfs)}
      {FrontTyres(g, chunky)}
      {/* lower body */}
      <path d={`M ${cx - halfW} ${y(a.rocker + 40)} L ${cx - halfW} ${y(a.hoodF - 40)} Q ${cx - halfW} ${y(a.hoodF)} ${cx - halfW + 20} ${y(a.hoodF)} L ${cx + halfW - 20} ${y(a.hoodF)} Q ${cx + halfW} ${y(a.hoodF)} ${cx + halfW} ${y(a.hoodF - 40)} L ${cx + halfW} ${y(a.rocker + 40)} Z`} fill={C.body} stroke={C.bodyDark} strokeWidth={1.5} />
      {/* hood to cowl */}
      <path d={`M ${cx - halfW * 0.95} ${y(a.hoodF)} L ${cx - halfW * 0.93} ${y(a.belt)} L ${cx + halfW * 0.93} ${y(a.belt)} L ${cx + halfW * 0.95} ${y(a.hoodF)} Z`} fill={C.bodyLight} opacity={0.55} />
      {Cabin(g, false)}
      {/* mirrors */}
      {[-1, 1].map((sd) => (
        <rect key={sd} x={cx + sd * halfW * 1.02 - (sd > 0 ? 0 : 26)} y={y(a.belt + 160)} width={26} height={36} rx={5} fill={C.trim} />
      ))}
      {/* generic grille: horizontal slats (not any brand's design) */}
      <rect x={cx - halfW * 0.34} y={y(a.hoodF - 70)} width={halfW * 0.68} height={y(a.rocker + 280) - y(a.hoodF - 70)} rx={8} fill={C.trim} />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={cx - halfW * 0.3} x2={cx + halfW * 0.3} y1={y(a.hoodF - 70) + ((i + 1) * (y(a.rocker + 280) - y(a.hoodF - 70))) / 6} y2={y(a.hoodF - 70) + ((i + 1) * (y(a.rocker + 280) - y(a.hoodF - 70))) / 6} stroke={C.steel} strokeWidth={3} />
      ))}
      {/* headlights */}
      {[-1, 1].map((sd) =>
        a.roundLights ? (
          <circle key={sd} cx={cx + sd * halfW * 0.66} cy={y(a.hoodF - 160)} r={halfW * 0.16} fill={C.light} stroke={C.trim} strokeWidth={4} />
        ) : (
          <rect key={sd} x={cx + sd * halfW * 0.66 - halfW * 0.22} y={y(a.hoodF - 40)} width={halfW * 0.44} height={y(a.hoodF - 170) - y(a.hoodF - 40)} rx={10} fill={C.light} stroke={C.trim} strokeWidth={3} />
        ),
      )}
      {/* stock bumper + tow points */}
      <rect x={cx - halfW * 0.92} y={y(a.rocker + 200)} width={halfW * 1.84} height={y(a.rocker + 40) - y(a.rocker + 200)} rx={12} fill={C.trim} />
      <circle cx={cx - halfW * 0.62} cy={y(a.rocker - 20)} r={9} fill="none" stroke={C.steel} strokeWidth={5} />
      {out}
      <line x1={0} y1={GROUND + 1} x2={W} y2={GROUND + 1} stroke={C.ground} strokeWidth={2} />
    </g>
  );
}

export function RearView({ shape, overlays }: DrawProps) {
  const g = frontGeometry(shape);
  const { a, cx, halfW, y, R } = g;
  const chunky = overlays.installed.has("bigtyres") || overlays.planned.has("bigtyres");
  const out: React.ReactNode[] = [];
  const add = (key: OverlayKey, fn: (p: NonNullable<ReturnType<typeof paint>>) => React.ReactNode) => {
    const p = paint(overlays, key);
    if (p) out.push(<g key={key} data-overlay={key} data-planned={p.planned || undefined}>{fn(p)}</g>);
  };
  add("roofrack", (p) => <rect x={cx - halfW * 0.86} y={y(a.roof + 95)} width={halfW * 1.72} height={10} rx={3} fill={p.fill(C.steel)} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} />);
  add("recovery", (p) => (
    <g fill={p.planned ? "rgba(217,105,43,0.2)" : C.board} stroke={p.planned ? C.planned : "#8f3d10"} strokeDasharray={p.dash}>
      <rect x={cx + halfW * 0.3} y={y(a.roof - 10)} width={24} height={y(a.belt + 140) - y(a.roof - 10)} rx={6} />
      <rect x={cx + halfW * 0.3 + 30} y={y(a.roof - 10)} width={24} height={y(a.belt + 140) - y(a.roof - 10)} rx={6} />
    </g>
  ));
  add("storage", (p) => (
    <g fill="none" stroke={p.planned ? C.planned : "#e8dfcc"} strokeDasharray={p.dash ?? "5 4"} strokeWidth={2.5}>
      <rect x={cx - halfW * 0.7} y={y(a.belt - 60)} width={halfW * 1.4} height={y(a.rocker + 220) - y(a.belt - 60)} rx={6} />
      <line x1={cx - halfW * 0.7} x2={cx + halfW * 0.7} y1={(y(a.belt - 60) + y(a.rocker + 220)) / 2} y2={(y(a.belt - 60) + y(a.rocker + 220)) / 2} />
    </g>
  ));
  add("bumper", (p) => <rect x={cx - halfW} y={y(a.rocker + 220)} width={halfW * 2} height={y(a.rocker - 40) - y(a.rocker + 220)} rx={10} fill={p.fill(C.steel)} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} />);
  add("locker", (p) => (
    <g>
      <circle cx={cx - g.halfTrack * 0.25} cy={g.axleY} r={34} fill="none" stroke={p.planned ? C.planned : C.board} strokeWidth={3} strokeDasharray={p.dash} />
      <text x={cx - g.halfTrack * 0.25} y={g.axleY + 6} textAnchor="middle" fontSize={18} fontWeight={700} fill={p.planned ? C.planned : C.light}>
        L
      </text>
    </g>
  ));
  return (
    <g>
      <ellipse cx={cx} cy={GROUND + 4} rx={halfW + 40} ry={10} fill={C.shadow} />
      {Springs(g)}
      {AxleFront(g, shape.rearIfs)}
      {FrontTyres(g, chunky)}
      <path d={`M ${cx - halfW} ${y(a.rocker + 40)} L ${cx - halfW} ${y(a.rearStyle === "bed" ? a.bedTop! : a.belt)} L ${cx + halfW} ${y(a.rearStyle === "bed" ? a.bedTop! : a.belt)} L ${cx + halfW} ${y(a.rocker + 40)} Z`} fill={C.body} stroke={C.bodyDark} strokeWidth={1.5} />
      {Cabin(g, true)}
      {/* tailgate seam */}
      <rect x={cx - halfW * 0.78} y={y(a.belt - 20)} width={halfW * 1.56} height={y(a.rocker + 90) - y(a.belt - 20)} rx={6} fill="none" stroke={C.bodyDark} strokeWidth={1.5} />
      {[-1, 1].map((sd) => (
        <rect key={sd} x={cx + sd * halfW * 0.9 - 10} y={y(a.belt - 30)} width={20} height={y(a.rocker + 320) - y(a.belt - 30)} rx={4} fill={C.tail} />
      ))}
      {a.spareRear && (
        <g>
          <circle cx={cx} cy={y(a.belt + 60) + R * 0.95} r={R * 0.95} fill={C.tyre} />
          <circle cx={cx} cy={y(a.belt + 60) + R * 0.95} r={R * 0.55} fill={C.rimDark} />
        </g>
      )}
      <rect x={cx - halfW * 0.92} y={y(a.rocker + 200)} width={halfW * 1.84} height={y(a.rocker + 40) - y(a.rocker + 200)} rx={12} fill={C.trim} />
      <rect x={cx - 18} y={y(a.rocker + 40)} width={36} height={22} fill={C.steel} />
      <circle cx={cx + halfW * 0.62} cy={y(a.rocker - 20)} r={9} fill="none" stroke={C.steel} strokeWidth={5} />
      {out}
      <line x1={0} y1={GROUND + 1} x2={W} y2={GROUND + 1} stroke={C.ground} strokeWidth={2} />
    </g>
  );
}

/* =============================================================== UNDER */

export function UnderView({ shape, overlays }: DrawProps) {
  const g: UnderGeo = underGeometry(shape);
  const { fx, rx, cy, halfW, halfTrack, D, tw, s, wb, rail, x0, xEnd } = g;
  const tc = fx + wb * s * 0.5;
  const out: React.ReactNode[] = [];
  const add = (key: OverlayKey, fn: (p: NonNullable<ReturnType<typeof paint>>) => React.ReactNode) => {
    const p = paint(overlays, key);
    if (p) out.push(<g key={key} data-overlay={key} data-planned={p.planned || undefined}>{fn(p)}</g>);
  };
  add("skid", (p) => (
    <g fill={p.planned ? "rgba(217,105,43,0.16)" : "rgba(125,132,137,0.55)"} stroke={p.planned ? C.planned : "#5f666b"} strokeDasharray={p.dash} strokeWidth={2}>
      <rect x={fx + 12} y={cy - rail * 1.05} width={wb * s * 0.3} height={rail * 2.1} rx={6} />
      <rect x={fx + 14 + wb * s * 0.3} y={cy - rail * 0.75} width={tc + 34 - (fx + 14 + wb * s * 0.3)} height={rail * 1.5} rx={6} />
      <rect x={rx - wb * s * 0.34} y={cy + rail * 0.15} width={wb * s * 0.22} height={rail * 0.9} rx={6} />
    </g>
  ));
  add("sliders", (p) =>
    [-1, 1].map((sd) => (
      <rect key={sd} x={fx + D / 2 + 10} y={cy + sd * (halfW - 8) - 5} width={rx - fx - D - 20} height={10} rx={5} fill={p.fill(C.steel)} stroke={p.stroke(C.trim)} strokeDasharray={p.dash} />
    )),
  );
  add("locker", (p) => (
    <g>
      <circle cx={rx} cy={cy + 22} r={20} fill="none" stroke={p.planned ? C.planned : C.board} strokeWidth={3} strokeDasharray={p.dash} />
      <text x={rx} y={cy + 28} textAnchor="middle" fontSize={16} fontWeight={700} fill={p.planned ? C.planned : C.board}>
        L
      </text>
    </g>
  ));
  const axle = (x: number, ifs: boolean) =>
    ifs ? (
      <g stroke={C.steel} strokeWidth={6} strokeLinecap="round">
        <rect x={x - 16} y={cy - 16} width={32} height={32} rx={6} fill={C.steel} stroke="none" />
        <line x1={x} y1={cy - 16} x2={x} y2={cy - halfTrack + tw / 2} />
        <line x1={x} y1={cy + 16} x2={x} y2={cy + halfTrack - tw / 2} />
        <path d={`M ${x - 30} ${cy - rail} L ${x - 4} ${cy - halfTrack + tw / 2 + 6} L ${x + 22} ${cy - rail}`} fill="none" strokeWidth={4} />
        <path d={`M ${x - 30} ${cy + rail} L ${x - 4} ${cy + halfTrack - tw / 2 - 6} L ${x + 22} ${cy + rail}`} fill="none" strokeWidth={4} />
      </g>
    ) : (
      <g>
        <rect x={x - 7} y={cy - halfTrack + tw / 2} width={14} height={2 * halfTrack - tw} rx={7} fill={C.steel} />
        <circle cx={x} cy={cy + 22} r={18} fill={C.steel} stroke={C.trim} strokeWidth={2} />
      </g>
    );
  return (
    <g>
      <rect x={x0} y={cy - halfW} width={xEnd - x0} height={halfW * 2} rx={26} fill="#efe8d9" stroke={C.ground} strokeWidth={2} />
      {/* frame rails */}
      {[-1, 1].map((sd) => (
        <rect key={sd} x={x0 + 12} y={cy + sd * rail - 6} width={xEnd - x0 - 24} height={12} rx={4} fill={C.chassis} />
      ))}
      {/* exhaust */}
      <path d={`M ${fx + wb * s * 0.15} ${cy - rail * 0.6} L ${tc} ${cy - rail * 1.4} L ${xEnd - 30} ${cy - rail * 1.4}`} fill="none" stroke="#8b8478" strokeWidth={6} strokeLinecap="round" />
      {/* fuel tank */}
      <rect x={rx - wb * s * 0.33} y={cy + rail * 0.2} width={wb * s * 0.2} height={rail * 0.8} rx={8} fill="#6a6f74" />
      {/* engine, trans, transfer */}
      <rect x={fx + 24} y={cy - rail * 0.9} width={wb * s * 0.28} height={rail * 1.8} rx={10} fill="#565b60" />
      <rect x={fx + 24 + wb * s * 0.28} y={cy - rail * 0.45} width={tc - 14 - (fx + 24 + wb * s * 0.28)} height={rail * 0.9} rx={8} fill="#62676c" />
      <rect x={tc - 14} y={cy - rail * 0.5} width={36} height={rail} rx={6} fill="#4d5257" />
      {/* driveshafts */}
      <line x1={tc + 22} y1={cy + 4} x2={rx - 20} y2={cy + 18} stroke={C.steel} strokeWidth={7} strokeLinecap="round" />
      <line x1={tc - 14} y1={cy + 8} x2={fx + 20} y2={cy + 18} stroke={C.steel} strokeWidth={6} strokeLinecap="round" />
      {/* steering tie rod */}
      <line x1={fx - 26} y1={cy - halfTrack + tw} x2={fx - 26} y2={cy + halfTrack - tw} stroke={C.steel} strokeWidth={4} />
      {axle(fx, shape.frontIfs)}
      {axle(rx, shape.rearIfs)}
      {/* wheels + brakes */}
      {[fx, rx].flatMap((x) =>
        [-1, 1].map((sd) => (
          <g key={`${x}${sd}`}>
            <rect x={x - D / 2} y={cy + sd * halfTrack - tw / 2} width={D} height={tw} rx={tw * 0.3} fill={C.tyre} />
            <rect x={x - 10} y={cy + sd * (halfTrack - tw / 2 - 9) - 6} width={20} height={12} rx={3} fill="#9a3b2e" opacity={0.75} />
          </g>
        )),
      )}
      {/* recovery points at frame ends */}
      {[
        [x0 + 6, cy - rail],
        [x0 + 6, cy + rail],
        [xEnd - 6, cy + rail],
      ].map(([x, yy], i) => (
        <circle key={i} cx={x} cy={yy} r={7} fill="none" stroke={C.trim} strokeWidth={4} />
      ))}
      {out}
      <text x={x0 - 8} y={cy} fontSize={13} fill="#6a7075" textAnchor="end" dominantBaseline="middle">
        חזית
      </text>
    </g>
  );
}

export function VehicleSvg({ view, shape, overlays, title, className }: { view: "side" | "front" | "rear" | "under"; shape: ShapeInput; overlays: OverlayState; title?: string; className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title ?? "איור רכב כללי"} className={className}>
      {view === "side" && <SideView shape={shape} overlays={overlays} />}
      {view === "front" && <FrontView shape={shape} overlays={overlays} />}
      {view === "rear" && <RearView shape={shape} overlays={overlays} />}
      {view === "under" && <UnderView shape={shape} overlays={overlays} />}
    </svg>
  );
}
