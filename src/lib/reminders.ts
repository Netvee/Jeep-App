/**
 * Date- and mileage-based reminder computation.
 * Mileage is never extrapolated: if the odometer was not recorded, km-based status is "unknown".
 */
import { addMonths, daysBetween } from "./units";

export type TaskInput = {
  id: string;
  title: string;
  kind: "official" | "user" | "suggestion";
  intervalKm: number | null;
  intervalMonths: number | null;
  dueOn: string | null;
  dueKm: number | null;
  lastDoneOn: string | null;
  lastDoneKm: number | null;
  active: boolean;
};

export type MileageState = { km: number; recordedOn: string } | null;

export type ReminderStatus = "overdue" | "due_soon" | "ok" | "unknown";

export type ReminderResult = {
  task: TaskInput;
  status: ReminderStatus;
  nextDueOn: string | null;
  nextDueKm: number | null;
  daysLeft: number | null;
  kmLeft: number | null;
  /** human explanation of which trigger drives the status */
  reason: string;
  /** km-based status could not be computed because mileage is unknown */
  mileageUnknown: boolean;
  /** mileage reading is older than 60 days */
  mileageStale: boolean;
};

export const SOON_DAYS = 30;
export const SOON_KM = 1000;

const rank: Record<ReminderStatus, number> = { overdue: 0, due_soon: 1, unknown: 2, ok: 3 };

export function computeReminder(task: TaskInput, mileage: MileageState, today: string): ReminderResult {
  // Next due date
  let nextDueOn: string | null = task.dueOn;
  if (!nextDueOn && task.intervalMonths && task.lastDoneOn) nextDueOn = addMonths(task.lastDoneOn, task.intervalMonths);
  // Next due km
  let nextDueKm: number | null = task.dueKm;
  if (nextDueKm == null && task.intervalKm && task.lastDoneKm != null) nextDueKm = task.lastDoneKm + task.intervalKm;

  const daysLeft = nextDueOn ? daysBetween(today, nextDueOn) : null;
  const kmLeft = nextDueKm != null && mileage ? nextDueKm - mileage.km : null;
  const mileageUnknown = nextDueKm != null && !mileage;
  const mileageStale = !!mileage && daysBetween(mileage.recordedOn, today) > 60;

  let dateStatus: ReminderStatus = "unknown";
  if (daysLeft != null) dateStatus = daysLeft < 0 ? "overdue" : daysLeft <= SOON_DAYS ? "due_soon" : "ok";
  let kmStatus: ReminderStatus = "unknown";
  if (kmLeft != null) kmStatus = kmLeft < 0 ? "overdue" : kmLeft <= SOON_KM ? "due_soon" : "ok";

  const hasDate = daysLeft != null;
  const hasKm = kmLeft != null;
  let status: ReminderStatus;
  let reason: string;
  if (!hasDate && !hasKm) {
    status = "unknown";
    if (nextDueKm != null && !mileage) reason = "אין קריאת מד-אוץ — עדכנו קילומטראז׳ כדי לחשב";
    else if (!task.lastDoneOn && task.lastDoneKm == null && !task.dueOn && task.dueKm == null)
      reason = "לא תועד מתי בוצע לאחרונה — הוסיפו תאריך או ק״מ אחרון";
    else reason = "אין מספיק נתונים לחישוב";
  } else {
    // whichever comes first
    status = rank[dateStatus] <= rank[kmStatus] ? dateStatus : kmStatus;
    if (!hasDate) status = kmStatus;
    if (!hasKm) status = dateStatus;
    const parts: string[] = [];
    if (hasDate) parts.push(daysLeft! < 0 ? `באיחור של ${-daysLeft!} ימים` : `בעוד ${daysLeft} ימים`);
    if (hasKm) parts.push(kmLeft! < 0 ? `חריגה של ${-kmLeft!} ק״מ` : `בעוד ${kmLeft} ק״מ`);
    if (mileageUnknown) parts.push("ק״מ לא ידוע");
    reason = parts.join(" · ") + (hasDate && hasKm ? " (המוקדם מביניהם)" : "");
  }
  return { task, status, nextDueOn, nextDueKm, daysLeft, kmLeft, reason, mileageUnknown, mileageStale };
}

export function computeReminders(tasks: TaskInput[], mileage: MileageState, today: string): ReminderResult[] {
  return tasks
    .filter((t) => t.active)
    .map((t) => computeReminder(t, mileage, today))
    .sort((a, b) => rank[a.status] - rank[b.status] || (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));
}

/** When a service record completes a task, the task restarts from that service. */
export function completeTask(task: TaskInput, doneOn: string, doneKm: number | null): TaskInput {
  const recurring = task.intervalKm != null || task.intervalMonths != null;
  return {
    ...task,
    lastDoneOn: doneOn,
    // unknown km at service → km-based due becomes unknown rather than silently wrong
    lastDoneKm: doneKm,
    // one-off tasks are deactivated once done
    active: recurring ? task.active : false,
    dueOn: recurring ? null : task.dueOn,
    dueKm: recurring ? null : task.dueKm,
  };
}
