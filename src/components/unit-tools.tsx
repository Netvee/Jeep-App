"use client";

import { useState } from "react";
import { Input } from "./forms";
import { barToPsi, psiToBar, compareTyres, parseTyreSize, tyreDiameterIn } from "@/lib/units";

export function UnitTools({ defaultUnit, currentTyre }: { defaultUnit: "psi" | "bar"; currentTyre: string }) {
  const [psi, setPsi] = useState("30");
  const [bar, setBar] = useState(psiToBar(30).toFixed(2));
  const [from, setFrom] = useState(currentTyre || "265/70R17");
  const [to, setTo] = useState("285/70R17");
  const cmp = compareTyres(from, to);
  const fromT = parseTyreSize(from);
  const toT = parseTyreSize(to);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <p className="font-medium">PSI ↔ bar</p>
        <div className={`flex gap-2 items-end ${defaultUnit === "bar" ? "flex-row-reverse justify-end" : ""}`}>
          <label className="flex flex-col gap-1 text-sm flex-1">
            PSI
            <Input
              inputMode="decimal"
              value={psi}
              onChange={(e) => {
                setPsi(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setBar(psiToBar(n).toFixed(2));
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm flex-1">
            bar
            <Input
              inputMode="decimal"
              value={bar}
              onChange={(e) => {
                setBar(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setPsi(barToPsi(n).toFixed(1));
              }}
            />
          </label>
        </div>
        <p className="text-xs text-charcoal-500">לחץ האוויר המומלץ תלוי ברכב, בצמיג ובעומס — היעזרו במדבקת היצרן ובהוראות יצרן הצמיג.</p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-medium">השוואת מידות צמיג</p>
        <div className="flex gap-2">
          <label className="flex flex-col gap-1 text-sm flex-1">
            נוכחי
            <Input dir="ltr" className="ltr-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm flex-1">
            חדש
            <Input dir="ltr" className="ltr-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {cmp && fromT && toT ? (
          <ul className="text-sm grid gap-1" aria-live="polite">
            <li>
              קוטר: {(fromT.diameterMm / 10).toFixed(1)} ס״מ ({tyreDiameterIn(fromT).toFixed(1)}″) ← {(toT.diameterMm / 10).toFixed(1)} ס״מ ({tyreDiameterIn(toT).toFixed(1)}″)
            </li>
            <li>
              שינוי קוטר: {cmp.diameterDiffMm > 0 ? "+" : ""}
              {(cmp.diameterDiffMm / 10).toFixed(1)} ס״מ ({cmp.diameterDiffPct.toFixed(1)}%)
            </li>
            <li>שינוי גובה בסרן (נומינלי): {(cmp.axleClearanceChangeMm / 10).toFixed(1)} ס״מ</li>
            <li>במד-מהירות 100 קמ״ש — מהירות בפועל כ-{cmp.actualSpeedAtShown100.toFixed(1)} קמ״ש</li>
          </ul>
        ) : (
          <p className="text-sm text-warn-700">מידה לא מזוהה. דוגמאות: 265/70R17, LT285/70R17, 35x12.50R17</p>
        )}
        <p className="text-xs text-charcoal-500">חישוב לפי מידות נומינליות; הקוטר בפועל משתנה לפי יצרן, עומס ולחץ. אינו מעיד על התאמה לרכב.</p>
      </div>
    </div>
  );
}
