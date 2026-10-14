"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Car, Wrench, Route, Settings2, MoreHorizontal, X } from "lucide-react";
import { cx } from "./ui";

export const PRIMARY_NAV = [
  { href: "/garage", label: "הגראז׳ שלי", icon: Car },
  { href: "/upgrades", label: "שדרוגים", icon: Settings2 },
  { href: "/maintenance", label: "טיפולים", icon: Wrench },
  { href: "/trails", label: "מסלולים", icon: Route },
];

export type SecondaryItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="ניווט ראשי" className="hidden md:flex items-center gap-1">
      {PRIMARY_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cx(
            "rounded-lg px-3 min-h-10 inline-flex items-center gap-2 text-[15px] font-medium",
            isActive(pathname, item.href) ? "bg-white/10 text-white" : "text-sand-200 hover:text-white hover:bg-white/5",
          )}
        >
          <item.icon size={18} aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MoreMenu({ items }: { items: SecondaryItem[] }) {
  const pathname = usePathname();
  // menu is tied to the path it was opened on, so navigation closes it without an effect
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenOn((typeof v === "function" ? v(open) : v) ? pathname : null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg px-3 min-h-10 inline-flex items-center gap-2 text-sand-200 hover:text-white hover:bg-white/5"
      >
        <MoreHorizontal size={18} aria-hidden /> עוד
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-60 rounded-xl bg-white text-charcoal-900 shadow-xl border border-sand-200 py-2 z-50">
          {items.map((i) => (
            <Link key={i.href} href={i.href} prefetch={false} className="block px-4 py-2.5 hover:bg-sand-100 text-[15px]" aria-current={isActive(pathname, i.href) ? "page" : undefined}>
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileTabBar({ items }: { items: SecondaryItem[] }) {
  const pathname = usePathname();
  const [sheetOn, setSheetOn] = useState<string | null>(null);
  const sheet = sheetOn === pathname;
  const setSheet = (v: boolean) => setSheetOn(v ? pathname : null);
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);
  const moreActive = items.some((i) => isActive(pathname, i.href));
  return (
    <>
      <nav
        aria-label="ניווט ראשי"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-charcoal-900 text-sand-200 border-t border-charcoal-700 pb-[env(safe-area-inset-bottom)] no-print"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx("flex flex-col items-center justify-center gap-0.5 min-h-16 text-[11px]", active ? "text-white" : "text-sand-300")}
                >
                  <item.icon size={22} aria-hidden className={active ? "text-ember-500" : ""} />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-expanded={sheet}
              className={cx("w-full flex flex-col items-center justify-center gap-0.5 min-h-16 text-[11px]", moreActive ? "text-white" : "text-sand-300")}
            >
              <MoreHorizontal size={22} aria-hidden className={moreActive ? "text-ember-500" : ""} />
              עוד
            </button>
          </li>
        </ul>
      </nav>
      {sheet && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="תפריט נוסף">
          <button type="button" aria-label="סגירה" className="absolute inset-0 bg-charcoal-950/50" onClick={() => setSheet(false)} />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">עוד</p>
              <button type="button" onClick={() => setSheet(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-sand-100" aria-label="סגירה">
                <X size={20} />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} prefetch={false} className="flex items-center min-h-12 rounded-xl bg-sand-100 px-4 text-[15px] font-medium hover:bg-sand-200">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
