"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pagination — accessible, premium page navigation.
 *
 * Replaces ad-hoc "load more" or unstyled numbered lists with a consistent
 * control: prev/next chevrons, a sliding window of page numbers with
 * ellipsis, and an optional result-count label. Keyboard-accessible,
 * mobile-friendly (collapses to prev/next + count on small screens).
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build a sliding window: always show first, last, current ±1, with ellipsis.
  const pages: (number | "ellipsis")[] = [];
  const add = (n: number | "ellipsis") => pages.push(n);
  const windowSize = 1;
  for (let i = 1; i <= pageCount; i++) {
    if (
      i === 1 ||
      i === pageCount ||
      (i >= page - windowSize && i <= page + windowSize)
    ) {
      add(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      add("ellipsis");
    }
  }

  const buttonClass = (active: boolean) =>
    cn(
      "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-all",
      active
        ? "bg-primary text-primary-foreground elevation-1"
        : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5",
    );

  return (
    <nav
      className={cn(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
      aria-label="Pagination"
    >
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from.toLocaleString()}</span>–
        <span className="font-medium text-foreground">{to.toLocaleString()}</span> of{" "}
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all",
            "hover:border-primary/40 hover:bg-primary/5",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`e-${i}`}
              className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground"
              aria-hidden
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={buttonClass(p === page)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all",
            "hover:border-primary/40 hover:bg-primary/5",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
