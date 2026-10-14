"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const ITEMS = [
  ["/admin", "סקירה ורעננות"],
  ["/admin/catalogue", "קטלוג רכבים"],
  ["/admin/parts", "חלקים, התאמות ומחירים"],
  ["/admin/trails", "מסלולים"],
  ["/admin/reports", "מודרציה"],
  ["/admin/workshops", "מוסכים"],
];

export function AdminNav() {
  const p = usePathname();
  return (
    <nav aria-label="ניהול" className="flex gap-1 overflow-x-auto rounded-2xl bg-charcoal-900 p-1.5">
      {ITEMS.map(([href, label]) => {
        const active = href === "/admin" ? p === href : p.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("rounded-xl px-3 min-h-10 inline-flex items-center text-sm whitespace-nowrap", active ? "bg-white text-charcoal-900" : "text-sand-200 hover:bg-white/10")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
