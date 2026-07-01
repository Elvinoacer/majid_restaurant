"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

export function ReviewForm({
  slug,
  orderId,
  itemName,
}: {
  slug: string;
  orderId: string;
  itemName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error("Please pick a rating from 1 to 5 stars");
      return;
    }
    startTransition(async () => {
      const result = await createReview({
        orderId,
        rating,
        comment: comment.trim() || null,
        photoUrl: null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Thanks! Your review will appear once the owner approves it.");
      router.push(`/${slug}/orders/${orderId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md px-4 py-6 sm:py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Leave a review</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How was your order of <strong>{itemName}</strong>?
      </p>

      <div className="mt-6">
        <Label>Rating</Label>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={(hover || rating) === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="rounded-md p-1"
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  (hover || rating) >= n
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="comment">Your review (optional)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell other diners what you thought…"
          className="mt-1 min-h-[100px]"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit review"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${slug}/orders/${orderId}`}>Cancel</Link>
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Reviews are moderated by the restaurant owner before going live.
        Only customers who have completed an order can review it.
      </p>
    </form>
  );
}
