/**
 * Units & formatting: shekels, kilometres, centimetres, litres, tyre sizes, PSI/bar.
 * Numbers are wrapped in LTR isolation (⁦ … ⁩) when embedded in Hebrew text so that
 * mixed RTL/LTR strings like "285/70R17" and ranges render in the correct order.
 */

export const LRI = "⁦";
export const PDI = "⁩";
export const ltr = (s: string) => `${LRI}${s}${PDI}`;

const nf = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 });

export function formatIls(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "לא ידוע";
  return `${nf.format(Math.round(n))} ₪`;
}

export function formatIlsRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return "לא ידוע";
  if (min != null && max != null && max !== min) return `${ltr(`${nf.format(min)}–${nf.format(max)}`)} ₪`;
  return formatIls(min ?? max);
}

export function formatKm(n: number | null | undefined): string {
  if (n == null) return "לא ידוע";
  return `${nf.format(n)} ק״מ`;
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return digits ? nf1.format(n) : nf.format(n);
}

const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jerusalem" });
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "לא ידוע";
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d) : d;
  if (Number.isNaN(date.getTime())) return "לא ידוע";
  return dateFmt.format(date);
}

export function todayIso(now = new Date()): string {
  // Israel local date
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------- pressure */

export const PSI_PER_BAR = 14.5038;
export const psiToBar = (psi: number) => psi / PSI_PER_BAR;
export const barToPsi = (bar: number) => bar * PSI_PER_BAR;

export function formatPressure(psi: number, unit: "psi" | "bar") {
  return unit === "psi" ? `${Math.round(psi)} PSI` : `${psiToBar(psi).toFixed(2)} bar`;
}

/* ------------------------------------------------------------------- tyres */

export type TyreSize = {
  /** canonical display string */
  label: string;
  system: "metric" | "flotation";
  widthMm: number;
  rimIn: number;
  /** overall diameter (nominal, unloaded) */
  diameterMm: number;
  sidewallMm: number;
  aspect?: number;
  lightTruck?: boolean;
};

const IN = 25.4;

/**
 * Parses common tyre notations:
 *   metric:    265/70R17, LT285/70R17, 255/75 R17, P235/75R15, 265/65-17
 *   flotation: 35x12.50R17, 33X12.5R15, 35×12.50 R17 LT
 * Returns null when the string is not a recognised size.
 */
export function parseTyreSize(raw: string | null | undefined): TyreSize | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/×/g, "X").replace(/\s+/g, "");
  let m = s.match(/^(LT|P)?(\d{3})\/(\d{2})(?:Z?R|-|D|B)(\d{2}(?:\.5)?)(?:LT|C)?/);
  if (m) {
    const width = +m[2];
    const aspect = +m[3];
    const rim = +m[4];
    if (width < 125 || width > 405 || aspect < 25 || aspect > 95 || rim < 12 || rim > 26) return null;
    const sidewall = (width * aspect) / 100;
    return {
      label: `${m[1] === "LT" ? "LT" : ""}${width}/${aspect}R${rim}`,
      system: "metric",
      widthMm: width,
      aspect,
      rimIn: rim,
      sidewallMm: sidewall,
      diameterMm: rim * IN + 2 * sidewall,
      lightTruck: m[1] === "LT" || /LT$/.test(s),
    };
  }
  m = s.match(/^(\d{2}(?:\.\d)?)X(\d{1,2}(?:\.\d{1,2})?)(?:R|-)(\d{2}(?:\.5)?)(LT)?$/);
  if (m) {
    const dia = +m[1];
    const width = +m[2];
    const rim = +m[3];
    if (dia < 24 || dia > 44 || width < 7 || width > 17 || rim < 13 || rim > 24 || dia <= rim) return null;
    return {
      label: `${dia}x${m[2]}R${rim}`,
      system: "flotation",
      widthMm: width * IN,
      rimIn: rim,
      diameterMm: dia * IN,
      sidewallMm: ((dia - rim) * IN) / 2,
      lightTruck: true,
    };
  }
  return null;
}

export function tyreDiameterIn(t: TyreSize) {
  return t.diameterMm / IN;
}

export type TyreComparison = {
  from: TyreSize;
  to: TyreSize;
  diameterDiffMm: number;
  diameterDiffPct: number;
  /** nominal ground-clearance change at the axle (half the diameter change) */
  axleClearanceChangeMm: number;
  /** speedometer reads X when actually driving 100 km/h-equivalent: actual = shown * ratio */
  actualSpeedAtShown100: number;
};

/** Nominal geometry only — real loaded diameter varies by brand, load and pressure. */
export function compareTyres(fromRaw: string, toRaw: string): TyreComparison | null {
  const from = parseTyreSize(fromRaw);
  const to = parseTyreSize(toRaw);
  if (!from || !to) return null;
  const diff = to.diameterMm - from.diameterMm;
  return {
    from,
    to,
    diameterDiffMm: diff,
    diameterDiffPct: (diff / from.diameterMm) * 100,
    axleClearanceChangeMm: diff / 2,
    actualSpeedAtShown100: (100 * to.diameterMm) / from.diameterMm,
  };
}

export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (inch: number) => inch * 2.54;
