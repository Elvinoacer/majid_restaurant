"use client";

import { cn } from "@/lib/utils";

/**
 * ListToolbar — search + filter row for list pages.
 *
 * Gives every admin list (orders, reservations, reviews, staff…) the same
 * premium filter affordance: a search field on the left, optional filter
 * chips/selects on the right, all aligned on one baseline. Mobile stacks
 * gracefully.
 */
export function ListToolbar({
  search,
  filters,
  className,
}: {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {search && <div className="w-full sm:max-w-xs">{search}</div>}
      {filters && (
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      )}
    </div>
  );
}
