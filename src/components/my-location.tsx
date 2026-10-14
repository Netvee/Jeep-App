"use client";

import { useState } from "react";
import { LocateFixed, Copy } from "lucide-react";

/** Shows the device's current coordinates on demand. Nothing is sent to the server or stored. */
export function MyLocation({ onPosition, onUse }: { onPosition?: (p: [number, number]) => void; onUse?: (p: [number, number]) => void }) {
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const locate = () => {
    setErr(null);
    if (!("geolocation" in navigator)) return setErr("הדפדפן אינו תומך באיתור מיקום");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
        setPos(v);
        onPosition?.([v.lat, v.lng]);
      },
      (e) => setErr(e.code === 1 ? "אין הרשאת מיקום" : "לא ניתן לקבל מיקום כרגע"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  const text = pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("ההעתקה נכשלה — סמנו והעתיקו ידנית");
    }
  };
  return (
    <div className="rounded-xl border border-sand-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
      <button onClick={locate} className="inline-flex items-center gap-2 rounded-lg bg-sand-100 hover:bg-sand-200 px-3 min-h-10 font-medium">
        <LocateFixed size={18} /> המיקום שלי
      </button>
      {pos && (
        <>
          <span className="num font-mono select-all" aria-label="קואורדינטות">
            {text}
          </span>
          <span className="text-xs text-charcoal-500">±{Math.round(pos.acc)} מ׳</span>
          <button onClick={copy} className="inline-flex items-center gap-1 text-olive-700 min-h-10 px-2">
            <Copy size={16} /> {copied ? "הועתק" : "העתקה"}
          </button>
          {onUse && (
            <button onClick={() => onUse([pos.lat, pos.lng])} className="text-ember-700 underline min-h-10 px-2">
              להשתמש לדיווח
            </button>
          )}
        </>
      )}
      <span role="status" className="text-danger-700 text-xs">
        {err}
      </span>
      {!pos && !err && <span className="text-xs text-charcoal-500">המיקום אינו נשמר ואינו נשלח לשרת.</span>}
    </div>
  );
}
