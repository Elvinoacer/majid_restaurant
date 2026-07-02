import { cn } from "@/lib/utils";

/**
 * Skeleton primitives — content-shaped loaders, not generic spinners.
 *
 * Premium products show skeletons that match the shape of the content
 * coming in. This gives users a sense of layout during the load and
 * prevents visual jumping when data arrives.
 *
 * Compose: <SkeletonLines lines={3} /> or individual <Skeleton className="h-4 w-24" />.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "majid-shimmer rounded-md bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function SkeletonLines({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** A skeleton shaped like a menu item card — used by the menu browser. */
export function SkeletonMenuItemCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex justify-between gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-16" />
        </div>
        <SkeletonLines lines={2} />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}

/** A skeleton shaped like a list row — used by admin list pages. */
export function SkeletonListRow() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <SkeletonLines lines={2} />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
