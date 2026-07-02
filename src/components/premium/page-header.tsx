import { cn } from "@/lib/utils";

/**
 * PageHeader — one consistent header pattern for every page.
 *
 * Solves the "intern-coded every page differently" problem: instead of
 * each page hand-rolling an <h1> + <p> + actions row, they all use this.
 * The result is a predictable, scannable hierarchy across the entire app.
 *
 * Variants:
 *  - `page`    — top of a standalone page (larger title, more breathing room)
 *  - `section` — a titled block within a page (smaller, tighter)
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  backHref,
  backLabel,
  className,
  size = "page",
  id,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  size?: "page" | "section";
  id?: string;
}) {
  const isSection = size === "section";
  return (
    <div className={cn(isSection ? "mb-4" : "mb-6 sm:mb-8", className)}>
      {backHref && (
        <a
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>←</span>
          {backLabel ?? "Back"}
        </a>
      )}
      {eyebrow && (
        <p
          className={cn(
            "mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary",
          )}
        >
          {eyebrow}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1
            id={id}
            className={cn(
              "font-display font-bold tracking-tight text-foreground",
              isSection
                ? "text-lg sm:text-xl"
                : "text-2xl sm:text-3xl",
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "mt-1.5 text-muted-foreground",
                isSection ? "text-sm" : "text-sm sm:text-base",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
