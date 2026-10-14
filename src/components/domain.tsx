import type { ReminderResult, ReminderStatus } from "@/lib/reminders";
import type { CostSummary, PlanTotals } from "@/lib/costs";
import { COST_KIND_LABEL, budgetStatus, totalLabelParts } from "@/lib/costs";
import { formatIls, formatIlsRange, formatDate, formatKm } from "@/lib/units";
import { Badge } from "./ui";

const REM_TONE: Record<ReminderStatus, "danger" | "warn" | "olive" | "neutral"> = { overdue: "danger", due_soon: "warn", ok: "olive", unknown: "neutral" };
const REM_LABEL: Record<ReminderStatus, string> = { overdue: "באיחור", due_soon: "בקרוב", ok: "תקין", unknown: "חסר מידע" };
const KIND_LABEL = { official: "מרווח יצרן (מקור מצוטט)", user: "הוגדר על ידי הבעלים", suggestion: "המלצת בדיקה כללית" } as const;

export function ReminderBadge({ status }: { status: ReminderStatus }) {
  return <Badge tone={REM_TONE[status]}>{REM_LABEL[status]}</Badge>;
}

export function TaskKindBadge({ kind }: { kind: keyof typeof KIND_LABEL }) {
  return <Badge tone={kind === "official" ? "olive" : kind === "user" ? "info" : "neutral"}>{KIND_LABEL[kind]}</Badge>;
}

export function ReminderLine({ r }: { r: ReminderResult }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{r.task.title}</span>
        <ReminderBadge status={r.status} />
      </div>
      <div className="text-xs text-charcoal-500 mt-0.5">
        {r.reason}
        {r.nextDueOn && ` · יעד: ${formatDate(r.nextDueOn)}`}
        {r.nextDueKm != null && ` · יעד: ${formatKm(r.nextDueKm)}`}
        {r.mileageStale && " · קריאת הק״מ ישנה מ-60 יום"}
      </div>
    </div>
  );
}

export function CostSummaryView({ s, compact }: { s: CostSummary; compact?: boolean }) {
  const hasKnown = s.anyKnown;
  return (
    <div className="text-sm">
      <div className="font-semibold text-charcoal-900">
        {hasKnown ? formatIlsRange(s.min, s.max) : "עלות לא ידועה"}
        {!s.complete && hasKnown && <span className="font-normal text-warn-700"> + רכיבים לא ידועים</span>}
      </div>
      {!compact && !s.complete && <div className="text-xs text-warn-700">לא ידוע: {s.unknownKinds.map((k) => COST_KIND_LABEL[k]).join(", ")}</div>}
      {!compact && s.vatUncertain && hasKnown && <div className="text-xs text-charcoal-500">מצב מע״מ לא אחיד/לא ידוע בחלק מהסכומים</div>}
      {!compact && s.hasEstimates && <div className="text-xs text-charcoal-500">כולל הערכות</div>}
    </div>
  );
}

export function BudgetBar({ budget, totals }: { budget: number | null; totals: PlanTotals }) {
  const status = budgetStatus(budget, totals);
  const pctMin = budget ? Math.min(100, (totals.min / budget) * 100) : 0;
  const pctMax = budget ? Math.min(100, (totals.max / budget) * 100) : 0;
  const msg = {
    no_budget: "לא הוגדר תקציב",
    over: "גם ההערכה הנמוכה חורגת מהתקציב",
    at_risk: "ההערכה הגבוהה חורגת מהתקציב",
    within: "בתוך התקציב",
    within_known_only: "הסכומים הידועים בתוך התקציב — אך יש עלויות לא ידועות",
  }[status];
  const tone = status === "over" ? "bg-danger-700" : status === "at_risk" || status === "within_known_only" ? "bg-warn-700" : "bg-olive-600";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <TotalText t={totals} />
        <span className="text-charcoal-500">תקציב: {budget != null ? formatIls(budget) : "—"}</span>
      </div>
      {budget != null && (
        <div className="relative h-3 rounded-full bg-sand-200 mt-2 overflow-hidden" role="img" aria-label={`ניצול תקציב ${Math.round(pctMin)}–${Math.round(pctMax)} אחוז`}>
          <div className={`absolute inset-y-0 start-0 ${tone} opacity-40`} style={{ width: `${pctMax}%` }} />
          <div className={`absolute inset-y-0 start-0 ${tone}`} style={{ width: `${pctMin}%` }} />
        </div>
      )}
      <p className="text-xs text-charcoal-600 mt-1.5">
        {msg}
        {totals.upgradesWithUnknowns > 0 && ` · ל-${totals.upgradesWithUnknowns} מתוך ${totals.upgradesCount} שדרוגים חסרים רכיבי עלות`}
      </p>
    </div>
  );
}

export function TotalText({ t }: { t: { min: number; max: number; complete: boolean; anyKnown: boolean } }) {
  const p = totalLabelParts(t);
  if (!p.known) return <span className="font-semibold text-warn-700">עלות לא ידועה</span>;
  return (
    <span className="font-semibold">
      {p.known}
      {p.unknown && <span className="text-warn-700 font-normal"> + לא ידוע</span>}
    </span>
  );
}
