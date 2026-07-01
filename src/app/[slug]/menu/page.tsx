import { MenuBrowser } from "@/components/site/menu-browser";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { withTagsList } from "@/lib/menu";
import type { MenuCategory, MenuItem } from "@/generated/prisma/client";
import { Clock } from "lucide-react";
import { computeOpenStatus, fetchHoursForRestaurant } from "@/lib/restaurant/hours";

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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Our Menu
          </h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              hoursToday.isOpenNow
                ? "bg-green-500/15 text-green-700"
                : "bg-red-500/15 text-red-700"
            }`}
          >
            <Clock className="h-3 w-3" />
            {hoursToday.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Tap an item to order via WhatsApp — your message will be pre-filled.
          {restaurant.tagline && ` ${restaurant.tagline}.`}
        </p>
      </header>

      <MenuBrowser
        categories={categoriesWithItems}
        restaurantName={restaurant.name}
        whatsappPhone={restaurant.whatsappPhone}
      />
    </div>
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
