import type { Metadata, Viewport } from "next";
import "@fontsource-variable/heebo";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: { default: "שטח · הגראז׳ שלך לשטח", template: "%s · שטח" },
  description: "גראז׳ אישי, מתכנן שדרוגים ומלווה שטח לבעלי רכבי 4×4 בישראל.",
  applicationName: "שטח",
  appleWebApp: { capable: true, title: "שטח", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1d1f21",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link rounded-lg bg-charcoal-900 text-white px-4 py-2">
          דלג לתוכן
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
