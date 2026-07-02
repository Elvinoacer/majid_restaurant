import { MenuBrowser } from "@/components/site/menu-browser";
import { AnalyticsTracker } from "@/components/site/analytics-tracker";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { withTagsList } from "@/lib/menu";
import type { MenuCategory, MenuItem } from "@/generated/prisma/client";
import { Clock } from "lucide-react";
import { computeOpenStatus, fetchHoursForRestaurant } from "@/lib/restaurant/hours";
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { StatusPill } from "@/components/premium/status-pill";

export const dynamic = "force-dynamic";

/**
 * Tenant menu page (PRD §5.3 — Digital Menu).
 *
 * Mobile-first, sticky category chips, search-as-you-type across name +
 * description + tags, sold-out items shown greyed-out rather than hidden,
 * WhatsApp ordering deep link on each item.
 */
export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { restaurant, db: tenant } = await getContextRestaurant();

  const categories = await tenant.menuCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  const { weekly, overrides } = await fetchHoursForRestaurant(restaurant.id);
  const hoursToday = computeOpenStatus(weekly, overrides, new Date(), restaurant.timezone);

  const categoriesWithItems = categories.map((c) => ({
    category: c,
    items: withTagsList(c.items as MenuItem[]),
  }));

  return (
    <Container className="py-6 sm:py-10">
      <AnalyticsTracker restaurantSlug={restaurant.slug} eventType="menu_view" />

      <PageHeader
        title="Our Menu"
        subtitle={
          <>
            Browse, search, and order in a tap.{" "}
            {restaurant.tagline && (
              <span className="text-foreground/60">{restaurant.tagline}.</span>
            )}
          </>
        }
        actions={
          <StatusPill
            tone={hoursToday.isOpenNow ? "success" : "danger"}
            pulse={hoursToday.isOpenNow}
          >
            <Clock className="h-3 w-3" />
            {hoursToday.label}
          </StatusPill>
        }
      />

      <MenuBrowser
        categories={categoriesWithItems}
        restaurantName={restaurant.name}
        whatsappPhone={restaurant.whatsappPhone}
      />
    </Container>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `Menu`,
    description: `Browse our full menu and order via WhatsApp or online.`,
  };
}
