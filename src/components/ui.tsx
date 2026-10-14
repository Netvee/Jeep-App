import Link from "@/components/link";
import type { ComponentProps, ReactNode } from "react";
import { FITMENT_LABEL } from "@/lib/fitment";
import type { FitmentStatus } from "@/db/schema";
import { PROVENANCE_LABEL } from "@/lib/labels";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- buttons */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium min-h-11 px-4 py-2 text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-charcoal-900 text-sand-50 hover:bg-charcoal-700",
  secondary: "bg-white text-charcoal-900 border border-sand-300 hover:bg-sand-100",
  ghost: "text-charcoal-800 hover:bg-sand-200/60",
  danger: "bg-white text-danger-700 border border-danger-100 hover:bg-danger-100",
  accent: "bg-ember-600 text-white hover:bg-ember-700",
};

export function buttonClass(variant: BtnVariant = "primary", extra?: string) {
  return cx(btnBase, btnVariants[variant], extra);
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/* ------------------------------------------------------------------ cards */

export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cx("rounded-2xl bg-white border border-sand-200 shadow-[0_1px_2px_rgba(29,31,33,0.04)]", className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, action, subtitle, as: As = "h2" }: { title: ReactNode; action?: ReactNode; subtitle?: ReactNode; as?: "h2" | "h3" }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <As className="text-lg font-semibold leading-snug">{title}</As>
        {subtitle && <p className="text-sm text-charcoal-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0">
        {eyebrow && <div className="text-sm text-olive-700 font-medium mb-1">{eyebrow}</div>}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal-900">{title}</h1>
        {subtitle && <p className="text-charcoal-600 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/* ----------------------------------------------------------------- badges */

type Tone = "neutral" | "olive" | "ember" | "danger" | "warn" | "info" | "dark";
const toneClass: Record<Tone, string> = {
  neutral: "bg-sand-100 text-charcoal-700 border-sand-300",
  olive: "bg-olive-100 text-olive-800 border-olive-200",
  ember: "bg-ember-100 text-ember-700 border-ember-100",
  danger: "bg-danger-100 text-danger-700 border-danger-100",
  warn: "bg-warn-100 text-warn-700 border-warn-100",
  info: "bg-info-100 text-info-700 border-info-100",
  dark: "bg-charcoal-800 text-sand-50 border-charcoal-800",
};

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", toneClass[tone], className)}>
      {children}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warn" className={className} title="נתוני הדגמה — אינם מידע אמיתי מאומת">
      <span aria-hidden>◆</span> הדגמה
    </Badge>
  );
}

const fitTone: Record<FitmentStatus, Tone> = { verified: "olive", owner_reported: "info", unconfirmed: "neutral", incompatible: "danger" };
const fitIcon: Record<FitmentStatus, string> = { verified: "✓", owner_reported: "◐", unconfirmed: "?", incompatible: "✕" };
export function FitmentBadge({ status }: { status: FitmentStatus }) {
  return (
    <Badge tone={fitTone[status]}>
      <span aria-hidden>{fitIcon[status]}</span>
      {FITMENT_LABEL[status]}
    </Badge>
  );
}

export function ProvenanceBadge({ source }: { source: keyof typeof PROVENANCE_LABEL }) {
  const tone: Tone = source === "manufacturer_document" ? "olive" : source === "owner_reported" ? "info" : "neutral";
  return <Badge tone={tone}>{PROVENANCE_LABEL[source]}</Badge>;
}

export function Unknown({ children = "לא ידוע" }: { children?: ReactNode }) {
  return <span className="text-charcoal-400 italic">{children}</span>;
}

export function Val({ v, suffix }: { v: ReactNode; suffix?: string }) {
  if (v === null || v === undefined || v === "") return <Unknown />;
  return (
    <span>
      {v}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

/* --------------------------------------------------------- misc layout */

export function EmptyState({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-10 px-6">
      {icon && <div className="text-sand-500 mb-1">{icon}</div>}
      <p className="font-semibold text-charcoal-800">{title}</p>
      {children && <div className="text-sm text-charcoal-500 max-w-md">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "danger" | "olive"; title?: ReactNode; children?: ReactNode; className?: string }) {
  const cls = {
    info: "bg-info-100/60 border-info-100 text-info-700",
    warn: "bg-warn-100/70 border-warn-100 text-warn-700",
    danger: "bg-danger-100/70 border-danger-100 text-danger-700",
    olive: "bg-olive-100/70 border-olive-200 text-olive-800",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={cx("rounded-xl border px-4 py-3 text-sm", cls, className)}>
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl bg-sand-100/70 px-4 py-3 min-w-0">
      <div className="text-xs text-charcoal-500">{label}</div>
      <div className="text-lg font-semibold text-charcoal-900 truncate">{value}</div>
      {hint && <div className="text-xs text-charcoal-500 mt-0.5">{hint}</div>}
    </div>
  );
}

export function DefList({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-charcoal-500">{k}</dt>
          <dd className="text-charcoal-900 min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TabLinks({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav aria-label="לשוניות" className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 mb-5">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cx(
            "rounded-full px-4 min-h-10 inline-flex items-center text-sm font-medium whitespace-nowrap border",
            t.key === active ? "bg-charcoal-900 text-sand-50 border-charcoal-900" : "bg-white border-sand-300 text-charcoal-700 hover:bg-sand-100",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Safe external link: rel noopener noreferrer, only http(s) */
export function ExternalLink({ href, children, className }: { href: string | null | undefined; children: ReactNode; className?: string }) {
  if (!href || !/^https?:\/\//i.test(href)) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cx("underline decoration-sand-400 underline-offset-2 hover:text-ember-700", className)}>
      {children}
      <span className="sr-only"> (נפתח בחלון חדש)</span>
    </a>
  );
}
