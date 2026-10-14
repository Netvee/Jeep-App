"use client";

import { useState } from "react";
import { AlertOctagon, Wrench, Eye } from "lucide-react";
import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/forms";
import { logSymptomAction } from "@/app/actions/maintenance";
import { triage, URGENCY_LABEL, type Category } from "@/lib/triage";
import { cx } from "@/components/ui";

export function TriageFlow({ vehicleId, categories, today, lastKm }: { vehicleId: string; categories: Category[]; today: string; lastKm: number | null }) {
  const [cat, setCat] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const category = categories.find((c) => c.key === cat) ?? null;
  const answeredAll = category ? category.questions.every((q) => answers[q.id]) : false;
  const result = category && Object.keys(answers).length ? triage(category.key, answers) : null;

  return (
    <ActionForm action={logSymptomAction} className="flex flex-col gap-6">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <fieldset>
        <legend className="text-lg font-semibold mb-3">מה קורה?</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((c) => (
            <label key={c.key} className={cx("rounded-xl border px-4 py-3 cursor-pointer min-h-16 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember-500", cat === c.key ? "border-ember-500 bg-ember-100/40" : "border-sand-300 bg-white hover:bg-sand-50")}>
              <input
                type="radio"
                name="category"
                value={c.key}
                checked={cat === c.key}
                onChange={() => {
                  setCat(c.key);
                  setAnswers({});
                }}
                className="sr-only"
              />
              <span className="font-medium block">{c.label}</span>
              <span className="text-xs text-charcoal-500">{c.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {category &&
        category.questions.map((q) => (
          <fieldset key={q.id}>
            <legend className="font-medium mb-2">{q.label}</legend>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o) => (
                <label key={o.value} className={cx("rounded-full border px-3.5 min-h-10 inline-flex items-center text-sm cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember-500", answers[q.id] === o.value ? "border-charcoal-900 bg-charcoal-900 text-white" : "border-sand-300 bg-white")}>
                  <input type="radio" name={`q_${q.id}`} value={o.value} checked={answers[q.id] === o.value} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))} className="sr-only" />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

      {result && (
        <section
          aria-live="polite"
          className={cx(
            "rounded-2xl border-2 p-5",
            result.urgency === "stop" ? "border-danger-700 bg-danger-100/50" : result.urgency === "workshop" ? "border-warn-700/40 bg-warn-100/50" : "border-olive-200 bg-olive-100/40",
          )}
        >
          <div className="flex items-center gap-2 font-bold text-lg">
            {result.urgency === "stop" ? <AlertOctagon className="text-danger-700" /> : result.urgency === "workshop" ? <Wrench className="text-warn-700" /> : <Eye className="text-olive-700" />}
            {URGENCY_LABEL[result.urgency]}
          </div>
          <p className="mt-1">{result.headline}</p>
          {!answeredAll && <p className="text-xs text-charcoal-500 mt-1">ענו על כל השאלות לתוצאה מדויקת יותר.</p>}
          {result.nextSteps.length > 0 && (
            <>
              <h3 className="font-semibold mt-4 mb-1">צעדים הבאים</h3>
              <ul className="list-disc ps-5 text-sm space-y-1">
                {result.nextSteps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          )}
          {result.safeChecks.length > 0 && (
            <>
              <h3 className="font-semibold mt-4 mb-1">בדיקות שהבעלים יכולים לבצע בבטחה</h3>
              <ul className="list-disc ps-5 text-sm space-y-1">
                {result.safeChecks.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          )}
          {result.possibleCauses.length > 0 && (
            <>
              <h3 className="font-semibold mt-4 mb-1">הסברים אפשריים (לא אבחנה)</h3>
              <ul className="list-disc ps-5 text-sm space-y-1">
                {result.possibleCauses.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className="text-xs text-charcoal-500 mt-2">רשימה כללית לשיחה עם מכונאי. רק בדיקה במוסך יכולה לקבוע את הסיבה.</p>
            </>
          )}
        </section>
      )}

      {category && (
        <fieldset className="flex flex-col gap-4">
          <legend className="text-lg font-semibold mb-1">תיעוד ביומן</legend>
          <Field label="תיאור במילים שלכם" htmlFor="description">
            <Textarea id="description" name="description" placeholder="מתי התחיל, באיזו מהירות, האם חוזר…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="תאריך" htmlFor="occurredOn">
              <Input id="occurredOn" name="occurredOn" type="date" defaultValue={today} max={today} />
            </Field>
            <Field label="ק״מ" htmlFor="km">
              <Input id="km" name="km" type="number" inputMode="numeric" min={0} placeholder={lastKm != null ? `אחרון: ${lastKm}` : ""} />
            </Field>
            <Field label="תמונה (לא חובה)" htmlFor="photo">
              <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-3 file:py-2" />
            </Field>
            <Field label="הקלטת קול/וידאו (לא חובה)" htmlFor="recording" hint="נשמרת עבור המכונאי בלבד — אינה מנותחת">
              <input id="recording" name="recording" type="file" accept="audio/*,video/mp4,video/webm,video/quicktime" capture className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-3 file:py-2" />
            </Field>
          </div>
          <SubmitButton className="self-start">שמירה ביומן</SubmitButton>
        </fieldset>
      )}
    </ActionForm>
  );
}
