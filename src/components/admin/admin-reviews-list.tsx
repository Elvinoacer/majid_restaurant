"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setReviewPublished } from "@/lib/reviews/actions";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  createdAt: string;
  customer: { name: string | null; email: string | null } | null;
};

type Filter = "all" | "pending" | "published";

export function AdminReviewsList({
  reviews,
  showOnly = "all",
}: {
  reviews: Review[];
  showOnly?: Filter;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>(showOnly);

  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => !r.isPublished).length,
    published: reviews.filter((r) => r.isPublished).length,
  };

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.isPublished;
    if (filter === "published") return r.isPublished;
    return true;
  });

  const handlePublish = (id: string, publish: boolean) => {
    startTransition(async () => {
      const result = await setReviewPublished({ reviewId: id, isPublished: publish });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(publish ? "Review published" : "Review hidden");
      router.refresh();
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reviews are submitted by customers after a completed order. You moderate what appears on your homepage.
          </p>
        </div>
        {/* Filter tabs */}
        <div className="inline-flex rounded-md border border-border bg-card p-0.5" role="tablist" aria-label="Filter reviews">
          {(["all", "pending", "published"] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
              <span className={cn(
                "rounded-full px-1.5 text-[10px]",
                filter === f ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No {filter === "all" ? "" : filter} reviews to show.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500" aria-label={`${r.rating} of 5 stars`}>
                      {"★".repeat(r.rating)}
                      <span className="text-muted-foreground/30">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      by {r.customer?.name ?? r.customer?.email ?? "Anonymous"} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        r.isPublished
                          ? "bg-green-500/15 text-green-700"
                          : "bg-yellow-500/15 text-yellow-700",
                      )}
                    >
                      {r.isPublished ? "Published" : "Pending"}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="mt-1 text-sm text-foreground/80">&ldquo;{r.comment}&rdquo;</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {!r.isPublished ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handlePublish(r.id, true)}
                    >
                      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Publish
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => handlePublish(r.id, false)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Hide
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
