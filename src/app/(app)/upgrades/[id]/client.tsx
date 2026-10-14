"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { setCostLineAction, markInstalledAction, updateUpgradeAction, addQuoteAction } from "@/app/actions/upgrades";
import { COST_KIND_LABEL, COST_SOURCE_LABEL } from "@/lib/costs";
import { PHASE_LABEL, UPGRADE_STATUS_LABEL } from "@/lib/labels";
import type { CostKind } from "@/db/schema";

type Line = { amountMin: number | null; amountMax: number | null; includesVat: boolean | null; source: string; notApplicable: boolean; note: string | null } | null;

export function CostLineEditor({ upgradeId, kind, line, today }: { upgradeId: string; kind: CostKind; line: Line; today: string }) {
  const [mode, setMode] = useState(line?.notApplicable ? "na" : line ? "amount" : "unknown");
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-olive-700 min-h-8 inline-flex items-center">עריכה</summary>
      <ActionForm action={setCostLineAction} className="mt-2 flex flex-col gap-3">
        <input type="hidden" name="upgradeId" value={upgradeId} />
        <input type="hidden" name="kind" value={kind} />
        <div role="radiogroup" aria-label={`מצב ${COST_KIND_LABEL[kind]}`} className="flex flex-wrap gap-2 text-sm">
          {(
            [
              ["amount", "סכום"],
              ["unknown", "לא ידוע"],
              ["na", "לא רלוונטי"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-3 min-h-9 cursor-pointer has-[:checked]:bg-sand-200">
              <input type="radio" name="mode" value={k} checked={mode === k} onChange={() => setMode(k)} className="accent-olive-600" />
              {l}
            </label>
          ))}
        </div>
        {mode === "amount" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Field label="מ- (₪)" htmlFor={`min-${kind}`}>
              <Input id={`min-${kind}`} name="amountMin" type="number" inputMode="numeric" min={0} defaultValue={line?.amountMin ?? ""} />
            </Field>
            <Field label="עד (₪)" htmlFor={`max-${kind}`}>
              <Input id={`max-${kind}`} name="amountMax" type="number" inputMode="numeric" min={0} defaultValue={line?.amountMax ?? ""} />
            </Field>
            <Field label="מקור" htmlFor={`src-${kind}`}>
              <Select id={`src-${kind}`} name="source" defaultValue={line?.source ?? "estimate"}>
                {Object.entries(COST_SOURCE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="מע״מ" htmlFor={`vat-${kind}`}>
              <Select id={`vat-${kind}`} name="includesVat" defaultValue={line?.includesVat == null ? "" : String(line.includesVat)}>
                <option value="">לא ידוע</option>
                <option value="true">כולל</option>
                <option value="false">לפני מע״מ</option>
              </Select>
            </Field>
            <Field label="תאריך" htmlFor={`d-${kind}`}>
              <Input id={`d-${kind}`} name="recordedOn" type="date" defaultValue={today} max={today} />
            </Field>
            <Field label="הערה" htmlFor={`n-${kind}`} className="col-span-1 sm:col-span-3">
              <Input id={`n-${kind}`} name="note" defaultValue={line?.note ?? ""} />
            </Field>
          </div>
        )}
        <SubmitButton variant="secondary" className="self-start">
          שמירה
        </SubmitButton>
      </ActionForm>
    </details>
  );
}

export function InstallForm({ upgradeId, today, canApplyToProfile }: { upgradeId: string; today: string; canApplyToProfile: boolean }) {
  return (
    <ActionForm action={markInstalledAction} className="flex flex-col gap-3">
      <input type="hidden" name="upgradeId" value={upgradeId} />
      <Field label="תאריך התקנה" htmlFor="installedOn">
        <Input id="installedOn" name="installedOn" type="date" defaultValue={today} max={today} required />
      </Field>
      <Field label="ק״מ בהתקנה" htmlFor="installedKm" hint="יירשם גם כקריאת מד-אוץ">
        <Input id="installedKm" name="installedKm" type="number" inputMode="numeric" min={0} />
      </Field>
      <Field label="הותקן על ידי" htmlFor="installedBy">
        <Input id="installedBy" name="installedBy" placeholder="מוסך / עצמי" />
      </Field>
      <Field label="קבלה (לא חובה)" htmlFor="receipt">
        <input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-3 file:py-2" />
      </Field>
      {canApplyToProfile && (
        <label className="inline-flex items-start gap-2 text-sm">
          <input type="checkbox" name="applyToProfile" defaultChecked className="size-4 mt-1 accent-olive-600" />
          לעדכן בפרופיל הרכב הגבהה/מידת צמיג לפי הפריט (ערכים נומינליים)
        </label>
      )}
      <SubmitButton>העברה לרכב כמותקן</SubmitButton>
    </ActionForm>
  );
}

export function EditUpgradeForm({
  upgrade,
  isCustom,
}: {
  upgrade: { id: string; status: string; phase: string | null; priority: number; alternativeGroup: string | null; reason: string | null; notes: string | null; customName: string | null };
  isCustom: boolean;
}) {
  return (
    <ActionForm action={updateUpgradeAction} className="flex flex-col gap-3">
      <input type="hidden" name="upgradeId" value={upgrade.id} />
      {isCustom && (
        <Field label="שם" htmlFor="customName">
          <Input id="customName" name="customName" defaultValue={upgrade.customName ?? ""} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="סטטוס" htmlFor="st">
          <Select id="st" name="status" defaultValue={upgrade.status}>
            {(upgrade.status === "installed" ? (["installed", "removed"] as const) : (["wishlist", "planned", "quoted", "purchased", "removed"] as const)).map((k) => (
              <option key={k} value={k}>
                {UPGRADE_STATUS_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="עדיפות" htmlFor="pr">
          <Select id="pr" name="priority" defaultValue={String(upgrade.priority)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="שלב" htmlFor="ph">
        <Select id="ph" name="phase" defaultValue={upgrade.phase ?? ""}>
          <option value="">ללא</option>
          {Object.entries(PHASE_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="קבוצת חלופות" htmlFor="ag">
        <Input id="ag" name="alternativeGroup" defaultValue={upgrade.alternativeGroup ?? ""} />
      </Field>
      <Field label="למה זה רלוונטי" htmlFor="rs">
        <Textarea id="rs" name="reason" rows={2} defaultValue={upgrade.reason ?? ""} />
      </Field>
      <Field label="הערות" htmlFor="nt">
        <Textarea id="nt" name="notes" rows={2} defaultValue={upgrade.notes ?? ""} />
      </Field>
      <SubmitButton variant="secondary">שמירה</SubmitButton>
    </ActionForm>
  );
}

export function QuoteForm({ vehicleId, upgradeId, workshops, today }: { vehicleId: string; upgradeId?: string; workshops: { id: string; name: string }[]; today: string }) {
  const [rows, setRows] = useState(2);
  return (
    <ActionForm action={addQuoteAction} resetOnSuccess className="flex flex-col gap-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {upgradeId && <input type="hidden" name="upgradeId" value={upgradeId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="כותרת" htmlFor="q-title">
          <Input id="q-title" name="title" required placeholder="למשל: הצעה להתקנת הגבהה" />
        </Field>
        <Field label="מוסך" htmlFor="q-ws">
          <Input id="q-ws" name="workshopName" list="ws-list" placeholder="שם המוסך" />
          <datalist id="ws-list">
            {workshops.map((w) => (
              <option key={w.id} value={w.name} />
            ))}
          </datalist>
        </Field>
        <Field label="תאריך ההצעה" htmlFor="q-date">
          <Input id="q-date" name="quotedOn" type="date" defaultValue={today} />
        </Field>
        <Field label="בתוקף עד" htmlFor="q-valid">
          <Input id="q-valid" name="validUntil" type="date" />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium mb-1">שורות</legend>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_7rem] sm:grid-cols-[1fr_8rem_9rem] gap-2">
            <Input name="itemDesc" aria-label={`תיאור שורה ${i + 1}`} placeholder="תיאור" />
            <Input name="itemAmount" aria-label={`סכום שורה ${i + 1}`} type="number" inputMode="numeric" min={0} placeholder="₪ (ריק = לא צוין)" />
            <Select name="itemKind" aria-label={`סוג שורה ${i + 1}`} defaultValue={i === 0 ? "part" : "labour"} className="col-span-2 sm:col-span-1">
              {Object.entries(COST_KIND_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        ))}
        <button type="button" onClick={() => setRows((r) => Math.min(r + 1, 20))} className="self-start text-sm text-olive-700 underline min-h-9">
          + שורה
        </button>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="מע״מ" htmlFor="q-vat">
          <Select id="q-vat" name="includesVat" defaultValue="">
            <option value="">לא ידוע</option>
            <option value="true">כולל מע״מ</option>
            <option value="false">לפני מע״מ</option>
          </Select>
        </Field>
        <Field label="קובץ ההצעה (לא חובה)" htmlFor="q-file">
          <input id="q-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-3 file:py-2" />
        </Field>
      </div>
      <Field label="הערות" htmlFor="q-notes">
        <Textarea id="q-notes" name="notes" rows={2} />
      </Field>
      {upgradeId && (
        <label className="inline-flex items-start gap-2 text-sm">
          <input type="checkbox" name="applyToCosts" defaultChecked className="size-4 mt-1 accent-olive-600" />
          לעדכן את פירוק העלויות של השדרוג לפי שורות ההצעה (שורה ללא סכום לא תעודכן)
        </label>
      )}
      <SubmitButton>שמירת הצעה</SubmitButton>
    </ActionForm>
  );
}
