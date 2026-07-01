import Link from "next/link";
import { ArrowRight, Clock, MapPin, MessageCircle, Star, Utensils } from "lucide-react";
import type { Restaurant, Promotion, Review } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { PromotionsCarousel } from "@/components/site/promotions-carousel";
import { EmbeddedMap } from "@/components/site/embedded-map";
import { FcmOptIn } from "@/components/site/fcm-opt-in";
import { computeOpenStatus, fetchHoursForRestaurant } from "@/lib/restaurant/hours";
import { buildRestaurantJsonLd } from "@/lib/seo/restaurant-jsonld";
import { formatKsh } from "@/lib/whatsapp/order";
import { withTagsList } from "@/lib/menu";

type HomePageProps = {
  restaurant: Restaurant;
  hoursToday: ReturnType<typeof computeOpenStatus>;
  weeklyHours: Awaited<ReturnType<typeof fetchHoursForRestaurant>>["weekly"];
  promotions: Array<Pick<Promotion, "id" | "title" | "description" | "imageUrl" | "linkedCategoryId" | "sortOrder">>;
  reviews: Array<Pick<Review, "rating" | "comment" | "createdAt">>;
  popularItems: ReturnType<typeof withTagsList>;
  publicUrl: string;
};

export function HomePage({
  restaurant,
  hoursToday,
  weeklyHours,
  promotions,
  reviews,
  popularItems,
  publicUrl,
}: HomePageProps) {
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const whatsappUrl = `https://wa.me/${restaurant.whatsappPhone.replace(/[^\d]/g, "")}`;

  const jsonLd = buildRestaurantJsonLd({
    restaurant: {
      name: restaurant.name,
      tagline: restaurant.tagline,
      description: restaurant.description,
      address: restaurant.address,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      contactPhone: restaurant.contactPhone,
      contactEmail: restaurant.contactEmail,
      coverImageUrl: restaurant.coverImageUrl,
      logoUrl: restaurant.logoUrl,
      currency: restaurant.currency,
      slug: restaurant.slug,
    },
    weeklyHours,
    reviews,
    publicUrl,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {restaurant.coverImageUrl && (
           
          <img
            src={restaurant.coverImageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
        )}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(to bottom, rgba(20,15,5,0.6) 0%, rgba(20,15,5,0.75) 100%)",
          }}
        />

        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 md:py-24">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  hoursToday.isOpenNow
                    ? "bg-green-500/90 text-white"
                    : "bg-red-500/90 text-white"
                }`}
              >
                <Clock className="h-3 w-3" />
                {hoursToday.isOpenNow ? "Open now" : "Closed"}
              </span>
              <span className="text-white/80">{hoursToday.label}</span>
              {avgRating && (
                <span className="inline-flex items-center gap-1 text-white/90">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {avgRating} ({reviews.length} reviews)
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
              {restaurant.name}
            </h1>
            {restaurant.tagline && (
              <p className="mt-2 text-base text-white/85 sm:text-lg">
                {restaurant.tagline}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="lg" className="gap-1.5">
                <Link href={`/${restaurant.slug}/menu`}>
                  <Utensils className="h-4 w-4" />
                  Browse Menu &amp; Order
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-1.5"
              >
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Order via WhatsApp
                </a>
              </Button>
            </div>

            <div className="mt-5 flex items-start gap-2 text-sm text-white/85">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{restaurant.address}</span>
            </div>
          </div>

          {/* FCM opt-in — Phase 1 plumbing only (PRD §5.15) */}
          <div className="absolute right-4 top-4 hidden sm:block">
            <FcmOptIn restaurantSlug={restaurant.slug} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Promotions carousel */}
        {promotions.length > 0 && (
          <section className="mb-10" aria-labelledby="promos-heading">
            <h2 id="promos-heading" className="sr-only">
              Current promotions
            </h2>
            <PromotionsCarousel promotions={promotions} />
          </section>
        )}

        {/* Today's specials — popular items */}
        {popularItems.length > 0 && (
          <section className="mb-12" aria-labelledby="popular-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2
                id="popular-heading"
                className="font-display text-xl font-bold text-foreground sm:text-2xl"
              >
                Popular Today
              </h2>
              <Link
                href={`/${restaurant.slug}/menu`}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                See full menu
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {popularItems.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={`/${restaurant.slug}/menu`}
                  className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {item.imageUrl && (
                       
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      KSh {formatKsh(item.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Reviews snippet */}
        {reviews.length > 0 && (
          <section className="mb-12" aria-labelledby="reviews-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2
                id="reviews-heading"
                className="font-display text-xl font-bold text-foreground sm:text-2xl"
              >
                What diners are saying
              </h2>
              {avgRating && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {avgRating} average
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {reviews.slice(0, 4).map((r, i) => (
                <article
                  key={i}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="mb-1 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`h-3.5 w-3.5 ${
                          idx < r.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/80">&ldquo;{r.comment}&rdquo;</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Map */}
        <section aria-labelledby="location-heading" className="mb-4">
          <h2
            id="location-heading"
            className="mb-3 font-display text-xl font-bold text-foreground sm:text-2xl"
          >
            Find Us
          </h2>
          <EmbeddedMap
            name={restaurant.name}
            address={restaurant.address}
            latitude={restaurant.latitude}
            longitude={restaurant.longitude}
            parkingInfo={restaurant.parkingInfo}
          />
        </section>
      </div>
    </>
  );
}
