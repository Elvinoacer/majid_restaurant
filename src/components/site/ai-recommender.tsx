"use client";

/**
 * AI food recommender (PRD §5.22 — Intelligence Layer).
 *
 * Chat-like UI: free-text input + quick-prompt chips + ranked suggestion
 * cards. The "AI" is a tag-based matcher (see src/lib/recommend/recommend.ts)
 * — fast, free, no API cost. Documented as an upgrade path to a true LLM
 * should the client want NLP later.
 *
 * Mobile-first: input is sticky-friendly, chips wrap, cards stack.
 * Each suggestion card has "Add to cart" + "Order via WhatsApp" buttons so
 * the customer can act on the recommendation in one tap.
 */
import { useState, useTransition, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  Flame,
  Leaf,
  Star,
  ShoppingCart,
  Check,
  MessageCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCart } from "@/lib/cart/store";
import {
  buildSingleItemWhatsAppMessage,
  buildWhatsAppUrl,
  formatKsh,
} from "@/lib/whatsapp/order";
import {
  getRecommendations,
  type RecommendationResult,
} from "@/lib/recommend/actions";
import { RECOMMENDATION_PROMPTS } from "@/lib/recommend/recommend";

type RecommenderProps = {
  restaurantName: string;
  whatsappPhone: string;
  variant?: "full" | "compact";
};

export function AiRecommender({
  restaurantName,
  whatsappPhone,
  variant = "full",
}: RecommenderProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecommendationResult["results"] | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [rankedBy, setRankedBy] = useState<"tags" | "llm" | null>(null);
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setLastQuery(trimmed);
      startTransition(async () => {
        const res = await getRecommendations(trimmed);
        if (!res.ok) {
          toast.error(res.error);
          setResults([]);
          setRankedBy(null);
          return;
        }
        setResults(res.results);
        setRankedBy(res.rankedBy);
        if (res.results.length === 0) {
          toast.message("No matches — try a different craving.");
        }
      });
    },
    [startTransition],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(query);
  };

  const handleClear = () => {
    setQuery("");
    setResults(null);
    setLastQuery("");
    setRankedBy(null);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm",
        variant === "full" && "p-4 sm:p-6",
        variant === "compact" && "p-3 sm:p-4",
      )}
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">
            What are you in the mood for?
          </h2>
          <p className="text-xs text-muted-foreground">
            Describe your craving — we&apos;ll match it to the menu.
          </p>
        </div>
      </header>

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 'something spicy' or 'I'm hungry'"
          aria-label="Describe your craving"
          className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-24 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/10"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={pending || !query.trim()}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Suggest
          </Button>
        </div>
      </form>

      {/* Quick-prompt chips */}
      {!results && (
        <div className="mt-3 flex flex-wrap gap-2">
          {RECOMMENDATION_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setQuery(p);
                run(p);
              }}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mt-4 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {results.length === 0 ? (
                <>No matches for &ldquo;{lastQuery}&rdquo;.</>
              ) : (
                <>
                  {results.length} suggestion{results.length === 1 ? "" : "s"} for{" "}
                  <span className="font-semibold text-foreground">&ldquo;{lastQuery}&rdquo;</span>
                  {rankedBy === "llm" && (
                    <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary" title="Re-ranked by AI">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI-ranked
                    </span>
                  )}
                </>
              )}
            </p>
            <button
              onClick={handleClear}
              className="text-xs font-medium text-primary hover:underline"
            >
              Start over
            </button>
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Try &ldquo;something spicy&rdquo;, &ldquo;vegetarian&rdquo;, or &ldquo;cold drink&rdquo;.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((r) => (
                <RecommendationCard
                  key={r.id}
                  item={r}
                  restaurantName={restaurantName}
                  whatsappPhone={whatsappPhone}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  item,
  restaurantName,
  whatsappPhone,
}: {
  item: RecommendationResult["results"][number];
  restaurantName: string;
  whatsappPhone: string;
}) {
  const [added, setAdded] = useState(false);
  const addLine = useCart((s) => s.addLine);

  const handleAdd = () => {
    addLine({
      menuItemId: item.id,
      name: item.name,
      unitPrice: item.price,
      imageUrl: item.imageUrl,
    });
    setAdded(true);
    toast.success(`${item.name} added to cart`);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWhatsApp = () => {
    const msg = buildSingleItemWhatsAppMessage({
      restaurantName,
      itemName: item.name,
      quantity: 1,
    });
    window.open(buildWhatsAppUrl(whatsappPhone, msg), "_blank", "noopener,noreferrer");
  };

  return (
    <li className="flex gap-3 rounded-xl border border-border bg-background p-3">
      {/* Image */}
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
          <span className="shrink-0 text-sm font-semibold text-primary">
            KSh {formatKsh(item.price)}
          </span>
        </div>
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        )}
        {/* Match reasons + dietary flags */}
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          {item.matchedOn.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              match: {item.matchedOn.slice(0, 2).join(", ")}
            </span>
          )}
          {item.isSpicy && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-orange-700">
              <Flame className="h-2.5 w-2.5" /> Spicy
            </span>
          )}
          {item.isVegetarian && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-green-700">
              <Leaf className="h-2.5 w-2.5" /> Veg
            </span>
          )}
          {item.isPopular && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-amber-700">
              <Star className="h-2.5 w-2.5" /> Popular
            </span>
          )}
        </div>
        {/* Actions */}
        <div className="mt-auto flex gap-1.5 pt-1">
          <Button
            size="sm"
            variant={added ? "secondary" : "default"}
            onClick={handleAdd}
            className="h-7 gap-1 px-2 text-xs"
          >
            {added ? <Check className="h-3 w-3" /> : <ShoppingCart className="h-3 w-3" />}
            {added ? "Added" : "Add"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleWhatsApp}
            className="h-7 gap-1 px-2 text-xs"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </Button>
        </div>
      </div>
    </li>
  );
}
