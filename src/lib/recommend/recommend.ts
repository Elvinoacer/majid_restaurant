/**
 * AI food recommendation engine (PRD §5.22 — Intelligence Layer).
 *
 * v1 is intentionally tag-based, not LLM-based. PRD §5.22 says: "v1 can be
 * tag-based matching (fast, free, no API cost) rather than an LLM call —
 * genuinely sufficient for a menu of realistic size, and avoids adding a
 * per-request AI API cost to a free-tier-conscious deployment."
 *
 * The matcher scores each menu item against the customer's free-text craving
 * query by:
 *
 *   1. Tokenising the query into keywords (lowercased, stop-worded).
 *   2. Expanding each keyword against a small synonym map (spicy → hot,
 *      chilli; light → fresh; sweet → dessert; drink → beverage).
 *   3. Building a per-item "matchable haystack" from name + description +
 *      tags + dietary flags.
 *   4. Score = sum of weights:
 *        tag exact match:        +5
 *        dietary flag match:     +3
 *        name substring match:   +4
 *        description substring:  +1
 *        popular-today boost:    +2
 *
 *   5. Items with score > 0 are returned ranked by score, then by popularity.
 *
 * This is genuinely AI-shaped (intent matching, ranking) without any LLM
 * cost — and is the "documented upgrade path" called out in the PRD if the
 * client ever wants true NLP.
 */
import type { MenuItem } from "@/generated/prisma/client";
import { parseTags } from "@/lib/db/serialize";

export type RecommendableItem = MenuItem & { tags: string[] };

export type Recommendation = {
  item: RecommendableItem;
  score: number;
  matchedOn: string[]; // human-readable list of what drove the score
};

// ─── Synonym map ──────────────────────────────────────────────────────────
// Maps free-text keywords the customer might use → tag/keyword forms that
// exist on the menu items. Lowercase, ASCII-only on both sides.
//
// Keep this small and high-precision — adding low-quality synonyms will
// produce bad recommendations, which is worse than no recommendation.
const SYNONYMS: Record<string, string[]> = {
  // Heat
  spicy: ["spicy", "hot", "chilli", "chili"],
  hot: ["spicy", "hot", "warm"],
  mild: ["mild"],
  // Diet
  veg: ["vegetarian"],
  vegetarian: ["vegetarian"],
  vegan: ["vegan"],
  halal: ["halal"],
  healthy: ["vegetarian", "vegan", "fresh"],
  // Meal shape
  breakfast: ["breakfast"],
  lunch: ["lunch", "rice", "stew"],
  dinner: ["dinner", "grill", "bbq"],
  dessert: ["dessert", "sweet"],
  sweet: ["sweet", "dessert"],
  drink: ["drink", "beverage", "juice", "tea", "coffee"],
  beverage: ["drink", "beverage"],
  juice: ["juice", "drink"],
  // Moods
  light: ["light", "fresh", "salad", "vegetarian"],
  fresh: ["fresh", "juice", "salad"],
  heavy: ["rice", "biryani", "grill", "beef", "mutton", "goat"],
  hungry: ["rice", "biryani", "grill", "beef", "mutton", "popular"],
  filling: ["rice", "biryani", "grill", "beef", "mutton"],
  comforting: ["stew", "rice", "chai", "kheer"],
  // Cuisines
  indian: ["indian"],
  kenyan: ["kenyan"],
  swahili: ["swahili"],
  coastal: ["swahili", "coastal"],
  // Proteins
  chicken: ["chicken"],
  beef: ["beef"],
  mutton: ["mutton"],
  goat: ["goat"],
  fish: ["fish"],
  // Cooking method
  grilled: ["grill", "bbq", "tandoor"],
  bbq: ["bbq", "grill"],
  roast: ["grill", "bbq", "roast"],
  fried: ["fried"],
  // Temperature
  cold: ["cold", "ice-cream", "lassi", "juice"],
  iced: ["cold", "ice-cream"],
  hot_drink: ["hot", "tea", "chai"],
  // Signature
  signature: ["signature"],
  popular: ["popular"],
  famous: ["signature", "popular"],
  best: ["signature", "popular"],
  // Time of day phrases
  morning: ["breakfast", "tea", "chai"],
  evening: ["dinner", "grill", "bbq"],
  // Common descriptors
  cheap: ["side", "plain"],
  affordable: ["side", "plain"],
  big: ["rice", "biryani", "grill"],
  family: ["combo", "family", "rice", "biryani"],
  combo: ["combo", "family"],
};

