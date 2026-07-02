import { cn } from "@/lib/utils";

/**
 * EmptyState — designed, not blank.
 *
 * Premium products never show a bare "No items". Every empty surface gets
 * an icon/illustration, a short helpful headline, supporting copy, and a
 * primary action. This single component enforces that across the app.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  className,
  size = "default",
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
  size?: "default" | "compact";
}) {
  const compact = size === "compact";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 text-center",
        compact ? "px-6 py-8" : "px-6 py-14 sm:py-20",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-primary/10 text-primary",
            compact ? "mb-3 h-12 w-12" : "mb-4 h-16 w-16",
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h3
        className={cn(
          "font-display font-semibold text-foreground",
          compact ? "text-base" : "text-lg sm:text-xl",
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "mt-1.5 max-w-sm text-muted-foreground",
            compact ? "text-sm" : "text-sm sm:text-base",
          )}
        >
          {description}
        </p>
      )}
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
