import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * SectionHeading — a titled block within a page (with optional action link).
 * Use between major sections of a long page to create rhythm and hierarchy.
 */
export function SectionHeading({
  title,
  description,
  action,
  actionHref,
  actionLabel,
  icon,
  id,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  icon?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action ?? (actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="group inline-flex flex-shrink-0 items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
        >
          {actionLabel}
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
