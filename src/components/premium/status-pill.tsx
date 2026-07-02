import { cn } from "@/lib/utils";

/**
 * StatusPill — semantic status indicator tied to the design token system.
 *
 * Replaces the per-page hardcoded `bg-yellow-500/15 text-yellow-700`
 * pattern with one component driven by the semantic status palette.
 * Critical for restaurant ops: status color alone is never enough, so
 * every pill pairs color with a label (accessibility in bright kitchens).
 *
 * Tones map to the semantic tokens in globals.css:
 *  - success (green)  — ready, delivered, completed, paid
 *  - warning (amber)  — pending, preparing, awaiting payment
 *  - danger  (red)    — cancelled, failed, urgent
 *  - info    (terra)  — confirmed, scheduled, in progress
 *  - neutral (muted)  — draft, default
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning-foreground",
  danger: "bg-danger-muted text-danger",
  info: "bg-info-muted text-info",
  neutral: "bg-muted text-muted-foreground",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

export function StatusPill({
  tone = "neutral",
  children,
  dot = true,
  pulse,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            DOT_CLASSES[tone],
            pulse && "animate-pulse-soft",
          )}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
