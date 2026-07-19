import { HomePage } from "@/components/site/home-page";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { computeOpenStatus, fetchHoursForRestaurant } from "@/lib/restaurant/hours";
import { withTagsList } from "@/lib/menu";

export const dynamic = "force-dynamic";

/**
 * Tenant homepage (PRD §5.2 — Official Online Presence).
 *
 * Aggregates hours, location, phone, order CTA, today's specials, reviews
 * snippet. Includes schema.org/Restaurant structured data for SEO — directly
 * targets the "best biryani in Nakuru" / "restaurants in Nakuru CBD" search
 * intent from the discovery notes.
 */
export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { restaurant, db: tenant } = await getContextRestaurant();

  const { weekly, overrides } = await fetchHoursForRestaurant(restaurant.id);
  const hoursToday = computeOpenStatus(weekly, overrides, new Date(), restaurant.timezone);

  // Active promotions (date-bounded and active).
  const now = new Date();
  const promotions = await tenant.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Popular items.
  const popularItemsRaw = await tenant.menuItem.findMany({
    where: { isPopular: true, isAvailable: true },
    take: 4,
  });
  const popularItems = withTagsList(popularItemsRaw);

  // Published reviews.
  const reviews = await tenant.review.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  // Story content (PRD §5.21) — surfaced as a homepage teaser band, full
  // version lives on /about. Optional: some tenants haven't filled this in.
  const aboutContent = await tenant.aboutContent.findFirst();

  // A handful of gallery shots for the homepage teaser strip; full gallery
  // with filtering + lightbox lives on /gallery.
  const galleryPreview = await tenant.galleryImage.findMany({
    orderBy: { sortOrder: "asc" },
    take: 6,
  });

  const publicUrl =
    process.env.NEXT_PUBLIC_PUBLIC_URL ??
    `https://${restaurant.slug}.majidos.app`;

  return (
    <HomePage
      restaurant={restaurant}
      hoursToday={hoursToday}
      weeklyHours={weekly}
      promotions={promotions.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        linkedCategoryId: p.linkedCategoryId,
        sortOrder: p.sortOrder,
      }))}
      reviews={reviews.map((r) => ({
        rating: r.rating,
        comment: r.comment ?? "",
        createdAt: r.createdAt,
      }))}
      popularItems={popularItems}
      publicUrl={publicUrl}
      aboutContent={
        aboutContent
          ? { story: aboutContent.story, mission: aboutContent.mission }
          : null
      }
      galleryPreview={galleryPreview.map((g) => ({
        id: g.id,
        imageUrl: g.imageUrl,
        caption: g.caption,
      }))}
    />
  );
}
