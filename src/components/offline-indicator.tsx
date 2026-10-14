"use client";

import { useSyncExternalStore } from "react";
import Link from "@/components/link";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function OfflineIndicator() {
  const online = useOnline();
  if (online) return null;
  return (
    <Link href="/offline" role="status" className="rounded-full bg-warn-100 text-warn-700 text-xs font-medium px-3 py-1">
      אין חיבור · מידע שמור
    </Link>
  );
}
