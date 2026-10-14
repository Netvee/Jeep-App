import Link from "next/link";
import { getGarage } from "@/server/context";
import { Logo } from "@/components/logo";
import { DesktopNav, MoreMenu, MobileTabBar, type SecondaryItem } from "@/components/nav";
import { VehicleSwitcher } from "@/components/vehicle-switcher";
import { vehicleDisplayName } from "@/server/repo";
import { LogoutButton } from "@/components/logout-button";
import { OfflineIndicator } from "@/components/offline-indicator";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, vehicles, active } = await getGarage();
  const secondary: SecondaryItem[] = [
    { href: "/trips", label: "טיולים" },
    { href: "/troubleshoot", label: "אבחון תסמינים" },
    { href: "/report", label: "דוח למכונאי" },
    { href: "/workshops", label: "מוסכים והצעות מחיר" },
    { href: "/community", label: "קהילה" },
    { href: "/catalog", label: "קטלוג רכבים" },
    { href: "/offline", label: "זמין ללא חיבור" },
    { href: "/settings", label: "הגדרות וגיבוי" },
    ...(user.role === "admin" ? [{ href: "/admin", label: "ניהול נתונים" }] : []),
  ];
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-charcoal-900 text-sand-50 sticky top-0 z-30 no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center gap-4 min-h-16">
          <Link href="/garage" className="shrink-0 rounded-lg" aria-label="שטח — לדף הגראז׳">
            <Logo />
          </Link>
          <DesktopNav />
          <div className="ms-auto flex items-center gap-2">
            <OfflineIndicator />
            {vehicles.length > 0 && (
              <VehicleSwitcher vehicles={vehicles.map((v) => ({ id: v.id, name: vehicleDisplayName(v), isDemo: v.isDemo }))} activeId={active?.id ?? null} />
            )}
            <MoreMenu items={secondary} />
            <LogoutButton className="hidden md:block" />
          </div>
        </div>
      </header>
      {user.isDemoAccount && (
        <div className="bg-warn-100 text-warn-700 text-sm no-print">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2">
            <strong>חשבון הדגמה.</strong> הרכב, ההיסטוריה והמחירים בחשבון זה בדויים. כדי לשמור נתונים אמיתיים{" "}
            <Link href="/register" className="underline font-medium">
              צרו חשבון
            </Link>
            .
          </div>
        </div>
      )}
      <main id="main" className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 pb-28 md:pb-12">
        {children}
      </main>
      <MobileTabBar items={secondary} />
    </div>
  );
}
