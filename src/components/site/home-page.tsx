"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CalendarDays,
  ChefHat,
  Clock,
  Heart,
  ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  Star,
  Utensils,
  UtensilsCrossed,
  Wand2,
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
  /** Homepage story teaser — null when the tenant hasn't filled in About yet. */
  aboutContent: { story: string | null; mission: string | null } | null;
  /** A handful of gallery shots for the homepage teaser strip. */
  galleryPreview: Array<{ id: string; imageUrl: string; caption: string | null }>;
};

/**
 * Experience card — a clickable entry point to one of the public pages
 * (About / Gallery / Reservations / Catering / Events / Meal Builder /
 * Recommend / Careers / Contact).
 *
 * Feature-flagged entries (events, meal-builder) are conditionally included
 * by the caller so the grid never advertises a page that 404s.
 */
type ExperienceLink = {
  href: string;
  icon: typeof Heart;
  title: string;
  description: string;
  ariaLabel: string;
};

export function HomePage({
  restaurant,
  hoursToday,
  weeklyHours,
  promotions,
  reviews,
  popularItems,
  publicUrl,
  aboutContent,
  galleryPreview,
}: HomePageProps) {
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const whatsappUrl = `https://wa.me/${restaurant.whatsappPhone.replace(/[^\d]/g, "")}`;
  const base = `/${restaurant.slug}`;

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

  /**
   * Quick-nav chips shown directly under the hero address. Surfaces the
   * "non-ordering" public pages (about / gallery / reservations / contact)
   * so a curious visitor doesn't have to scan the menu bar to discover them.
   */
  const heroChips: Array<{ label: string; href: string }> = [
    { label: "About", href: `${base}/about` },
    { label: "Gallery", href: `${base}/gallery` },
    { label: "Reserve", href: `${base}/reservations` },
    { label: "Contact", href: `${base}/contact` },
  ];

  /**
   * Quick-features strip — informational tiles that double as deep-links
   * to the public page each tile describes. `tel:` links render as `<a>`
   * since Next.js `<Link>` is for internal routes only.
   */
  type QuickFeature = {
    icon: typeof ChefHat;
    label: string;
    sub: string;
    href: string;
    ariaLabel: string;
    external?: boolean;
  };
  const quickFeatures: QuickFeature[] = [
    {
      icon: ChefHat,
      label: "Fresh daily",
      sub: "Prepared to order",
      href: `${base}/about`,
      ariaLabel: `Read about ${restaurant.name}'s kitchen and sourcing story`,
    },
    {
      icon: Utensils,
      label: "Order online",
      sub: "Delivery across Nakuru CBD",
      href: `${base}/menu`,
      ariaLabel: "Browse the menu and order online",
    },
    {
      icon: Phone,
      label: "Call to order",
      sub: restaurant.contactPhone ?? "Available",
      href: `tel:${(restaurant.contactPhone ?? "").replace(/\s/g, "")}`,
      ariaLabel: "Call to place an order",
      external: true,
    },
    {
      icon: CalendarDays,
      label: "Events & catering",
      sub: "Weddings, corporate",
      href: restaurant.hasEventSpace ? `${base}/events` : `${base}/catering`,
      ariaLabel: "Explore events and catering options",
    },
  ];

  /**
   * The "More to Explore" grid — every public page surfaced as a premium
   * interactive card. Respects feature flags (events / meal-builder) so
   * we never link to a route that 404s.
   */
  const experiences: ExperienceLink[] = [
    {
      href: `${base}/about`,
      icon: Heart,
      title: "Our Story",
      description:
        "Meet the family behind the kitchen — our journey, our mission, and the sourcing standards behind every plate.",
      ariaLabel: `Read about ${restaurant.name}'s story`,
    },
    {
      href: `${base}/gallery`,
      icon: ImageIcon,
      title: "Gallery",
      description:
        "Step inside — a peek at our food, our dining room, and the people who make it all happen.",
      ariaLabel: "Browse the photo gallery",
    },
    {
      href: `${base}/reservations`,
      icon: Calendar,
      title: "Reserve a Table",
      description:
        "Book your spot for lunch, dinner, or that special occasion — confirmed in seconds.",
      ariaLabel: "Make a reservation",
    },
    {
      href: `${base}/catering`,
      icon: UtensilsCrossed,
      title: "Catering",
      description:
        "Bring our kitchen to your event — bulk trays, full-service staffing, custom menus.",
      ariaLabel: "Enquire about catering",
    },
    ...(restaurant.hasEventSpace
      ? [
          {
            href: `${base}/events`,
            icon: CalendarDays,
            title: "Events & Private Hire",
            description:
              "Host your celebration in our dedicated event space — birthdays, corporate, weddings.",
            ariaLabel: "Book the event space",
          },
        ]
      : []),
    ...(restaurant.comboBuilderEnabled
      ? [
          {
            href: `${base}/meal-builder`,
            icon: Wand2,
            title: "Build a Combo",
            description:
              "Mix and match your favourites to build the perfect plate, your way.",
            ariaLabel: "Build a custom combo",
          },
        ]
      : []),
    {
      href: `${base}/recommend`,
      icon: Sparkles,
      title: "AI Dish Finder",
      description:
        "Not sure what to order? Tell us your mood and we'll suggest the perfect dish.",
      ariaLabel: "Get a personalised dish recommendation",
    },
    {
      href: `${base}/careers`,
      icon: Briefcase,
      title: "Careers",
      description:
        "Join our team — we're always looking for passionate cooks, servers, and hosts.",
      ariaLabel: "View career opportunities",
    },
    {
      href: `${base}/contact`,
      icon: Mail,
      title: "Get in Touch",
      description:
        "Phone, WhatsApp, email, address, hours — every way to reach us, in one place.",
      ariaLabel: "Open the contact page",
    },
  ];

  /**
   * Trust-stats band shown right under the hero. Built only from real,
   * per-tenant data already on the page — no invented "X years in
   * business" style numbers, since this component is shared across every
   * MajidOS tenant and we can't assert facts we haven't been given.
   * Entries with a null value are dropped rather than shown as "—".
   */
  const trustStats: Array<{ icon: typeof Star; value: string; label: string }> = [
    avgRating && {
      icon: Star,
      value: `${avgRating}★`,
      label: `From ${reviews.length} guest review${reviews.length === 1 ? "" : "s"}`,
    },
    hoursToday.isOpenNow && {
      icon: Clock,
      value: "Open Now",
      label: hoursToday.label,
    },
    popularItems.length > 0 && {
      icon: Utensils,
      value: `${popularItems.length}+`,
      label: "Guest-favourite dishes",
    },
    galleryPreview.length > 0 && {
      icon: ImageIcon,
      value: `${galleryPreview.length}+`,
      label: "Photos of the kitchen & dining room",
    },
  ].filter(Boolean) as Array<{ icon: typeof Star; value: string; label: string }>;

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
                <Link href={`${base}/menu`}>
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

            {/* Quick-nav chips — surface non-ordering public pages
                right in the hero so visitors don't have to scan the
                menu bar to discover them. */}
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="mt-5 flex flex-wrap gap-2"
              aria-label="Quick links"
            >
              {heroChips.map((chip) => (
                <Link
                  key={chip.href}
                  href={chip.href}
                  className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm transition-colors duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  {chip.label}
                </Link>
              ))}
            </motion.nav>
          </div>

          {/* FCM opt-in */}
          <div className="absolute right-4 top-4 hidden sm:block">
            <FcmOptIn restaurantSlug={restaurant.slug} />
          </div>
        </Container>

        {/* Trust-stats bar — floats across the hero/content seam so it
            reads as one deliberate moment rather than a bolted-on strip.
            Every number here comes from real per-tenant data fetched
            above (ratings, hours, popular items, gallery count). */}
        {trustStats.length > 0 && (
          <div className="relative hidden sm:block">
            <Container>
              {/* Tailwind needs literal class names to generate CSS for —
                  a template-string class like `grid-cols-${n}` would be
                  invisible to the JIT scanner and silently produce no
                  column rule, so we map to a fixed literal per count. */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.85, ease: [0.22, 0.61, 0.36, 1] }}
                className={`relative -mb-10 grid divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card/90 elevation-2 backdrop-blur-md ${
                  {
                    1: "grid-cols-1",
                    2: "grid-cols-2",
                    3: "grid-cols-3",
                  }[trustStats.length] ?? "grid-cols-2 sm:grid-cols-4"
                }`}
              >
                {trustStats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-1 px-4 py-5 text-center sm:py-6"
                    >
                      <Icon className="h-4 w-4 text-primary" aria-hidden />
                      <p className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
                        {stat.value}
                      </p>
                      <p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">
                        {stat.label}
                      </p>
                    </div>
                  );
                })}
              </motion.div>
            </Container>
          </div>
        )}
      </section>

      {/* Spacer that only exists to absorb the trust-stats bar's negative
          margin above, so it doesn't overlap the Quick Features Strip. */}
      {trustStats.length > 0 && <div className="hidden h-10 sm:block" aria-hidden />}

      {/* ── Quick Features Strip (clickable) ─────────────────────── */}
      <FadeIn>
        <div className="border-b border-border bg-card/60 backdrop-blur-sm">
          <Container>
            <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
              {quickFeatures.map((f, i) => {
                const Icon = f.icon;
                const inner = (
                  <>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{f.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{f.sub}</p>
                    </div>
                  </>
                );
                const className =
                  "group flex items-center gap-3 px-4 py-4 transition-colors duration-200 hover:bg-accent/5 sm:px-5 sm:py-5";
                return f.external ? (
                  <a
                    key={i}
                    href={f.href}
                    aria-label={f.ariaLabel}
                    className={className}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link
                    key={i}
                    href={f.href}
                    aria-label={f.ariaLabel}
                    className={className}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </Container>
        </div>
      </FadeIn>

      <Container className="py-12 sm:py-16">
        {/* ── Promotions ──────────────────────────────────────────── */}
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

        {/* ── Popular items ───────────────────────────────────────── */}
        {popularItems.length > 0 && (
          <section className="mb-16">
            <FadeIn>
              <SectionHeading
                title="Popular Today"
                description="What other diners are loving right now"
                actionHref={`${base}/menu`}
                actionLabel="See full menu"
              />
            </FadeIn>
            <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {popularItems.slice(0, 4).map((item) => (
                <motion.div key={item.id} variants={staggerChild}>
                  <Link
                    href={`${base}/menu`}
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

        {/* ── Section divider ─────────────────────────────────────── */}
        <div className="section-divider mb-16" aria-hidden />

        {/* ── More to Explore ─────────────────────────────────────── */}
        {/* The marquee new section — every public page surfaced as a
            premium interactive card. Single source of truth for
            "what else can I do on this site?" without making the visitor
            scan the menu bar. */}
        <section className="mb-16" aria-labelledby="explore-heading">
          <FadeIn>
            <SectionHeading
              title={
                <span className="inline-flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                  More to Explore
                </span>
              }
              description="Everything we offer — one tap away."
              id="explore-heading"
            />
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {experiences.map((exp) => {
              const Icon = exp.icon;
              return (
                <motion.div key={exp.href} variants={staggerChild}>
                  <Link
                    href={exp.href}
                    aria-label={exp.ariaLabel}
                    className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 elevation-1 transition-all duration-300 hover:elevation-2 hover:-translate-y-1 hover:border-primary/30 sm:p-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary transition-colors duration-300 group-hover:from-primary/20 group-hover:to-accent/15">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight
                        className="h-4 w-4 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </div>
                    <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                      {exp.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {exp.description}
                    </p>
                    <span
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden
                    >
                      Explore
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </StaggerContainer>
        </section>

        {/* ── Section divider ─────────────────────────────────────── */}
        {(aboutContent?.story || galleryPreview.length > 0) && (
          <div className="section-divider mb-16" aria-hidden />
        )}

        {/* ── Our Story ────────────────────────────────────────────── */}
        {/* Pulls the real AboutContent row into a homepage teaser so the
            story doesn't only live on /about. Gracefully narrows: story +
            photos → both columns; only one of the two → single column. */}
        {(aboutContent?.story || galleryPreview.length > 0) && (
          <section className="mb-16" aria-labelledby="story-heading">
            <div
              className={`grid grid-cols-1 items-center gap-8 lg:gap-12 ${
                aboutContent?.story && galleryPreview.length > 0
                  ? "lg:grid-cols-2"
                  : ""
              }`}
            >
              {aboutContent?.story && (
                <FadeIn dir="right">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Our story
                  </p>
                  <h2
                    id="story-heading"
                    className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl"
                  >
                    Meet the family behind the kitchen
                  </h2>
                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-foreground/80 sm:text-base">
                    {aboutContent.story}
                  </p>
                  {aboutContent.mission && (
                    <div className="mt-6 flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
                      <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
                      <p className="text-sm italic leading-relaxed text-foreground/80">
                        {aboutContent.mission}
                      </p>
                    </div>
                  )}
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button asChild variant="outline" className="gap-2">
                      <Link href={`${base}/about`}>
                        <Heart className="h-4 w-4" />
                        Read our full story
                      </Link>
                    </Button>
                    {galleryPreview.length > 0 && (
                      <Button asChild variant="ghost" className="gap-2">
                        <Link href={`${base}/gallery`}>
                          <ImageIcon className="h-4 w-4" />
                          View gallery
                        </Link>
                      </Button>
                    )}
                  </div>
                </FadeIn>
              )}

              {galleryPreview.length > 0 && (
                <FadeIn dir="left" delay={aboutContent?.story ? 0.15 : 0}>
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {galleryPreview.slice(0, 6).map((img, i) => (
                      <Link
                        key={img.id}
                        href={`${base}/gallery`}
                        aria-label={`Open gallery — ${img.caption ?? "photo"}`}
                        className={`group relative overflow-hidden rounded-xl bg-muted ${
                          // First tile spans 2x2 for visual rhythm, matching
                          // the masonry treatment on the full gallery page.
                          i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.imageUrl}
                          alt={img.caption ?? "Restaurant photo"}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </FadeIn>
              )}
            </div>
          </section>
        )}

        {/* ── Section divider ─────────────────────────────────────── */}
        <div className="section-divider mb-16" aria-hidden />

        {/* ── AI Recommender ──────────────────────────────────────── */}
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
              actionHref={`${base}/recommend`}
              actionLabel="Full experience"
            />
            <AiRecommender
              restaurantName={restaurant.name}
              whatsappPhone={restaurant.whatsappPhone}
              variant="compact"
            />
          </section>
        </FadeIn>

        {/* ── Section divider ─────────────────────────────────────── */}
        {reviews.length > 0 && <div className="section-divider mb-16" aria-hidden />}

        {/* ── Reviews ─────────────────────────────────────────────── */}
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

        {/* ── Section divider ─────────────────────────────────────── */}
        <div className="section-divider mb-16" aria-hidden />

        {/* ── Plan Your Visit CTA ─────────────────────────────────── */}
        {/* Final conversion band before the map — pulls the three
            highest-intent actions (reserve, order, contact) into one
            visually distinct surface so the visitor doesn't have to
            scroll back to the top to act. */}
        <FadeIn>
          <section className="mb-16" aria-labelledby="visit-heading">
            <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 elevation-1 sm:p-10">
              {/* Decorative warm glow */}
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.74 0.16 75 / 0.45), transparent 70%)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full opacity-25"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.55 0.13 38 / 0.4), transparent 70%)",
                }}
                aria-hidden
              />
              <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Plan your visit
                  </p>
                  <h2
                    id="visit-heading"
                    className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl"
                  >
                    Come hungry. Leave happy.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/75 sm:text-base">
                    Reserve a table for tonight, order ahead for pickup, or
                    reach out with any question — whatever you need, our team
                    is ready.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-foreground/75">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">
                      {hoursToday.label}
                    </span>
                    <span className="text-muted-foreground" aria-hidden>
                      ·
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        hoursToday.isOpenNow ? "text-success" : "text-danger"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          hoursToday.isOpenNow
                            ? "bg-success animate-pulse-soft"
                            : "bg-danger"
                        }`}
                      />
                      {hoursToday.isOpenNow ? "Open now" : "Closed"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap lg:flex-col lg:items-stretch">
                  <Button asChild size="lg" className="gap-2">
                    <Link href={`${base}/reservations`}>
                      <Calendar className="h-4 w-4" />
                      Reserve a Table
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary" className="gap-2">
                    <Link href={`${base}/menu`}>
                      <Utensils className="h-4 w-4" />
                      Order Online
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="gap-2">
                    <Link href={`${base}/contact`}>
                      <Mail className="h-4 w-4" />
                      Contact Us
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── Section divider ─────────────────────────────────────── */}
        <div className="section-divider mb-16" aria-hidden />

        {/* ── Map ─────────────────────────────────────────────────── */}
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
