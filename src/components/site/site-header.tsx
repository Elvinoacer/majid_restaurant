"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Phone, MapPin, ShoppingCart, Calendar, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";

type SiteHeaderProps = {
  slug: string;
  restaurantName: string;
  logoUrl?: string | null;
  phone: string;
  address: string;
};

const NAV_LINKS = [
  { href: "", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/reservations", label: "Reserve", icon: Calendar },
  { href: "/catering", label: "Catering", icon: UtensilsCrossed },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({
  slug,
  restaurantName,
  logoUrl,
  phone,
  address,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const base = `/${slug}`;
  const isActive = (href: string) =>
    href === ""
      ? pathname === base
      : pathname === `${base}${href}` || pathname.startsWith(`${base}${href}/`);

  const cartCount = useCart((s) => s.count());
  const cartSlug = useCart((s) => s.restaurantSlug);
  const showCartBadge = cartSlug === slug && cartCount > 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link
          href={base}
          className="flex items-center gap-3"
          aria-label={`${restaurantName} home`}
        >
          {logoUrl ? (
             
            <img
              src={logoUrl}
              alt={`${restaurantName} logo`}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold">
              {restaurantName.charAt(0)}
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold text-foreground sm:text-lg">
              {restaurantName}
            </span>
            <span className="hidden text-[11px] uppercase tracking-wider text-muted-foreground sm:inline">
              Nakuru · Order online
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href || "home"}
              href={`${base}${link.href}`}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/80 hover:bg-accent/10 hover:text-accent",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-accent"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
          <Button asChild size="sm" variant="outline" className="relative">
            <Link href={`${base}/cart`}>
              <ShoppingCart className="h-4 w-4" />
              <span className="sr-only">Cart</span>
              {showCartBadge && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`${base}/menu`}>Order Now</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <Button asChild size="sm" variant="outline" className="relative">
            <Link href={`${base}/cart`}>
              <ShoppingCart className="h-4 w-4" />
              {showCartBadge && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent/10"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border/70 bg-background md:hidden">
          <nav
            className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3"
            aria-label="Mobile"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href || "home"}
                href={`${base}${link.href}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-accent/10",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground/80"
              >
                <Phone className="h-4 w-4" />
                {phone}
              </a>
              <span className="inline-flex items-start gap-2 px-3 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {address}
              </span>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
