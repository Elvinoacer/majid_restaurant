import { AiRecommender } from "@/components/site/ai-recommender";
import { AnalyticsTracker } from "@/components/site/analytics-tracker";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { MenuBrowser } from "@/components/site/menu-browser";
import { withTagsList } from "@/lib/menu";
import type { MenuCategory, MenuItem } from "@/generated/prisma/client";
import { Sparkles } from "lucide-react";
import { Container } from "@/components/premium/container";
import { SectionHeading } from "@/components/premium/section-heading";

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
    <Container className="py-6 sm:py-10">
      <AnalyticsTracker
        restaurantSlug={restaurant.slug}
        eventType="recommendation_used"
        payload={{ source: "recommend_page" }}
      />

      <header className="mb-6 text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Find your next meal
        </h1>
        <p className="mx-auto mt-1.5 max-w-xl text-sm text-muted-foreground sm:text-base">
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
      <section className="mt-10">
        <SectionHeading
          title="Or browse the menu"
          actionHref={`/${restaurant.slug}/menu`}
          actionLabel="Full menu"
        />
        <MenuBrowser
          categories={categoriesWithItems}
          restaurantName={restaurant.name}
          whatsappPhone={restaurant.whatsappPhone}
        />
      </section>
    </Container>
  );
}

export async function generateMetadata() {
  return {
    title: "Recommend a dish",
    description: "Tell us your craving — we'll match it to dishes on our menu.",
  };
}
