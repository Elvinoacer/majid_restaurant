/**
 * Server actions for the AI food recommendation feature (PRD §5.22).
 *
 *   - `getRecommendations(query)` — loads the tenant's menu items, runs the
 *      tag-based matcher, records a `recommendation_used` analytics event,
 *      and returns ranked suggestions.
 *
 * The recommendation engine itself lives in `./recommend.ts` (pure function,
 * no DB access) so it can be unit-tested in isolation.
 *
 * LLM upgrade path: if `ZAI_API_KEY` is set in the environment, we ALSO ask
 * the GLM model (via z-ai-web-dev-sdk) to re-rank the top tag-based matches
 * with a short reasoning pass. The tag-based matcher always runs first as
 * the free, deterministic fallback — the LLM only reorders / enriches the
 * shortlist. If the LLM call fails for any reason, we silently fall back to
 * the tag-based order so the customer never sees an error.
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
  /** Where the ranking came from — surfaceable in the UI for transparency. */
  rankedBy: "tags" | "llm";
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

  // Optional LLM re-rank. Only runs if the ZAI SDK is configured (i.e. a
  // `.z-ai-config` file is present). The tag matcher result is the source
  // of truth — the LLM can only reorder the shortlist, not introduce items
  // the matcher didn't already surface.
  let rankedBy: "tags" | "llm" = "tags";
  let finalRecs = recs;
  if (recs.length > 0) {
    try {
      const llmOrder = await llmRerank(trimmed, recs);
      if (llmOrder && llmOrder.length > 0) {
        // Apply LLM ordering but keep all original items (the LLM may have
        // ranked fewer than we sent — append any leftovers in tag order).
        const ranked = llmOrder
          .map((id) => recs.find((r) => r.item.id === id))
          .filter((r): r is Recommendation => r !== undefined);
        const leftovers = recs.filter((r) => !ranked.includes(r));
        finalRecs = [...ranked, ...leftovers];
        rankedBy = "llm";
      }
    } catch (e) {
      // LLM failed — fall back to tag order. Don't surface to the customer.
      console.warn("[recommend] LLM re-rank failed, using tag-based order:", e);
    }
  }

  return {
    ok: true,
    query: trimmed,
    rankedBy,
    results: finalRecs.map((r) => ({
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

/**
 * Ask the GLM model (via z-ai-web-dev-sdk) to re-rank the tag-based
 * shortlist against the customer's free-text craving. Returns the item IDs
 * in the LLM's preferred order, or null if the SDK isn't configured (no
 * `.z-ai-config` file) or the call fails for any reason.
 *
 * The prompt is deliberately small and structured — we send the query, the
 * shortlist (name + description + tags), and ask for a JSON array of IDs.
 * This keeps token usage low (good for free-tier deployments) and the
 * response easy to parse robustly.
 *
 * Note: the SDK reads its credentials from a `.z-ai-config` JSON file in
 * the project root, home dir, or `/etc/.z-ai-config` — NOT from env vars.
 * If no config file is present, `ZAI.create()` throws and we silently fall
 * back to tag-based ranking.
 */
let zaiInstance: { chat: { completions: { create: (b: unknown) => Promise<{ choices?: Array<{ message?: { content?: string } }> }> } } } | null | undefined;
async function getZai(): Promise<typeof zaiInstance> {
  if (zaiInstance !== undefined) return zaiInstance;
  try {
    const mod = await import("z-ai-web-dev-sdk").then((m) => m.default ?? m).catch(() => null);
    if (!mod) { zaiInstance = null; return null; }
    const inst = await mod.create();
    zaiInstance = inst as unknown as NonNullable<typeof zaiInstance>;
    return zaiInstance;
  } catch (e) {
    console.warn("[recommend] ZAI SDK not configured (no .z-ai-config file?) — falling back to tag-based ranking:", e);
    zaiInstance = null;
    return null;
  }
}

async function llmRerank(
  query: string,
  recs: Recommendation[],
): Promise<string[] | null> {
  try {
    const zai = await getZai();
    if (!zai) return null;

    const shortlist = recs.map((r) => ({
      id: r.item.id,
      name: r.item.name,
      description: r.item.description ?? "",
      tags: r.item.tags,
      price: r.item.price,
    }));

    const prompt = `You are a food recommendation engine for a Kenyan-Indian restaurant.
A customer described their craving as: "${query}"

Here is a shortlist of menu items (already pre-filtered by a tag-based matcher):
${JSON.stringify(shortlist, null, 2)}

Re-rank these items from MOST relevant to LEAST relevant for the customer's craving.
Return ONLY a JSON array of the item IDs in your preferred order. No prose, no markdown, no explanation.
Example response: ["item-id-1", "item-id-2", "item-id-3"]`;

    const result = await zai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a precise food-matching assistant. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 200,
      thinking: { type: "disabled" },
    } as unknown as Parameters<typeof zai.chat.completions.create>[0]);

    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Extract the JSON array from the response (the model may wrap it in
    // markdown fences despite instructions — strip them).
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return null;

    // Validate that every entry is a string and exists in our shortlist.
    const validIds = new Set(recs.map((r) => r.item.id));
    return parsed.filter((id): id is string => typeof id === "string" && validIds.has(id));
  } catch (e) {
    console.warn("[recommend] LLM re-rank threw:", e);
    return null;
  }
}
