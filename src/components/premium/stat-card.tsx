import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * StatCard — KPI card for admin dashboards.
 *
 * Replaces the ad-hoc KpiCard in the admin overview with a reusable,
 * token-driven version. Each card has a label, a large tabular-numeral
 * value, an icon chip, an optional trend indicator, and optional click-
 * through to a detail page.
 *
 * Tone drives the icon chip color only — never the value color, to keep
 * numbers readable in bright kitchen lighting.
 */
export type StatTone = "primary" | "success" | "warning" | "info" | "neutral";

const TONE_ICON: Record<StatTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning-foreground",
  info: "bg-info-muted text-info",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  hint,
  trend,
  href,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  hint?: React.ReactNode;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              TONE_ICON[tone],
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-[1.75rem]">
        {value}
      </p>
      {(hint || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-danger",
                trend.direction === "flat" && "text-muted-foreground",
              )}
            >
              {trend.direction === "up" && "↑"}
              {trend.direction === "down" && "↓"}
              {trend.direction === "flat" && "→"}
              {trend.value}
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </>
  );

  const cardClass = cn(
    "group relative overflow-hidden rounded-2xl border border-border bg-card p-4 elevation-1 transition-all",
    href && "hover:elevation-2 hover:border-primary/30",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {inner}
      </Link>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}
