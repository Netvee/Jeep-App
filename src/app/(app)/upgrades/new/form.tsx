"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { addUpgradeAction } from "@/app/actions/upgrades";
import { COMPONENTS, SYSTEMS } from "@/lib/components";
import { PHASE_LABEL, UPGRADE_STATUS_LABEL } from "@/lib/labels";

export function NewUpgradeForm({ vehicleId, today, defaults }: { vehicleId: string; today: string; defaults: { status?: string; name?: string; component?: string; phase?: string } }) {
  const [status, setStatus] = useState(defaults.status ?? "wishlist");
  return (
    <ActionForm action={addUpgradeAction} className="flex flex-col gap-4">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="שם השדרוג" htmlFor="customName">
        <Input id="customName" name="customName" required defaultValue={defaults.name ?? ""} />
      </Field>
      <Field label="רכיב ברכב" htmlFor="componentKey" hint="קובע היכן השדרוג יופיע באיור ובפאנל הרכיב">
        <Select id="componentKey" name="componentKey" required defaultValue={defaults.component ?? ""}>
          <option value="" disabled>
            בחרו רכיב
          </option>
          {SYSTEMS.map((s) => (
            <optgroup key={s.key} label={s.label}>
              {COMPONENTS.filter((c) => c.system === s.key).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="סטטוס" htmlFor="status">
          <Select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {(["wishlist", "planned", "purchased", "installed"] as const).map((k) => (
              <option key={k} value={k}>
                {UPGRADE_STATUS_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="שלב" htmlFor="phase">
          <Select id="phase" name="phase" defaultValue={defaults.phase ?? ""}>
            <option value="">ללא</option>
            {Object.entries(PHASE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="עדיפות" htmlFor="priority">
          <Select id="priority" name="priority" defaultValue="3">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {status === "installed" && (
        <fieldset className="grid gap-4 sm:grid-cols-3 rounded-xl bg-olive-100/50 border border-olive-200 p-4">
          <legend className="text-sm font-semibold px-1">פרטי התקנה</legend>
          <Field label="תאריך התקנה" htmlFor="installedOn">
            <Input id="installedOn" name="installedOn" type="date" max={today} />
          </Field>
          <Field label="ק״מ בהתקנה" htmlFor="installedKm">
            <Input id="installedKm" name="installedKm" type="number" inputMode="numeric" min={0} />
          </Field>
          <Field label="הותקן על ידי" htmlFor="installedBy">
            <Input id="installedBy" name="installedBy" placeholder="מוסך / עצמי" />
          </Field>
        </fieldset>
      )}
      <Field label="קבוצת חלופות" htmlFor="alternativeGroup">
        <Input id="alternativeGroup" name="alternativeGroup" />
      </Field>
      <Field label="למה / הערות" htmlFor="reason">
        <Textarea id="reason" name="reason" />
      </Field>
      <SubmitButton>שמירה</SubmitButton>
    </ActionForm>
  );
}
