"use client";

import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/forms";
import { createTaskAction, updateTaskAction, markTaskDoneAction } from "@/app/actions/maintenance";

type Task = {
  id: string;
  title: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  dueOn: string | null;
  dueKm: number | null;
  lastDoneOn: string | null;
  lastDoneKm: number | null;
  notes: string | null;
  sourceRef: string | null;
};

export function TaskForm({ vehicleId, task }: { vehicleId: string; task?: Task }) {
  const p = task?.id ?? "new";
  return (
    <ActionForm action={task ? updateTaskAction : createTaskAction} resetOnSuccess={!task} className="flex flex-col gap-3 mt-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {task && <input type="hidden" name="taskId" value={task.id} />}
      <Field label="מה לבצע" htmlFor={`t-${p}`}>
        <Input id={`t-${p}`} name="title" required defaultValue={task?.title} placeholder="למשל: החלפת שמן מנוע" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="כל X ק״מ" htmlFor={`ik-${p}`}>
          <Input id={`ik-${p}`} name="intervalKm" type="number" inputMode="numeric" min={100} defaultValue={task?.intervalKm ?? ""} />
        </Field>
        <Field label="כל X חודשים" htmlFor={`im-${p}`}>
          <Input id={`im-${p}`} name="intervalMonths" type="number" inputMode="numeric" min={1} defaultValue={task?.intervalMonths ?? ""} />
        </Field>
        <Field label="בוצע לאחרונה (תאריך)" htmlFor={`ld-${p}`}>
          <Input id={`ld-${p}`} name="lastDoneOn" type="date" defaultValue={task?.lastDoneOn ?? ""} />
        </Field>
        <Field label="בוצע לאחרונה (ק״מ)" htmlFor={`lk-${p}`}>
          <Input id={`lk-${p}`} name="lastDoneKm" type="number" inputMode="numeric" min={0} defaultValue={task?.lastDoneKm ?? ""} />
        </Field>
      </div>
      <p className="text-xs text-charcoal-500">או משימה חד-פעמית:</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="עד תאריך" htmlFor={`do-${p}`}>
          <Input id={`do-${p}`} name="dueOn" type="date" defaultValue={task?.dueOn ?? ""} />
        </Field>
        <Field label="עד ק״מ" htmlFor={`dk-${p}`}>
          <Input id={`dk-${p}`} name="dueKm" type="number" inputMode="numeric" min={0} defaultValue={task?.dueKm ?? ""} />
        </Field>
      </div>
      <Field label="מקור/הערה" htmlFor={`sr-${p}`} hint="למשל: ספר השירות עמ׳ 12. תזכורת זו תסומן כ״הוגדר על ידי הבעלים״.">
        <Input id={`sr-${p}`} name="sourceRef" defaultValue={task?.sourceRef ?? ""} />
      </Field>
      <Field label="הערות" htmlFor={`n-${p}`}>
        <Textarea id={`n-${p}`} name="notes" rows={2} defaultValue={task?.notes ?? ""} />
      </Field>
      <SubmitButton variant="secondary">{task ? "שמירה" : "הוספת תזכורת"}</SubmitButton>
    </ActionForm>
  );
}

export function DoneForm({ taskId, today, km }: { taskId: string; today: string; km: number | null }) {
  return (
    <ActionForm action={markTaskDoneAction} className="flex flex-wrap items-end gap-2 mt-3">
      <input type="hidden" name="taskId" value={taskId} />
      <Field label="תאריך" htmlFor={`dd-${taskId}`}>
        <Input id={`dd-${taskId}`} name="doneOn" type="date" defaultValue={today} max={today} />
      </Field>
      <Field label="ק״מ" htmlFor={`dkm-${taskId}`}>
        <Input id={`dkm-${taskId}`} name="km" type="number" inputMode="numeric" min={0} placeholder={km != null ? `אחרון: ${km}` : ""} className="w-36" />
      </Field>
      <SubmitButton variant="secondary">בוצע</SubmitButton>
    </ActionForm>
  );
}
