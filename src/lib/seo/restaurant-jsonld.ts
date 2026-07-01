/**
 * schema.org/Restaurant structured data builder (PRD §5.2).
 *
 * Injected as JSON-LD in the homepage `<head>` for SEO — directly targets
 * the "best biryani in Nakuru" / "restaurants in Nakuru CBD" search intent
 * from the discovery notes.
 */
import type { Restaurant, OperatingHours, Review } from "@/generated/prisma/client";

type OpeningHoursRow = Pick<OperatingHours, "dayOfWeek" | "openTime" | "closeTime" | "isClosed">;

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function buildRestaurantJsonLd(args: {
  restaurant: Pick<
    Restaurant,
    | "name"
    | "tagline"
    | "description"
    | "address"
    | "latitude"
    | "longitude"
    | "contactPhone"
    | "contactEmail"
    | "coverImageUrl"
    | "logoUrl"
    | "currency"
    | "slug"
  >;
  weeklyHours: OpeningHoursRow[];
  reviews?: Pick<Review, "rating" | "comment">[];
  publicUrl: string; // absolute base URL, e.g. https://majid-demo.example.com
}): Record<string, unknown> {
  const { restaurant, weeklyHours, reviews, publicUrl } = args;

  const openingHoursSpecification = weeklyHours
    .filter((h) => !h.isClosed)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_LABELS[h.dayOfWeek],
      opens: h.openTime,
      closes: h.closeTime,
    }));

  const aggregateRating =
    reviews && reviews.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue:
            reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
          reviewCount: reviews.length,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.description ?? restaurant.tagline ?? undefined,
    image: restaurant.coverImageUrl ?? restaurant.logoUrl ?? undefined,
    servesCuisine: ["Kenyan", "Indian", "Biryani", "Halal"],
    priceRange: "$$",
    telephone: restaurant.contactPhone,
    email: restaurant.contactEmail ?? undefined,
    url: `${publicUrl}/${restaurant.slug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.address,
      addressCountry: "KE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    },
    openingHoursSpecification,
    aggregateRating,
  };
}
