import { describe, it, expect } from "vitest";
import { computeReminder, computeReminders, completeTask, type TaskInput } from "@/lib/reminders";
import { addMonths } from "@/lib/units";

const base: TaskInput = {
  id: "t1",
  title: "החלפת שמן",
  kind: "user",
  intervalKm: 10000,
  intervalMonths: 12,
  dueOn: null,
  dueKm: null,
  lastDoneOn: "2026-01-15",
  lastDoneKm: 40000,
  active: true,
};

describe("date and mileage reminders", () => {
  it("computes next due from the last service by date and by km", () => {
    const r = computeReminder(base, { km: 45000, recordedOn: "2026-06-01" }, "2026-06-01");
    expect(r.nextDueOn).toBe("2027-01-15");
    expect(r.nextDueKm).toBe(50000);
    expect(r.status).toBe("ok");
  });

  it("uses whichever comes first — km overdue even though the date is far", () => {
    const r = computeReminder(base, { km: 50500, recordedOn: "2026-06-01" }, "2026-06-01");
    expect(r.status).toBe("overdue");
    expect(r.kmLeft).toBe(-500);
  });

  it("is due soon within 30 days or 1,000 km", () => {
    expect(computeReminder(base, { km: 45000, recordedOn: "2026-12-20" }, "2026-12-20").status).toBe("due_soon");
    expect(computeReminder(base, { km: 49200, recordedOn: "2026-03-01" }, "2026-03-01").status).toBe("due_soon");
  });

  it("is overdue by date when km is fine", () => {
    expect(computeReminder(base, { km: 41000, recordedOn: "2027-02-01" }, "2027-02-01").status).toBe("overdue");
  });

  it("does not invent mileage: km-only task with no odometer reading is unknown", () => {
    const kmOnly = { ...base, intervalMonths: null };
    const r = computeReminder(kmOnly, null, "2026-06-01");
    expect(r.status).toBe("unknown");
    expect(r.reason).toMatch(/קילומטראז/);
  });

  it("flags stale odometer readings (older than 60 days)", () => {
    const r = computeReminder(base, { km: 45000, recordedOn: "2026-01-01" }, "2026-06-01");
    expect(r.mileageStale).toBe(true);
  });

  it("asks for history when the task has never been done", () => {
    const r = computeReminder({ ...base, lastDoneOn: null, lastDoneKm: null }, { km: 1, recordedOn: "2026-01-01" }, "2026-01-01");
    expect(r.status).toBe("unknown");
  });

  it("restarts a recurring task from the service that completed it", () => {
    const done = completeTask(base, "2026-07-01", 48000);
    expect(done.active).toBe(true);
    const r = computeReminder(done, { km: 48000, recordedOn: "2026-07-01" }, "2026-07-01");
    expect(r.nextDueOn).toBe("2027-07-01");
    expect(r.nextDueKm).toBe(58000);
  });

  it("does not keep a stale km baseline when the service km is unknown", () => {
    const done = completeTask(base, "2026-07-01", null);
    expect(done.lastDoneKm).toBeNull();
  });

  it("deactivates one-off tasks once done", () => {
    const oneOff: TaskInput = { ...base, intervalKm: null, intervalMonths: null, dueOn: "2026-08-01", lastDoneOn: null, lastDoneKm: null };
    expect(completeTask(oneOff, "2026-07-20", null).active).toBe(false);
  });

  it("sorts overdue first and skips inactive tasks", () => {
    const list = computeReminders(
      [
        { ...base, id: "ok" },
        { ...base, id: "late", dueOn: "2026-01-01", intervalMonths: null, intervalKm: null },
        { ...base, id: "off", active: false },
      ],
      { km: 41000, recordedOn: "2026-02-01" },
      "2026-02-01",
    );
    expect(list.map((r) => r.task.id)).toEqual(["late", "ok"]);
  });

  it("handles month-end dates", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });
});
