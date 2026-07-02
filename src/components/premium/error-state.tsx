import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ErrorState — explain what happened, why, and how to fix it.
 *
 * Replaces bare "Something went wrong" surfaces with a recovery-oriented
 * message + a primary retry action. Used by error.tsx, failed fetches,
 * and broken list loads.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this. Please try again — if the problem persists, our team has been notified.",
  retry,
  retryLabel = "Try again",
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  retry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-danger/30 bg-danger-muted/30 px-6 py-14 text-center sm:py-20",
        className,
      )}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger"
        aria-hidden
      >
        <AlertCircle className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground sm:text-xl">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground sm:text-base">
        {description}
      </p>
      {retry && (
        <Button onClick={retry} className="mt-5 gap-1.5" size="sm">
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
