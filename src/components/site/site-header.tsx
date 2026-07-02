"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  Phone,
  MapPin,
  ShoppingCart,
  Calendar,
  UtensilsCrossed,
  Sparkles,
  Wand2,
  ChevronDown,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart/store";
import { Logo } from "@/components/premium/logo";

type SiteHeaderProps = {
  slug: string;
  restaurantName: string;
  logoUrl?: string | null;
  phone: string;
  address: string;
  hasEventSpace?: boolean;
  comboBuilderEnabled?: boolean;
};

/*
 * Navigation is split into two groups to avoid the "intern crowded navbar"
 * problem the brief calls out:
 *
 *   PRIMARY  — the 3-4 links a diner actually uses (Menu, Reserve, Order)
 *   MORE     — everything else, collapsed under a "More" dropdown so the
 *              bar stays calm even when events / catering / meal-builder
 *              are all enabled.
 *
 * Group membership is derived from the same flat NAV_LINKS list so there
 * is a single source of truth.
 */
type NavLink = {
  href: string;
  label: string;
  icon?: typeof Sparkles;
  group: "primary" | "more";
};

const NAV_LINKS: NavLink[] = [
  { href: "", label: "Home", group: "primary" },
  { href: "/menu", label: "Menu", group: "primary" },
  { href: "/recommend", label: "Recommend", icon: Sparkles, group: "primary" },
  { href: "/reservations", label: "Reserve", icon: Calendar, group: "primary" },
  { href: "/catering", label: "Catering", icon: UtensilsCrossed, group: "more" },
  { href: "/meal-builder", label: "Build a Combo", icon: Wand2, group: "more" },
  { href: "/events", label: "Events", icon: Calendar, group: "more" },
  { href: "/careers", label: "Careers", group: "more" },
  { href: "/gallery", label: "Gallery", group: "more" },
  { href: "/about", label: "About", group: "more" },
  { href: "/contact", label: "Contact", group: "more" },
];

export function SiteHeader({
  slug,
  restaurantName,
  logoUrl,
  phone,
  address,
  hasEventSpace,
  comboBuilderEnabled,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = `/${slug}`;
  const isActive = (href: string) =>
    href === ""
      ? pathname === base
      : pathname === `${base}${href}` || pathname.startsWith(`${base}${href}/`);

  // Filter nav by feature flags.
  const visibleLinks = NAV_LINKS.filter((link) => {
    if (link.href === "/events" && !hasEventSpace) return false;
    if (link.href === "/meal-builder" && !comboBuilderEnabled) return false;
    return true;
  });
  const primaryLinks = visibleLinks.filter((l) => l.group === "primary");
  const moreLinks = visibleLinks.filter((l) => l.group === "more");

  const cartCount = useCart((s) => s.count());
  const cartSlug = useCart((s) => s.restaurantSlug);
  const showCartBadge = cartSlug === slug && cartCount > 0;

  const CartBadge = () =>
    showCartBadge ? (
      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
        {cartCount}
      </span>
    ) : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-18 sm:px-6">
        {/* Brand */}
        <Logo
          restaurantName={restaurantName}
          logoUrl={logoUrl}
          size="md"
          href={base}
          tagline="Nakuru · Order online"
        />

        {/* Desktop nav — primary links + "More" dropdown */}
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {primaryLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href || "home"}
                href={`${base}${link.href}`}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-foreground/75 hover:bg-accent/8 hover:text-foreground",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {Icon && <Icon className="h-4 w-4" />}
                  {link.label}
                </span>
                {active && (
                  <span
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}

          {moreLinks.length > 0 && (
            <div
              className="relative"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  moreLinks.some((l) => isActive(l.href))
                    ? "text-primary"
                    : "text-foreground/75 hover:bg-accent/8 hover:text-foreground",
                )}
              >
                More
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    moreOpen && "rotate-180",
                  )}
                />
              </button>
              {moreOpen && (
                <div className="absolute left-0 top-full pt-2">
                  <div className="w-52 overflow-hidden rounded-xl border border-border bg-card p-1.5 elevation-3 animate-in-fade">
                    {moreLinks.map((link) => {
                      const active = isActive(link.href);
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={`${base}${link.href}`}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-accent/8 hover:text-foreground",
                          )}
                        >
                          {Icon ? (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                          )}
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Desktop CTAs — calm, ordered by intent */}
        <div className="hidden items-center gap-1.5 md:flex">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent/8 hover:text-foreground"
            aria-label={`Call ${phone}`}
          >
            <Phone className="h-4 w-4" />
            <span className="hidden xl:inline">Call</span>
          </a>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="relative h-9"
          >
            <Link href={`${base}/account`} aria-label="Your account">
              <User className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="relative h-9"
          >
            <Link href={`${base}/cart`} aria-label="Cart">
              <ShoppingCart className="h-4 w-4" />
              <CartBadge />
            </Link>
          </Button>
          <Button asChild size="sm" className="h-9">
            <Link href={`${base}/menu`}>Order Now</Link>
          </Button>
        </div>

        {/* Mobile CTAs — cart + menu trigger only */}
        <div className="flex items-center gap-1 md:hidden">
          <Button
            asChild
            size="icon"
            variant="outline"
            className="relative h-10 w-10"
          >
            <Link href={`${base}/cart`} aria-label="Cart">
              <ShoppingCart className="h-4 w-4" />
              <CartBadge />
            </Link>
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm p-0">
              <SheetHeader className="border-b border-border px-5 py-4 text-left">
                <SheetTitle asChild>
                  <div>
                    <Logo
                      restaurantName={restaurantName}
                      logoUrl={logoUrl}
                      size="sm"
                      tagline="Nakuru · Order online"
                    />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-col gap-0.5 overflow-y-auto px-3 py-4"
                aria-label="Mobile"
              >
                {visibleLinks.map((link) => {
                  const active = isActive(link.href);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href || "home"}
                      href={`${base}${link.href}`}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/85 hover:bg-accent/8",
                      )}
                    >
                      {Icon ? (
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      )}
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto space-y-2 border-t border-border px-5 py-4">
                <Button asChild className="w-full">
                  <Link href={`${base}/menu`} onClick={() => setMobileOpen(false)}>
                    <ShoppingCart className="h-4 w-4" />
                    Order Now
                  </Link>
                </Button>
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 px-1 py-1.5 text-sm font-medium text-foreground/80"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {phone}
                </a>
                <span className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  {address}
                </span>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
