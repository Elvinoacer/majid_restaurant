import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Clock,
  MapPin,
  MessageCircle,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";
import type { Restaurant, Promotion, Review } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/premium/container";
import { SectionHeading } from "@/components/premium/section-heading";
import { PremiumCard } from "@/components/premium/card";
import { PromotionsCarousel } from "@/components/site/promotions-carousel";
import { EmbeddedMap } from "@/components/site/embedded-map";
import { FcmOptIn } from "@/components/site/fcm-opt-in";
import { AiRecommender } from "@/components/site/ai-recommender";
import { computeOpenStatus, fetchHoursForRestaurant } from "@/lib/restaurant/hours";
import { buildRestaurantJsonLd } from "@/lib/seo/restaurant-jsonld";
import { formatKsh } from "@/lib/whatsapp/order";
import { withTagsList } from "@/lib/menu";

type HomePageProps = {
  restaurant: Restaurant;
  hoursToday: ReturnType<typeof computeOpenStatus>;
  weeklyHours: Awaited<ReturnType<typeof fetchHoursForRestaurant>>["weekly"];
  promotions: Array<
    Pick<Promotion, "id" | "title" | "description" | "imageUrl" | "linkedCategoryId" | "sortOrder">
  >;
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
          <Image
            src={restaurant.coverImageUrl}
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
        )}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.15 0.02 70 / 0.65) 0%, oklch(0.15 0.02 70 / 0.78) 100%)",
          }}
        />

        <Container className="py-16 sm:py-24 md:py-28">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-white/90">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
                  hoursToday.isOpenNow
                    ? "bg-success/90 text-success-foreground"
                    : "bg-danger/90 text-danger-foreground"
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

            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
              {restaurant.name}
            </h1>
            {restaurant.tagline && (
              <p className="mt-3 max-w-xl text-lg text-white/85 sm:text-xl">
                {restaurant.tagline}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href={`/${restaurant.slug}/menu`}>
                  <Utensils className="h-4 w-4" />
                  Browse Menu &amp; Order
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 backdrop-blur-sm"
              >
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Order via WhatsApp
                </a>
              </Button>
            </div>

            <div className="mt-6 flex items-start gap-2 text-sm text-white/85">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{restaurant.address}</span>
            </div>
          </div>

          {/* FCM opt-in — Phase 1 plumbing only (PRD §5.15) */}
          <div className="absolute right-4 top-4 hidden sm:block">
            <FcmOptIn restaurantSlug={restaurant.slug} />
          </div>
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        {/* Promotions carousel */}
        {promotions.length > 0 && (
          <section className="mb-12" aria-labelledby="promos-heading">
            <h2 id="promos-heading" className="sr-only">
              Current promotions
            </h2>
            <PromotionsCarousel promotions={promotions} />
          </section>
        )}

        {/* Today's specials — popular items */}
        {popularItems.length > 0 && (
          <section className="mb-14">
            <SectionHeading
              title="Popular Today"
              description="What other diners are loving right now"
              actionHref={`/${restaurant.slug}/menu`}
              actionLabel="See full menu"
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {popularItems.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={`/${restaurant.slug}/menu`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card elevation-1 transition-all duration-200 hover:elevation-2 hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-3.5">
                    <h3 className="text-sm font-semibold leading-snug text-foreground">
                      {item.name}
                    </h3>
                    <p className="mt-1.5 font-display text-sm font-bold tabular-nums text-primary">
                      <span className="text-xs font-normal text-muted-foreground">
                        KSh{" "}
                      </span>
                      {formatKsh(item.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* AI Food Recommendation */}
        <section className="mb-14" aria-labelledby="recommend-heading">
          <SectionHeading
            title={
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Not sure what to order?
              </span>
            }
            description="Tell us your mood and we'll suggest the perfect dish"
            actionHref={`/${restaurant.slug}/recommend`}
            actionLabel="Full experience"
          />
          <AiRecommender
            restaurantName={restaurant.name}
            whatsappPhone={restaurant.whatsappPhone}
            variant="compact"
          />
        </section>

        {/* Reviews snippet */}
        {reviews.length > 0 && (
          <section className="mb-14" aria-labelledby="reviews-heading">
            <SectionHeading
              title="What diners are saying"
              description="Real reviews from real guests"
              action={
                avgRating && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-foreground">{avgRating}</span>
                    average
                  </span>
                )
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {reviews.slice(0, 4).map((r, i) => (
                <PremiumCard key={i} className="p-5">
                  <div className="mb-2 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`h-3.5 w-3.5 ${
                          idx < r.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/25"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/85">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                </PremiumCard>
              ))}
            </div>
          </section>
        )}

        {/* Map */}
        <section aria-labelledby="location-heading" className="mb-4">
          <SectionHeading
            title="Find Us"
            description={restaurant.address}
          />
          <EmbeddedMap
            name={restaurant.name}
            address={restaurant.address}
            latitude={restaurant.latitude}
            longitude={restaurant.longitude}
            parkingInfo={restaurant.parkingInfo}
          />
        </section>
      </Container>
    </>
  );
}
