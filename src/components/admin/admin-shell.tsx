"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  UtensilsCrossed,
  Utensils,
  Star,
  Users,
  LogOut,
  ExternalLink,
  ChefHat,
  Gift,
  CalendarDays,
  Briefcase,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { staffLogoutAction } from "@/lib/auth/staff-actions";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { StaffRole } from "@/generated/prisma/client";

const NAV: Array<{ href: string; label: string; icon: typeof LayoutDashboard; roles?: StaffRole[] }> = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/reservations", label: "Reservations", icon: Calendar },
  { href: "/catering", label: "Catering", icon: UtensilsCrossed },
  { href: "/events", label: "Events", icon: CalendarDays, roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"] },
  { href: "/menu", label: "Menu", icon: Utensils, roles: ["OWNER", "MANAGER"] },
  { href: "/tables", label: "Tables & QR", icon: QrCode },
  { href: "/loyalty", label: "Loyalty", icon: Gift, roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"] },
  { href: "/reviews", label: "Reviews", icon: Star, roles: ["OWNER", "MANAGER"] },
  { href: "/careers", label: "Careers", icon: Briefcase, roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"] },
  { href: "/staff", label: "Staff", icon: Users, roles: ["OWNER"] },
];

export function AdminShell({
  slug,
  restaurantName,
  staffName,
  staffRole,
  children,
}: {
  slug: string;
  restaurantName: string;
  staffName: string;
  staffRole: StaffRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const base = `/${slug}/admin`;

  // Filter nav by role if `roles` is set on the item.
  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(staffRole));

  const isActive = (href: string) =>
    href === ""
      ? pathname === base
      : pathname === `${base}${href}` || pathname.startsWith(`${base}${href}/`);

  const handleLogout = () => {
    startTransition(async () => {
      await staffLogoutAction();
    });
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="border-b border-border bg-card md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <div>
            <p className="font-display text-sm font-bold">{restaurantName}</p>
            <p className="text-xs text-muted-foreground">Admin dashboard</p>
          </div>
        </div>
        <nav className="flex flex-row overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-0">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href || "overview"}
                href={`${base}${item.href}`}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:w-full",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-accent/10 hover:text-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-border p-3 md:block">
          <div className="mb-2 px-2 text-xs text-muted-foreground">
            Signed in as
            <div className="font-medium text-foreground">{staffName}</div>
            <div className="text-[10px] uppercase tracking-wider">{staffRole.replace("_", " ")}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={pending}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-background">
        <div className="border-b border-border bg-card/50 px-4 py-3 md:hidden">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            View site
          </Link>
        </div>
        <div className="hidden border-b border-border bg-card/50 px-6 py-3 md:block">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            View public site
          </Link>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
