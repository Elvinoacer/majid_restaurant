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
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { PremiumCard } from "@/components/premium/card";

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
    <form onSubmit={handleSubmit}>
      <Container size="narrow" className="py-6 sm:py-10">
        <PageHeader
          title="Leave a review"
          subtitle={<>How was your order of <strong>{itemName}</strong>?</>}
        />

        <PremiumCard className="p-5">
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
                className="rounded-lg p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-9 w-9 transition-colors",
                    (hover || rating) >= n
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30",
                  )}
                />
              </button>
            ))}
          </div>

          <div className="mt-5">
            <Label htmlFor="comment">Your review (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell other diners what you thought…"
              className="mt-1.5 min-h-[120px]"
            />
          </div>
        </PremiumCard>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="submit" disabled={pending} className="gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit review"}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${slug}/orders/${orderId}`}>Cancel</Link>
          </Button>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          Reviews are moderated by the restaurant owner before going live.
          Only customers who have completed an order can review it.
        </p>
      </Container>
    </form>
  );
}
