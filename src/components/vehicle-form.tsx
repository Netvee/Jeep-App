"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { ActionForm, Field, Input, Select, Textarea, SubmitButton, type FormAction } from "./forms";
import { Badge, cx } from "./ui";
import { searchItems } from "@/lib/search";
import { parseTyreSize, tyreDiameterIn } from "@/lib/units";
import { BODY_LABEL, USE_LABEL, LOCKERS_LABEL, TYRE_TYPE_LABEL, COVERAGE_LABEL, COVERAGE_HINT } from "@/lib/labels";
import { EXPERIENCE_LABEL } from "@/lib/trails";
import type { TreeGeneration } from "@/server/catalogue-tree";

type VehicleValues = Partial<{
  id: string;
  variantId: string | null;
  nickname: string | null;
  make: string | null;
  model: string | null;
  generation: string | null;
  year: number | null;
  trim: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  body: string | null;
  wheelbaseMm: number | null;
  tyreSize: string | null;
  wheelSpec: string | null;
  suspension: string | null;
  liftCm: number | null;
  groundClearanceCm: number | null;
  hasLowRange: boolean | null;
  lockers: string | null;
  tyreType: string | null;
  intendedUse: string[];
  driverExperience: string | null;
  registrationPlate: string | null;
  vin: string | null;
  purchaseDate: string | null;
  ownershipNotes: string | null;
  budgetIls: number | null;
}>;

const yrs = (a: number, b: number | null) => `${a}–${b ?? "היום"}`;

