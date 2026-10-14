"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { readPack, writePack, clearPack, type OfflinePack, type OfflineTrail } from "@/lib/offline-pack";
import { formatDate } from "@/lib/units";
import { useOnline } from "@/components/offline-indicator";

function subscribe(cb: () => void) {
  window.addEventListener("shetach-offline-change", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("shetach-offline-change", cb);
    window.removeEventListener("storage", cb);
  };
}
let cache: { raw: string | null; pack: OfflinePack } = { raw: null, pack: { trails: {}, checklists: {} } };
function snapshot(): OfflinePack {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("shetach-offline-v1");
  } catch {
    /* ignore */
  }
  if (raw !== cache.raw) cache = { raw, pack: readPack() };
  return cache.pack;
}
const empty: OfflinePack = { trails: {}, checklists: {} };

/** Route geometry drawn without a basemap (tiles are not stored offline). */
function RouteSketch({ t }: { t: OfflineTrail }) {
  const pts = t.geometry?.length ? t.geometry : [[t.start[0], t.start[1]]];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const w = 320,
    h = 200,
    pad = 16;
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX || 1e-6)) * (w - pad * 2);
  const sy = (y: number) => h - pad - ((y - minY) / (maxY - minY || 1e-6)) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full bg-sand-100 rounded-xl" role="img" aria-label="שרטוט קו המסלול ללא מפת רקע">
      {pts.length > 1 ? (
        <polyline points={pts.map((p) => `${sx(p[0])},${sy(p[1])}`).join(" ")} fill="none" stroke={t.isDemo ? "#8b6a4f" : "#5b6b3a"} strokeWidth={3} strokeDasharray={t.isDemo ? "8 6" : undefined} />
      ) : (
        <circle cx={w / 2} cy={h / 2} r={6} fill="#5b6b3a" />
      )}
      {pts.length > 1 && <circle cx={sx(pts[0][0])} cy={sy(pts[0][1])} r={5} fill="#1d1f21" />}
      {t.reports.map((r, i) =>
        t.geometry?.length ? <circle key={i} cx={sx(r.lng)} cy={sy(r.lat)} r={5} fill="#c4561a" stroke="white" strokeWidth={1.5} /> : null,
      )}
      <text x={w - 8} y={h - 6} fontSize={9} textAnchor="end" fill="#6a7075">
        צפון ↑ · ללא מפת רקע
      </text>
    </svg>
  );
}

