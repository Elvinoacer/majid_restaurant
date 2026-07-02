import { AiRecommender } from "@/components/site/ai-recommender";
import { AnalyticsTracker } from "@/components/site/analytics-tracker";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { MenuBrowser } from "@/components/site/menu-browser";
import { withTagsList } from "@/lib/menu";
import type { MenuCategory, MenuItem } from "@/generated/prisma/client";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Dedicated AI recommendation page (PRD §5.22).
 *
 * Mounts the recommender front-and-center, then a "Browse the full menu"
 * section below for visitors who'd rather explore than describe.
 */
export default async function RecommendPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { restaurant, db: tenant } = await getContextRestaurant();

  const categories = await tenant.menuCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { createdAt: "asc" }, take: 6 } },
  });

  const categoriesWithItems = categories.map((c) => ({
    category: c,
    items: withTagsList(c.items as MenuItem[]),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <AnalyticsTracker
        restaurantSlug={restaurant.slug}
        eventType="recommendation_used"
        payload={{ source: "recommend_page" }}
      />

      <header className="mb-5 text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Find your next meal
        </h1>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
          Tell us how you&apos;re feeling and we&apos;ll match you to dishes on
          the {restaurant.name} menu. No sign-up needed.
        </p>
      </header>

      <AiRecommender
        restaurantName={restaurant.name}
        whatsappPhone={restaurant.whatsappPhone}
        variant="full"
      />

      {/* Quick menu browse fallback */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold sm:text-xl">
            Or browse the menu
          </h2>
          <Link
            href={`/${restaurant.slug}/menu`}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Full menu <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <MenuBrowser
          categories={categoriesWithItems}
          restaurantName={restaurant.name}
          whatsappPhone={restaurant.whatsappPhone}
        />
      </section>
    </div>
  );
}

export async function generateMetadata() {
  return {
    title: "Recommend a dish",
    description: "Tell us your craving — we'll match it to dishes on our menu.",
  };
}
