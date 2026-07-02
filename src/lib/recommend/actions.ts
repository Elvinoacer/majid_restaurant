/**
 * Server actions for the AI food recommendation feature (PRD §5.22).
 *
 *   - `getRecommendations(query)` — loads the tenant's menu items, runs the
 *      tag-based matcher, records a `recommendation_used` analytics event,
 *      and returns ranked suggestions.
 *
 * The recommendation engine itself lives in `./recommend.ts` (pure function,
 * no DB access) so it can be unit-tested in isolation.
 */
"use server";

import { getContextRestaurant } from "@/lib/restaurant/context";
import { withTagsList } from "@/lib/menu";
import {
  recommend,
  type Recommendation,
  type RecommendableItem,
} from "@/lib/recommend/recommend";
import { trackEvent } from "@/lib/analytics/actions";

export type RecommendationResult = {
  ok: true;
  query: string;
  results: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    isPopular: boolean;
    isVegetarian: boolean;
    isVegan: boolean;
    isSpicy: boolean;
    isHalal: boolean;
    tags: string[];
    score: number;
    matchedOn: string[];
  }>;
};

export type RecommendationError = {
  ok: false;
  error: string;
};

export async function getRecommendations(
  query: string,
): Promise<RecommendationResult | RecommendationError> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, error: "Tell us what you're in the mood for!" };
  }

  const { db: tenant } = await getContextRestaurant();

  // Load all available menu items for the tenant. We deliberately include
  // sold-out items in the load so we can decide whether to surface them
  // (PRD §5.3 says sold-out items are shown greyed-out, not hidden), but the
  // matcher filters them out for recommendations — recommending a sold-out
  // item is a worse experience than not recommending it.
  const rawItems = await tenant.menuItem.findMany({
    orderBy: { createdAt: "asc" },
  });
  const items: RecommendableItem[] = withTagsList(rawItems);

  const recs: Recommendation[] = recommend(trimmed, items, 6);

  // Fire an analytics event — used by the conversion-funnel + the
  // recommendation_used KPI on the admin dashboard. Fire-and-forget.
  void trackEvent("recommendation_used", {
    query: trimmed,
    resultCount: recs.length,
    topItemId: recs[0]?.item.id ?? null,
  });

  return {
    ok: true,
    query: trimmed,
    results: recs.map((r) => ({
      id: r.item.id,
      name: r.item.name,
      description: r.item.description,
      price: r.item.price,
      imageUrl: r.item.imageUrl,
      isPopular: r.item.isPopular,
      isVegetarian: r.item.isVegetarian,
      isVegan: r.item.isVegan,
      isSpicy: r.item.isSpicy,
      isHalal: r.item.isHalal,
      tags: r.item.tags,
      score: r.score,
      matchedOn: r.matchedOn,
    })),
  };
}
