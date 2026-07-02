"use client";

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
  Phone,
  CalendarDays,
  ChefHat,
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
import { FadeIn, StaggerContainer, staggerChild, motion } from "@/components/premium/motion";

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

      {/* ── Hero ─────────────────────────────────────────────────── */}
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
        {/* Richer gradient overlay */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.12 0.02 70 / 0.55) 0%, oklch(0.10 0.02 70 / 0.82) 70%, oklch(0.10 0.02 70 / 0.92) 100%)",
          }}
        />
        {/* Subtle warm glow at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 -z-10 h-40"
          style={{
            background:
              "linear-gradient(to top, oklch(0.62 0.16 50 / 0.08), transparent)",
          }}
        />

        <Container className="relative py-20 sm:py-28 md:py-36">
          <div className="max-w-2xl">
            {/* Status badges */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-5 flex flex-wrap items-center gap-2.5"
            >
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md ${
                  hoursToday.isOpenNow
                    ? "bg-success/90 text-success-foreground"
                    : "bg-danger/90 text-danger-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${hoursToday.isOpenNow ? "bg-success-foreground animate-pulse-soft" : "bg-danger-foreground"}`} />
                {hoursToday.isOpenNow ? "Open now" : "Closed"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                <Clock className="mr-1 inline h-3 w-3" />
                {hoursToday.label}
              </span>
              {avgRating && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
                  <Star className="mr-0.5 inline h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {avgRating} ({reviews.length})
                </span>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
            >
              {restaurant.name}
            </motion.h1>

            {restaurant.tagline && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-4 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl"
              >
                {restaurant.tagline}
              </motion.p>
            )}

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <Button asChild size="lg" className="gap-2 text-base">
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
            </motion.div>

            {/* Address */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="mt-8 flex items-start gap-2 text-sm text-white/75"
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{restaurant.address}</span>
            </motion.div>
          </div>

          {/* FCM opt-in */}
          <div className="absolute right-4 top-4 hidden sm:block">
            <FcmOptIn restaurantSlug={restaurant.slug} />
          </div>
        </Container>
      </section>

      {/* ── Quick Features Strip ──────────────────────────────── */}
      <FadeIn>
        <div className="border-b border-border bg-card/60 backdrop-blur-sm">
          <Container>
            <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
              {[
                { icon: ChefHat, label: "Fresh daily", sub: "Prepared to order" },
                { icon: MapPin, label: "Delivery", sub: "Across Nakuru CBD" },
                { icon: Phone, label: "Call to order", sub: restaurant.contactPhone ?? "Available" },
                { icon: CalendarDays, label: "Events & catering", sub: "Weddings, corporate" },
              ].map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-5"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{f.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </div>
      </FadeIn>

      <Container className="py-12 sm:py-16">
        {/* ── Promotions ──────────────────────────────────────── */}
        {promotions.length > 0 && (
          <FadeIn>
            <section className="mb-16" aria-labelledby="promos-heading">
              <h2 id="promos-heading" className="sr-only">
                Current promotions
              </h2>
              <PromotionsCarousel promotions={promotions} />
            </section>
          </FadeIn>
        )}

        {/* ── Popular items ───────────────────────────────────── */}
        {popularItems.length > 0 && (
          <section className="mb-16">
            <FadeIn>
              <SectionHeading
                title="Popular Today"
                description="What other diners are loving right now"
                actionHref={`/${restaurant.slug}/menu`}
                actionLabel="See full menu"
              />
            </FadeIn>
            <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {popularItems.slice(0, 4).map((item) => (
                <motion.div key={item.id} variants={staggerChild}>
                  <Link
                    href={`/${restaurant.slug}/menu`}
                    className="group block overflow-hidden rounded-2xl border border-border bg-card elevation-1 transition-all duration-300 hover:elevation-2 hover:-translate-y-1 hover:border-primary/25"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                      )}
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>
                    <div className="p-3.5 sm:p-4">
                      <h3 className="text-sm font-semibold leading-snug text-foreground sm:text-base">
                        {item.name}
                      </h3>
                      {item.tagsList && item.tagsList.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.tagsList.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 font-display text-sm font-bold tabular-nums text-primary sm:text-base">
                        <span className="text-xs font-normal text-muted-foreground">
                          KSh{" "}
                        </span>
                        {formatKsh(item.price)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </StaggerContainer>
          </section>
        )}

        {/* ── Section divider ──────────────────────────────────── */}
        <div className="section-divider mb-16" aria-hidden />

        {/* ── AI Recommender ──────────────────────────────────── */}
        <FadeIn>
          <section className="mb-16" aria-labelledby="recommend-heading">
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
        </FadeIn>

        {/* ── Section divider ──────────────────────────────────── */}
        {reviews.length > 0 && <div className="section-divider mb-16" aria-hidden />}

        {/* ── Reviews ─────────────────────────────────────────── */}
        {reviews.length > 0 && (
          <section className="mb-16" aria-labelledby="reviews-heading">
            <FadeIn>
              <SectionHeading
                title="What diners are saying"
                description="Real reviews from real guests"
                action={
                  avgRating && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-foreground">{avgRating}</span>
                      <span className="text-muted-foreground">average</span>
                    </span>
                  )
                }
              />
            </FadeIn>
            <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {reviews.slice(0, 4).map((r, i) => (
                <motion.div key={i} variants={staggerChild}>
                  <PremiumCard className="p-5 sm:p-6">
                    <div className="mb-3 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-4 w-4 ${
                            idx < r.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/85 sm:text-base">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("en-KE", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </PremiumCard>
                </motion.div>
              ))}
            </StaggerContainer>
          </section>
        )}

        {/* ── Section divider ──────────────────────────────────── */}
        <div className="section-divider mb-16" aria-hidden />

        {/* ── Map ─────────────────────────────────────────────── */}
        <FadeIn>
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
        </FadeIn>
      </Container>
    </>
  );
}
