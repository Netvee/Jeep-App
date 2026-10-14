import type { Metadata } from "next";
import { OfflineView } from "./view";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "זמין ללא חיבור" };

/** Static page (no server data) — precached by the service worker and rendered from localStorage. */
export default function OfflinePage() {
  return (
    <div className="min-h-dvh">
      <header className="bg-charcoal-900 text-sand-50">
        <div className="mx-auto max-w-5xl px-4 min-h-16 flex items-center justify-between gap-3">
          <a href="/garage" className="rounded-lg">
            <Logo />
          </a>
          <span className="text-xs text-sand-300">מידע שמור במכשיר</span>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-6">
        <OfflineView />
      </main>
    </div>
  );
}
