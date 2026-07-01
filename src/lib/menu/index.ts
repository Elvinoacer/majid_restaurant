/**
 * Menu helpers: tag parsing, search, filtering, dietary label computation.
 */
import type { MenuItem } from "@/generated/prisma/client";
import { parseTags } from "@/lib/db/serialize";

export type MenuItemWithTags = MenuItem & { tags: string[] };

export function withTags(item: MenuItem): MenuItemWithTags {
  return { ...item, tags: parseTags((item as any).tagsJson) };
}

export function withTagsList(items: MenuItem[]): MenuItemWithTags[] {
  return items.map(withTags);
}

/**
 * Search across name + description + tags. Simple substring match, case-insensitive.
 * Good enough for a realistic menu size (PRD §5.22 acknowledges tag-based
 * matching is sufficient for v1).
 */
export function searchMenuItems(
  items: MenuItemWithTags[],
  query: string,
): MenuItemWithTags[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.description ?? "",
      ...item.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export type DietaryFlag =
  | "vegetarian"
  | "vegan"
  | "spicy"
  | "halal"
  | "popular"
  | "sold-out";

export function getDietaryFlags(item: MenuItemWithTags): DietaryFlag[] {
  const flags: DietaryFlag[] = [];
  if (item.isVegetarian) flags.push("vegetarian");
  if (item.isVegan) flags.push("vegan");
  if (item.isSpicy) flags.push("spicy");
  if (item.isHalal) flags.push("halal");
  if (item.isPopular) flags.push("popular");
  if (!item.isAvailable) flags.push("sold-out");
  return flags;
}

export const DIETARY_LABELS: Record<DietaryFlag, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  spicy: "Spicy",
  halal: "Halal",
  popular: "Popular today",
  "sold-out": "Sold out",
};
