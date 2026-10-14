"use client";

import { useState } from "react";
import { LazyTrailMap } from "@/components/map/lazy-map";
import type { MapReport, MapTrail } from "@/components/map/trail-map";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/forms";
import { submitReportAction } from "@/app/actions/trails";
import { OBSTACLE_LABEL } from "@/lib/trails";
import { writePack, type OfflineTrail } from "@/lib/offline-pack";
import { MyLocation } from "@/components/my-location";

export function TrailInteractive({ trail, reports, offline }: { trail: MapTrail & { id: string }; reports: MapReport[]; offline: OfflineTrail }) {
  const [pick, setPick] = useState<[number, number] | null>(null);
  const [reporting, setReporting] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [offMsg, setOffMsg] = useState<string | null>(null);

  const saveOffline = () => {
    const ok = writePack((p) => ({ ...p, trails: { ...p.trails, [offline.slug]: { ...offline, savedAt: new Date().toISOString() } } }));
    setOffMsg(ok ? "פרטי המסלול נשמרו לשימוש ללא חיבור (ללא אריחי מפה)" : "השמירה נכשלה — אחסון הדפדפן אינו זמין");
  };

  return (
    <div className="flex flex-col gap-3">
      <LazyTrailMap trails={[trail]} reports={reports} selected={trail.slug} pick={pick} onPick={reporting ? (lat, lng) => setPick([lat, lng]) : undefined} userPos={userPos} height="min(60vh, 460px)" />
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setReporting((r) => !r)} aria-expanded={reporting} className="rounded-xl bg-ember-600 text-white px-4 min-h-11 font-medium hover:bg-ember-700">
          {reporting ? "ביטול דיווח" : "דיווח על מכשול או שינוי"}
        </button>
        <button onClick={saveOffline} className="rounded-xl border border-sand-300 bg-white px-4 min-h-11 font-medium">
          שמירה לשימוש ללא חיבור
        </button>
        <span role="status" className="text-sm text-olive-700">
          {offMsg}
        </span>
      </div>
      <MyLocation onPosition={(p) => setUserPos(p)} onUse={reporting ? (p) => setPick(p) : undefined} />
      {reporting && (
        <div className="rounded-2xl border border-ember-100 bg-ember-100/30 p-4">
          <p className="text-sm mb-3">{pick ? `מיקום נבחר: ${pick[0].toFixed(5)}, ${pick[1].toFixed(5)}` : "הקישו על המפה במקום המכשול, או השתמשו במיקום הנוכחי."}</p>
          <ActionForm action={submitReportAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2" onSuccess={() => setPick(null)}>
            <input type="hidden" name="trailId" value={trail.id} />
            <input type="hidden" name="lat" value={pick?.[0] ?? ""} />
            <input type="hidden" name="lng" value={pick?.[1] ?? ""} />
            <Field label="סוג" htmlFor="category">
              <Select id="category" name="category" required defaultValue="">
                <option value="" disabled>
                  בחרו
                </option>
                {Object.entries(OBSTACLE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="תאריך תצפית" htmlFor="observedOn">
              <Input id="observedOn" name="observedOn" type="date" />
            </Field>
            <Field label="תיאור" htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" name="description" required minLength={5} placeholder="מה ראיתם, גודל, איך עברתם…" />
            </Field>
            <Field label="תמונה (לא חובה)" htmlFor="photo">
              <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-sand-200 file:px-3 file:py-2" />
            </Field>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <SubmitButton disabled={!pick}>שליחת דיווח לבדיקה</SubmitButton>
              <p className="text-xs text-charcoal-500">הדיווח יפורסם לאחר בדיקה. מיקום המכשול יוצג לכולם; מיקום המכשיר שלכם אינו נשמר.</p>
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
