"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { MenuSearchBar } from "@/components/site/menu-search-bar";
import {
  MenuFilterChips,
  type FilterChip,
} from "@/components/site/menu-filter-chips";
import { MenuItemCard } from "@/components/site/menu-item-card";
import { EmptyState } from "@/components/premium/empty-state";
import { searchMenuItems, type MenuItemWithTags } from "@/lib/menu";
import type { MenuCategory, MenuItem } from "@/generated/prisma/client";

type CategoryWithItems = {
  category: Pick<MenuCategory, "id" | "name" | "sortOrder">;
  items: MenuItemWithTags[];
};

type MenuBrowserProps = {
  categories: CategoryWithItems[];
  restaurantName: string;
  whatsappPhone: string;
};

const DIETARY_FILTERS: FilterChip[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "spicy", label: "Spicy" },
  { id: "popular", label: "Popular today" },
];

export function MenuBrowser({
  categories,
  restaurantName,
  whatsappPhone,
}: MenuBrowserProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [activeDietary, setActiveDietary] = useState<string[]>([]);

  // Flatten all items for search.
  const allItems = useMemo(
    () => categories.flatMap((c) => c.items),
    [categories],
  );

  // Build chip list — only show categories with at least one available or sold-out item.
  const categoryChips: FilterChip[] = categories.map((c) => ({
    id: c.category.id,
    label: c.category.name,
    count: c.items.length,
  }));

  // Filter.
  const filteredByCategory = useMemo(() => {
    if (activeCategory === "all") return categories;
    return categories.filter((c) => c.category.id === activeCategory);
  }, [activeCategory, categories]);

  const filteredByDietary = useMemo(() => {
    if (activeDietary.length === 0) return filteredByCategory;
    return filteredByCategory.map((c) => ({
      ...c,
      items: c.items.filter((item) =>
        activeDietary.every((flag) => {
          if (flag === "vegetarian") return item.isVegetarian;
          if (flag === "vegan") return item.isVegan;
          if (flag === "spicy") return item.isSpicy;
          if (flag === "popular") return item.isPopular;
          return true;
        }),
      ),
    }));
  }, [filteredByCategory, activeDietary]);

  // Apply search across all items (regardless of category).
  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return searchMenuItems(allItems, query);
  }, [allItems, query]);

  const toggleDietary = (id: string) =>
    setActiveDietary((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // Render: search results OR filtered category browse.
  if (searchResults) {
    return (
      <div className="space-y-4">
        <MenuSearchBar value={query} onChange={setQuery} />
        <p className="text-sm text-muted-foreground">
          {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for &quot;{query}&quot;
        </p>
        {searchResults.length === 0 ? (
          <NoResults />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                restaurantName={restaurantName}
                whatsappPhone={whatsappPhone}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MenuSearchBar value={query} onChange={setQuery} />

      {/* Sticky filter bar — mobile-first per PRD §5.3 */}
      <div className="sticky top-16 z-30 -mx-4 bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-md sm:px-0">
        <MenuFilterChips
          categories={categoryChips}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          dietaryFilters={DIETARY_FILTERS}
          activeDietary={activeDietary}
          onDietaryToggle={toggleDietary}
        />
      </div>

      {filteredByDietary.every((c) => c.items.length === 0) ? (
        <NoResults />
      ) : (
        <div className="space-y-10">
          {filteredByDietary.map(
            (c) =>
              c.items.length > 0 && (
                <section key={c.category.id} aria-labelledby={`cat-${c.category.id}`}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2
                      id={`cat-${c.category.id}`}
                      className="font-display text-xl font-bold text-foreground sm:text-2xl"
                    >
                      {c.category.name}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {c.items.length} item{c.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {c.items.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        restaurantName={restaurantName}
                        whatsappPhone={whatsappPhone}
                      />
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
      )}
    </div>
  );
}

function NoResults() {
  return (
    <EmptyState
      icon={<SearchX className="h-7 w-7" />}
      title="No dishes match"
      description="Try a different search term, or clear your filters to see the full menu."
    />
  );
}