// Stopwords — removed from the query before tokenisation.
const STOPWORDS = new Set([
  "a", "an", "the", "i", "im", "i'm", "me", "my", "we", "us", "feel",
  "feeling", "like", "want", "craving", "for", "of", "to", "in", "on",
  "is", "are", "some", "something", "anything", "give", "get", "have",
  "having", "with", "and", "or", "please", "can", "you", "today", "tonight",
  "now", "right",
]);

/**
 * Tokenise the customer's free-text query into a set of normalised keywords
 * (lowercase, ASCII, stop-worded). Returns the unique set.
 */
function tokeniseQuery(query: string): string[] {
  const raw = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // strip punctuation, keep unicode letters/numbers
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (const tok of raw) {
    if (STOPWORDS.has(tok)) continue;
    if (tok.length < 2) continue;
    out.add(tok);
  }
  return [...out];
}

/**
 * Expand a single token into its synonym group (or just itself if no
 * synonyms are mapped). Always includes the original token.
 */
function expandToken(token: string): string[] {
  const syns = SYNONYMS[token] ?? [];
  return Array.from(new Set([token, ...syns]));
}

/**
 * Build the per-item haystack — name + description + tags + dietary flags.
 * Lowercase. Used as the substring search target.
 */
function buildHaystack(item: RecommendableItem): string {
  const dietary: string[] = [];
  if (item.isVegetarian) dietary.push("vegetarian");
  if (item.isVegan) dietary.push("vegan");
  if (item.isSpicy) dietary.push("spicy");
  if (item.isHalal) dietary.push("halal");
  if (item.isPopular) dietary.push("popular");
  return [
    item.name,
    item.description ?? "",
    ...item.tags,
    ...dietary,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Score one item against the expanded query tokens.
 * Returns the score and a list of human-readable match reasons.
 */
function scoreItem(
  item: RecommendableItem,
  expandedTokens: string[],
  haystack: string,
): { score: number; matchedOn: string[] } {
  let score = 0;
  const matched = new Set<string>();

  for (const tok of expandedTokens) {
    // Tag exact match (highest signal — owner-curated).
    if (item.tags.some((t) => t.toLowerCase() === tok)) {
      score += 5;
      matched.add(`tag: ${tok}`);
      continue;
    }
    // Dietary flag match.
    if (
      (tok === "vegetarian" && item.isVegetarian) ||
      (tok === "vegan" && item.isVegan) ||
      (tok === "spicy" && item.isSpicy) ||
      (tok === "halal" && item.isHalal)
    ) {
      score += 3;
      matched.add(tok);
      continue;
    }
    // Name substring match.
    if (item.name.toLowerCase().includes(tok)) {
      score += 4;
      matched.add(`name: ${tok}`);
      continue;
    }
    // Description substring match (lowest signal — common words appear here).
    if (haystack.includes(tok)) {
      score += 1;
      matched.add(tok);
    }
  }

  // Popularity boost — break ties toward items the owner marked popular.
  if (item.isPopular) {
    score += 1;
  }

  return { score, matchedOn: [...matched] };
}

/**
 * Main entry point — score every item, return the top N ranked results with
 * a non-zero score. Items are pre-filtered to `isAvailable` (sold-out items
 * are not recommended).
 *
 * Pure function — no DB access. Callers should pass in the tenant's menu
 * items already loaded.
 */
export function recommend(
  query: string,
  items: RecommendableItem[],
  limit = 6,
): Recommendation[] {
  const tokens = tokeniseQuery(query);
  if (tokens.length === 0) return [];

  // Expand each token to its synonym group, flatten, dedupe.
  const expanded = Array.from(new Set(tokens.flatMap(expandToken)));

  const scored: Recommendation[] = [];
  for (const item of items) {
    if (!item.isAvailable) continue;
    const haystack = buildHaystack(item);
    const { score, matchedOn } = scoreItem(item, expanded, haystack);
    if (score > 0) {
      scored.push({ item, score, matchedOn });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreak: popular first, then alphabetically by name.
    if (a.item.isPopular !== b.item.isPopular) {
      return a.item.isPopular ? -1 : 1;
    }
    return a.item.name.localeCompare(b.item.name);
  });

  return scored.slice(0, limit);
}

/**
 * Curated quick-prompt suggestions shown as chips under the input.
 * Picked to showcase the range of the matcher — heat, diet, mood, cuisine.
 */
export const RECOMMENDATION_PROMPTS = [
  "I'm hungry",
  "Something spicy",
  "Light lunch",
  "Vegetarian",
  "Sweet tooth",
  "Cold drink",
  "Comfort food",
  "Best sellers",
] as const;
