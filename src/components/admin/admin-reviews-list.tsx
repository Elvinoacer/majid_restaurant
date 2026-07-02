"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setReviewPublished } from "@/lib/reviews/actions";
import { PageHeader } from "@/components/premium/page-header";
import { SearchInput } from "@/components/premium/search-input";
import { EmptyState } from "@/components/premium/empty-state";
import { StatusPill } from "@/components/premium/status-pill";
import { Pagination } from "@/components/premium/pagination";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  createdAt: string;
  customer: { name: string | null; email: string | null } | null;
};

type Filter = "all" | "pending" | "published";

const PAGE_SIZE = 10;

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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => !r.isPublished).length,
    published: reviews.filter((r) => r.isPublished).length,
  };

  const filtered = useMemo(() => {
    let list = reviews;
    if (filter === "pending") list = list.filter((r) => !r.isPublished);
    else if (filter === "published") list = list.filter((r) => r.isPublished);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          (r.comment?.toLowerCase().includes(q) ?? false) ||
          (r.customer?.name?.toLowerCase().includes(q) ?? false) ||
          (r.customer?.email?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [reviews, filter, query]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
      <PageHeader
        title="Reviews"
        subtitle="Reviews are submitted by customers after a completed order. You moderate what appears on your homepage."
        actions={
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="Filter reviews">
            {(["all", "pending", "published"] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
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
        }
      />

      {reviews.length > 0 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={(v) => { setQuery(v); setPage(1); }}
            placeholder="Search reviews by comment or customer…"
            ariaLabel="Search reviews"
          />
        </div>
      )}

      {paged.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-7 w-7" />}
          title={query ? "No matching reviews" : `No ${filter === "all" ? "" : filter} reviews yet`}
          description={
            query
              ? "Try a different search term."
              : "Reviews from completed orders will appear here for moderation."
          }
        />
      ) : (
        <>
          <ul className="space-y-2.5">
            {paged.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-card p-4 elevation-1 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex" aria-label={`${r.rating} of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3.5 w-3.5",
                              i < r.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/25",
                            )}
                          />
                        ))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        by {r.customer?.name ?? r.customer?.email ?? "Anonymous"} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                      <StatusPill tone={r.isPublished ? "success" : "warning"}>
                        {r.isPublished ? "Published" : "Pending"}
                      </StatusPill>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                        &ldquo;{r.comment}&rdquo;
                      </p>
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
          <div className="mt-6">
            <Pagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
