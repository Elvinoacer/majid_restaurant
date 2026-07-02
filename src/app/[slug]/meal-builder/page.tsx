import { notFound } from "next/navigation";
import { MealBuilder } from "@/components/site/meal-builder";
import { AnalyticsTracker } from "@/components/site/analytics-tracker";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { withTagsList } from "@/lib/menu";

export const dynamic = "force-dynamic";

/**
 * Meal builder page (PRD §5.23 — Intelligence Layer).
 *
 * Config-gated: 404s if the restaurant hasn't opted into "combo builder"
 * mode (Restaurant.comboBuilderEnabled). This keeps the feature off the UI
 * for tenants whose menu structure doesn't fit the base → protein → drink
 * → dessert pattern.
 *
 * Phase 4: mounts an invisible <AnalyticsTracker> to fire a
 * `meal_builder_used` event on first load. Used by the analytics dashboard
 * to track adoption of this standout feature.
 */
export default async function MealBuilderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { restaurant, db: tenant } = await getContextRestaurant();

  if (!restaurant.comboBuilderEnabled) {
    notFound();
  }

  // Load all menu items — the component filters by mealBuilderStage.
  const rawItems = await tenant.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { createdAt: "asc" },
  });
  const items = withTagsList(rawItems);

  return (
    <>
      <AnalyticsTracker
        restaurantSlug={restaurant.slug}
        eventType="meal_builder_used"
      />
      <MealBuilder slug={restaurant.slug} items={items} />
    </>
  );
}

export async function generateMetadata() {
  return {
    title: "Build your meal",
    description: "Combine base, protein, drink, and dessert — your perfect combo.",
  };
}