export function OfflineView() {
  const pack = useSyncExternalStore(subscribe, snapshot, () => empty);
  const online = useOnline();
  const [swState, setSwState] = useState<string>("בודק…");
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSwState("הדפדפן אינו תומך בעבודה ללא חיבור");
      return;
    }
    navigator.serviceWorker.getRegistration().then((r) => setSwState(r ? "פעיל — דף זה זמין גם ללא חיבור" : "לא רשום (במצב פיתוח מופעל רק עם ?sw=1)"));
  }, []);
  const trails = Object.values(pack.trails);
  const checklists = Object.entries(pack.checklists);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">זמין ללא חיבור</h1>
        <p className="text-charcoal-600 mt-1">{online ? "אתם מחוברים. כאן מוצג מה שנשמר במכשיר לשימוש בשטח." : "אין חיבור לרשת — מוצג המידע השמור במכשיר."}</p>
        <p className="text-xs text-charcoal-500 mt-1">Service worker: {swState}</p>
      </div>

      <section className="rounded-2xl bg-white border border-sand-200 p-5">
        <h2 className="font-semibold text-lg mb-2">מה נשמר ומה לא</h2>
        <ul className="text-sm grid gap-1 list-disc ps-5">
          <li>נשמר: תקציר הרכב (נשמר אוטומטית בכל כניסה לגראז׳), צ׳קליסטים ששמרתם, ופרטי מסלולים ששמרתם (קו, נתונים, הגבלות ודיווחים מאושרים).</li>
          <li>
            לא נשמר: <strong>אריחי מפה</strong> — מדיניות השימוש של שרתי OpenStreetMap אוסרת הורדה מרוכזת לשימוש לא מקוון. קו המסלול מוצג כשרטוט ללא רקע.
          </li>
          <li>לא נשמר: מסמכים, קבלות, מספר רישוי והיסטוריית מיקום.</li>
          <li>זו אינה ניווט: אין הנחיות פנייה-אחר-פנייה.</li>
        </ul>
      </section>

      <section className="rounded-2xl bg-white border border-sand-200 p-5">
        <h2 className="font-semibold text-lg mb-2">הרכב</h2>
        {pack.vehicle ? (
          <div className="text-sm flex flex-col gap-3">
            <p className="font-medium text-base">{pack.vehicle.name}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {pack.vehicle.details.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-charcoal-500">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {pack.vehicle.reminders.length > 0 && (
              <div>
                <p className="font-medium">תזכורות</p>
                <ul className="list-disc ps-5">
                  {pack.vehicle.reminders.map((r) => (
                    <li key={r.title}>
                      {r.title} — {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pack.vehicle.installed.length > 0 && <p>מותקן: {pack.vehicle.installed.join(", ")}</p>}
            <p className="text-xs text-charcoal-500">נשמר {formatDate(pack.vehicle.savedAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-charcoal-500">עדיין לא נשמר. היכנסו לגראז׳ כשיש חיבור.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-lg">מסלולים שמורים ({trails.length})</h2>
        {trails.length === 0 && <p className="text-sm text-charcoal-500">לא נשמרו מסלולים. בעמוד מסלול לחצו ״שמירה לשימוש ללא חיבור״.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {trails.map((t) => (
            <article key={t.slug} className="rounded-2xl bg-white border border-sand-200 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{t.name}</h3>
                <button
                  onClick={() => writePack((p) => ({ ...p, trails: Object.fromEntries(Object.entries(p.trails).filter(([k]) => k !== t.slug)) }))}
                  className="text-xs text-danger-700 underline min-h-9"
                >
                  הסרה
                </button>
              </div>
              {t.isDemo && <p className="text-xs text-warn-700 font-medium">מסלול הדגמה — קואורדינטות סינתטיות, אין לנווט לפיו.</p>}
              <RouteSketch t={t} />
              <p className="text-xs">
                נקודת התחלה: <span className="num font-mono select-all">{t.geometry?.length ? `${t.geometry[0][1].toFixed(5)}, ${t.geometry[0][0].toFixed(5)}` : `${t.start[1].toFixed(5)}, ${t.start[0].toFixed(5)}`}</span>
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {t.facts.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-charcoal-500">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {t.access.length > 0 && (
                <div className="text-sm rounded-lg bg-warn-100/60 p-3">
                  {t.access.map((a) => (
                    <p key={a}>{a}</p>
                  ))}
                </div>
              )}
              {t.reports.length > 0 && (
                <ul className="text-sm list-disc ps-5">
                  {t.reports.map((r, i) => (
                    <li key={i}>
                      {r.category}: {r.description} ({formatDate(r.observedOn)})
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-charcoal-500">
                {t.source} · נשמר {formatDate(t.savedAt)} — ייתכן שהמידע השתנה מאז.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-lg">צ׳קליסטים ({checklists.length})</h2>
        {checklists.map(([key, c]) => (
          <article key={key} className="rounded-2xl bg-white border border-sand-200 p-5">
            <h3 className="font-semibold mb-2">{c.title}</h3>
            <ul className="flex flex-col gap-1">
              {c.items.map((it, i) => (
                <li key={i}>
                  <label className="flex items-start gap-3 min-h-10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={() =>
                        writePack((p) => ({
                          ...p,
                          checklists: { ...p.checklists, [key]: { ...c, items: c.items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) } },
                        }))
                      }
                      className="size-5 mt-0.5 accent-olive-600"
                    />
                    <span className={it.done ? "line-through text-charcoal-400" : ""}>{it.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {checklists.length === 0 && <p className="text-sm text-charcoal-500">לא נשמרו צ׳קליסטים.</p>}
      </section>

      <button onClick={() => clearPack()} className="self-start text-sm text-danger-700 underline min-h-10">
        מחיקת כל המידע השמור במכשיר
      </button>
    </div>
  );
}
