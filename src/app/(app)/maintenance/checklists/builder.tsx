"use client";

import { useEffect, useMemo, useState } from "react";
import { buildChecklist, CONDITION_LABEL, type TripCondition } from "@/lib/checklists";
import { readPack, writePack } from "@/lib/offline-pack";
import { Card, CardHeader, cx } from "@/components/ui";

export function ChecklistBuilder({ equipment, vehicleName }: { equipment: { snorkel: boolean; winch: boolean; lockers: boolean }; vehicleName: string }) {
  const [conds, setConds] = useState<TripCondition[]>(["dust"]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const pre = useMemo(() => buildChecklist("pre", conds, equipment), [conds, equipment]);
  const post = useMemo(() => buildChecklist("post", conds, equipment), [conds, equipment]);

  useEffect(() => {
    const p = readPack().checklists["general"];
    if (p) {
      // restore ticks saved for offline use (one-time hydration from localStorage)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(Object.fromEntries(p.items.map((i) => [i.text, i.done])));
    }
  }, []);

  const save = () => {
    const ok = writePack((p) => ({
      ...p,
      checklists: {
        ...p.checklists,
        general: {
          title: `${vehicleName} · ${conds.map((c) => CONDITION_LABEL[c]).join(", ")}`,
          items: [...pre.map((t) => `לפני: ${t}`), ...post.map((t) => `אחרי: ${t}`)].map((text) => ({ text, done: !!done[text] })),
          savedAt: new Date().toISOString(),
        },
      },
    }));
    setSaved(ok ? "נשמר לשימוש ללא חיבור" : "השמירה נכשלה (אחסון הדפדפן אינו זמין)");
  };

  const renderList = (title: string, items: string[], prefix: string) => (
    <Card>
      <CardHeader title={title} as="h3" />
      <ul className="p-5 pt-3 flex flex-col gap-1">
        {items.map((t) => {
          const k = `${prefix}${t}`;
          return (
            <li key={t}>
              <label className="flex items-start gap-3 min-h-11 py-1.5 cursor-pointer">
                <input type="checkbox" checked={!!done[k]} onChange={(e) => setDone((d) => ({ ...d, [k]: e.target.checked }))} className="size-5 mt-0.5 accent-olive-600" />
                <span className={cx("text-[15px]", done[k] && "line-through text-charcoal-400")}>{t}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </Card>
  );

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="text-sm font-medium mb-2">תנאי הטיול</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CONDITION_LABEL) as TripCondition[]).map((c) => (
            <label key={c} className="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-3 min-h-10 text-sm cursor-pointer has-[:checked]:border-olive-500 has-[:checked]:bg-olive-100">
              <input type="checkbox" checked={conds.includes(c)} onChange={() => setConds((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} className="size-4 accent-olive-600" />
              {CONDITION_LABEL[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 lg:grid-cols-2">
        {renderList("לפני היציאה", pre, "לפני: ")}
        {renderList("אחרי הטיול", post, "אחרי: ")}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} className="rounded-xl bg-charcoal-900 text-white px-4 min-h-11 font-medium">
          שמירה לשימוש ללא חיבור
        </button>
        <button onClick={() => window.print()} className="rounded-xl border border-sand-300 bg-white px-4 min-h-11 font-medium">
          הדפסה
        </button>
        <span role="status" className="text-sm text-olive-700">
          {saved}
        </span>
      </div>
    </div>
  );
}