export function VehicleForm({ tree, action, initial, mode }: { tree: TreeGeneration[]; action: FormAction; initial?: VehicleValues; mode: "create" | "edit" }) {
  const v = initial ?? {};
  const initialGen = v.variantId ? tree.find((g) => g.variants.some((x) => x.id === v.variantId)) ?? null : null;
  const [query, setQuery] = useState("");
  const [gen, setGen] = useState<TreeGeneration | null>(initialGen);
  const [variantId, setVariantId] = useState<string | null>(v.variantId ?? null);
  const [manual, setManual] = useState(mode === "edit" && !v.variantId);
  const [tyre, setTyre] = useState(v.tyreSize ?? "");

  const results = useMemo(
    () =>
      searchItems(tree, query, (g) => [g.makeEn, g.makeHe, ...g.makeAliases, g.modelEn, g.modelHe, ...g.modelAliases, g.code, g.name, ...g.aliases, ...g.variants.flatMap((x) => [x.name, ...x.aliases])]).slice(0, query ? 12 : 8),
    [tree, query],
  );
  const variant = gen?.variants.find((x) => x.id === variantId) ?? null;
  const parsedTyre = parseTyreSize(tyre);

  return (
    <ActionForm action={action} className="flex flex-col gap-8">
      {v.id && <input type="hidden" name="vehicleId" value={v.id} />}
      <input type="hidden" name="variantId" value={manual ? (mode === "edit" ? "none" : "") : (variantId ?? (mode === "edit" ? "none" : ""))} />

      {/* ---- step 1: catalogue */}
      <section aria-labelledby="sec-cat" className="flex flex-col gap-3">
        <h2 id="sec-cat" className="text-lg font-semibold">
          1. איזה רכב?
        </h2>
        {!manual && (
          <>
            <div className="relative">
              <Search className="absolute top-3 start-3 text-charcoal-400" size={20} aria-hidden />
              <Input
                aria-label="חיפוש דגם"
                placeholder="חפשו בעברית או באנגלית: רנגלר, Prado, ג׳ימני, היילקס…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <ul className="grid gap-2 sm:grid-cols-2" aria-label="תוצאות">
              {results.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setGen(g);
                      setVariantId(g.variants.length === 1 ? g.variants[0].id : null);
                    }}
                    aria-pressed={gen?.id === g.id}
                    className={cx(
                      "w-full text-start rounded-xl border px-4 py-3 min-h-14 transition-colors",
                      gen?.id === g.id ? "border-olive-500 bg-olive-100/60" : "border-sand-300 bg-white hover:bg-sand-100",
                    )}
                  >
                    <div className="font-medium">
                      {g.makeHe} {g.modelHe} <span className="ltr text-charcoal-500 text-sm">({g.code})</span>
                    </div>
                    <div className="text-xs text-charcoal-500 flex flex-wrap gap-2 items-center mt-0.5">
                      <span className="num">{yrs(g.yearFrom, g.yearTo)}</span>
                      <span>·</span>
                      <span>{COVERAGE_LABEL[g.coverage]}</span>
                    </div>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="text-sm text-charcoal-500">לא נמצא. אפשר להזין את הרכב ידנית.</li>}
            </ul>
            {gen && (
              <div className="rounded-xl border border-sand-200 bg-sand-50 p-4">
                <p className="font-medium mb-1">
                  {gen.makeHe} {gen.modelHe} {gen.code}
                </p>
                <p className="text-xs text-charcoal-500 mb-3">
                  {COVERAGE_LABEL[gen.coverage]} — {COVERAGE_HINT[gen.coverage]}
                </p>
                {gen.variants.length ? (
                  <fieldset>
                    <legend className="text-sm font-medium mb-2">בחרו גרסה (חשוב להתאמת חלקים — שנים וגרסאות שונות אינן בהכרח תואמות)</legend>
                    <div className="grid gap-2">
                      {gen.variants.map((x) => (
                        <label key={x.id} className={cx("flex items-center gap-3 rounded-lg border px-3 py-2.5 min-h-12 cursor-pointer", variantId === x.id ? "border-olive-500 bg-white" : "border-sand-300 bg-white/60")}>
                          <input type="radio" name="_variant" checked={variantId === x.id} onChange={() => setVariantId(x.id)} className="accent-olive-600 size-4" />
                          <span className="flex-1">
                            {x.name}
                            <span className="block text-xs text-charcoal-500">
                              <span className="num">{yrs(x.yearFrom, x.yearTo)}</span> · {BODY_LABEL[x.body]}
                            </span>
                          </span>
                          {variantId === x.id && <Check size={18} className="text-olive-600" />}
                        </label>
                      ))}
                      <label className="flex items-center gap-3 rounded-lg border border-dashed border-sand-400 px-3 py-2.5 min-h-12 cursor-pointer">
                        <input type="radio" name="_variant" checked={variantId === null} onChange={() => setVariantId(null)} className="accent-olive-600 size-4" />
                        <span className="text-sm">הגרסה שלי לא מופיעה / לא בטוח — אמלא ידנית</span>
                      </label>
                    </div>
                  </fieldset>
                ) : (
                  <p className="text-sm text-warn-700 bg-warn-100 rounded-lg px-3 py-2">
                    לדור זה עדיין אין גרסאות בקטלוג. הפרטים שתזינו יישמרו כדיווח בעלים, וההתאמה לשדרוגים תוצג כ״לא אומתה״.
                  </p>
                )}
              </div>
            )}
          </>
        )}
        <button type="button" className="self-start text-sm text-olive-700 underline min-h-10" onClick={() => setManual((m) => !m)}>
          {manual ? "חזרה לבחירה מהקטלוג" : "הרכב שלי לא בקטלוג — הזנה ידנית"}
        </button>
      </section>

      {/* ---- step 2: details */}
      <section aria-labelledby="sec-details" className="flex flex-col gap-4">
        <h2 id="sec-details" className="text-lg font-semibold">
          2. פרטי הרכב
        </h2>
        <p className="text-sm text-charcoal-500 -mt-2">כל שדה אפשר להשאיר ריק — הוא יוצג כ״לא ידוע״. שדות ריקים יושלמו מנתוני הקטלוג כשבחרתם גרסה.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="כינוי (לא חובה)" htmlFor="nickname">
            <Input id="nickname" name="nickname" defaultValue={v.nickname ?? ""} placeholder="למשל: הג׳יפ הירוק" />
          </Field>
          <Field label="שנת ייצור" htmlFor="year" hint={variant ? `הגרסה שנבחרה: ${yrs(variant.yearFrom, variant.yearTo)}` : undefined}>
            <Input id="year" name="year" type="number" inputMode="numeric" min={1940} max={2100} defaultValue={v.year ?? ""} />
          </Field>
          {(manual || !gen || mode === "edit") && (
            <>
              <Field label="יצרן" htmlFor="make">
                <Input id="make" name="make" defaultValue={v.make ?? (gen && !manual ? gen.makeEn : "")} />
              </Field>
              <Field label="דגם" htmlFor="model">
                <Input id="model" name="model" defaultValue={v.model ?? (gen && !manual ? gen.modelEn : "")} />
              </Field>
              <Field label="דור / קוד" htmlFor="generation">
                <Input id="generation" name="generation" defaultValue={v.generation ?? (gen && !manual ? gen.code : "")} />
              </Field>
            </>
          )}
          {gen && !manual && mode === "create" && (
            <>
              <input type="hidden" name="make" value={gen.makeEn} />
              <input type="hidden" name="model" value={gen.modelEn} />
              <input type="hidden" name="generation" value={gen.code} />
            </>
          )}
          <Field label="רמת גימור" htmlFor="trim">
            <Input id="trim" name="trim" defaultValue={v.trim ?? ""} />
          </Field>
          <Field label="מנוע" htmlFor="engine" hint={variant?.engine ? `בקטלוג: ${variant.engine}` : undefined}>
            <Input id="engine" name="engine" defaultValue={v.engine ?? ""} />
          </Field>
          <Field label="תיבת הילוכים" htmlFor="transmission">
            <Input id="transmission" name="transmission" defaultValue={v.transmission ?? ""} />
          </Field>
          <Field label="מערכת הנעה" htmlFor="drivetrain">
            <Input id="drivetrain" name="drivetrain" defaultValue={v.drivetrain ?? ""} />
          </Field>
          <Field label="מבנה גוף" htmlFor="body">
            <Select id="body" name="body" defaultValue={v.body ?? ""}>
              <option value="">{variant ? "לפי הקטלוג" : "לא ידוע"}</option>
              {Object.entries(BODY_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="בסיס גלגלים (מ״מ)" htmlFor="wheelbaseMm">
            <Input id="wheelbaseMm" name="wheelbaseMm" type="number" inputMode="numeric" defaultValue={v.wheelbaseMm ?? ""} />
          </Field>
        </div>
      </section>

      <section aria-labelledby="sec-tyres" className="flex flex-col gap-4">
        <h2 id="sec-tyres" className="text-lg font-semibold">
          3. צמיגים, מתלים ויכולות
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="מידת צמיג"
            htmlFor="tyreSize"
            hint={
              tyre
                ? parsedTyre
                  ? `קוטר נומינלי: ${(parsedTyre.diameterMm / 10).toFixed(1)} ס״מ (${tyreDiameterIn(parsedTyre).toFixed(1)}″)`
                  : "לא מזוהה — דוגמאות: 265/70R17 או 35x12.50R17"
                : "מטרי (265/70R17) או אינצ׳ים (33x12.50R17)"
            }
          >
            <Input id="tyreSize" name="tyreSize" className="ltr-input" dir="ltr" value={tyre} onChange={(e) => setTyre(e.target.value)} />
          </Field>
          <Field label="סוג צמיג" htmlFor="tyreType">
            <Select id="tyreType" name="tyreType" defaultValue={v.tyreType ?? ""}>
              <option value="">לא ידוע</option>
              {Object.entries(TYRE_TYPE_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="חישוקים" htmlFor="wheelSpec" hint="למשל: 17x8.5 ET0, פלדה/סגסוגת">
            <Input id="wheelSpec" name="wheelSpec" defaultValue={v.wheelSpec ?? ""} />
          </Field>
          <Field label="מתלים" htmlFor="suspension" hint="מקורי / שם ערכה">
            <Input id="suspension" name="suspension" defaultValue={v.suspension ?? ""} />
          </Field>
          <Field label="הגבהה קיימת (ס״מ)" htmlFor="liftCm">
            <Input id="liftCm" name="liftCm" inputMode="decimal" defaultValue={v.liftCm ?? ""} />
          </Field>
          <Field label="מרווח גחון (ס״מ)" htmlFor="groundClearanceCm" hint="דיווח בעלים. משמש להתאמת מסלולים בלבד.">
            <Input id="groundClearanceCm" name="groundClearanceCm" inputMode="decimal" defaultValue={v.groundClearanceCm ?? ""} />
          </Field>
          <Field label="הילוך כוח (Low)" htmlFor="hasLowRange">
            <Select id="hasLowRange" name="hasLowRange" defaultValue={v.hasLowRange == null ? "" : String(v.hasLowRange)}>
              <option value="">לא ידוע</option>
              <option value="true">יש</option>
              <option value="false">אין</option>
            </Select>
          </Field>
          <Field label="נעילות דיפרנציאל" htmlFor="lockers">
            <Select id="lockers" name="lockers" defaultValue={v.lockers ?? ""}>
              <option value="">לא ידוע</option>
              {Object.entries(LOCKERS_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section aria-labelledby="sec-use" className="flex flex-col gap-4">
        <h2 id="sec-use" className="text-lg font-semibold">
          4. שימוש וניסיון
        </h2>
        <fieldset>
          <legend className="text-sm font-medium mb-2">למה הרכב משמש? (משפיע על המלצות)</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(USE_LABEL).map(([k, l]) => (
              <label key={k} className="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-3 min-h-10 text-sm cursor-pointer has-[:checked]:border-olive-500 has-[:checked]:bg-olive-100">
                <input type="checkbox" name="intendedUse" value={k} defaultChecked={v.intendedUse?.includes(k)} className="accent-olive-600 size-4" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="ניסיון הנהג בשטח" htmlFor="driverExperience" className="sm:max-w-xs">
          <Select id="driverExperience" name="driverExperience" defaultValue={v.driverExperience ?? ""}>
            <option value="">לא צוין</option>
            {Object.entries(EXPERIENCE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section aria-labelledby="sec-own" className="flex flex-col gap-4">
        <h2 id="sec-own" className="text-lg font-semibold flex items-center gap-2">
          5. בעלות <Badge tone="dark">פרטי</Badge>
        </h2>
        <p className="text-sm text-charcoal-500 -mt-2">מספר רישוי, VIN ומסמכים לעולם אינם מוצגים בפרופיל ציבורי או בשיתוף.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "create" && (
            <Field label="קילומטראז׳ נוכחי" htmlFor="km" hint="יירשם עם תאריך היום">
              <Input id="km" name="km" type="number" inputMode="numeric" min={0} />
            </Field>
          )}
          <Field label="תאריך רכישה" htmlFor="purchaseDate">
            <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={v.purchaseDate ?? ""} />
          </Field>
          <Field label="מספר רישוי" htmlFor="registrationPlate">
            <Input id="registrationPlate" name="registrationPlate" dir="ltr" className="ltr-input" defaultValue={v.registrationPlate ?? ""} autoComplete="off" />
          </Field>
          <Field label="מספר שלדה (VIN)" htmlFor="vin">
            <Input id="vin" name="vin" dir="ltr" className="ltr-input" defaultValue={v.vin ?? ""} autoComplete="off" />
          </Field>
          <Field label="תקציב שדרוגים (₪)" htmlFor="budgetIls">
            <Input id="budgetIls" name="budgetIls" type="number" inputMode="numeric" min={0} defaultValue={v.budgetIls ?? ""} />
          </Field>
        </div>
        <Field label="הערות בעלות" htmlFor="ownershipNotes">
          <Textarea id="ownershipNotes" name="ownershipNotes" defaultValue={v.ownershipNotes ?? ""} />
        </Field>
        {mode === "create" && (
          <Field label="תמונת רכב (לא חובה)" htmlFor="photo" hint="JPEG/PNG/WebP עד 10MB. נתוני מיקום (EXIF) מוסרים אוטומטית.">
            <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-4 file:py-2.5 file:font-medium" />
          </Field>
        )}
      </section>

      <div className="sticky bottom-20 md:bottom-4 z-10">
        <SubmitButton className="w-full sm:w-auto shadow-lg" pendingText="שומר…">
          {mode === "create" ? "הוספה לגראז׳" : "שמירת שינויים"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
