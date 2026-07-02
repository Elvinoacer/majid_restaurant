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
  BarChart3,
  Menu as MenuIcon,
  Loader2,
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
import { staffLogoutAction } from "@/lib/auth/staff-actions";
import { useMemo, useState, useTransition } from "react";
import {
  getNavForRole,
  NAV_SECTION_LABELS,
  type NavItem,
  type NavSection,
} from "@/lib/auth/roles";
import type { StaffRole } from "@/generated/prisma/client";
import { Logo } from "@/components/premium/logo";

// Map icon string → component. Keeps `roles.ts` free of JSX imports.
const ICONS: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  UtensilsCrossed,
  Utensils,
  Star,
  Users,
  ChefHat,
  Gift,
  CalendarDays,
  Briefcase,
  QrCode,
  BarChart3,
};

function NavList({
  items,
  base,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  base: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = (href: string) =>
    href === ""
      ? pathname === base
      : pathname === `${base}${href}` || pathname.startsWith(`${base}${href}/`);

  // Group items by their declared section so the sidebar reads as a calm,
  // scannable hierarchy instead of a flat 13-item list.
  const grouped = useMemo(() => {
    const map = new Map<NavSection, NavItem[]>();
    for (const item of items) {
      const section = item.section ?? "operations";
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <nav className="flex flex-col gap-5" aria-label="Admin navigation">
      {grouped.map(([section, sectionItems]) => (
        <div key={section}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            {NAV_SECTION_LABELS[section]}
          </p>
          <div className="flex flex-col gap-0.5">
            {sectionItems.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href || "overview"}
                  href={`${base}${item.href}`}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/75 hover:bg-accent/8 hover:text-foreground",
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({
  staffName,
  staffRole,
  onLogout,
  pending,
  variant = "full",
}: {
  staffName: string;
  staffRole: StaffRole;
  onLogout: () => void;
  pending: boolean;
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        disabled={pending}
        className="gap-1.5 text-muted-foreground"
        aria-label="Sign out"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    );
  }

  const initials = staffName
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {staffName}
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {staffRole.replace("_", " ")}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        disabled={pending}
        className="mt-1 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        Sign out
      </Button>
    </div>
  );
}

export function AdminShell({
  slug,
  restaurantName,
  logoUrl,
  staffName,
  staffRole,
  children,
}: {
  slug: string;
  restaurantName: string;
  logoUrl?: string | null;
  staffName: string;
  staffRole: StaffRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const base = `/${slug}/admin`;

  // Single source of truth — derived from ROLE_NAV so nav and route guard
  // can never drift.
  const visibleNav = getNavForRole(staffRole);

  const handleLogout = () => {
    startTransition(async () => {
      await staffLogoutAction();
    });
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border bg-sidebar md:flex md:w-64 md:flex-col md:flex-shrink-0">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Logo
            restaurantName={restaurantName}
            logoUrl={logoUrl}
            size="sm"
            href={`/${slug}`}
            tagline="Admin"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 scroll-thin">
          <NavList items={visibleNav} base={base} pathname={pathname} />
        </div>
        <UserBlock
          staffName={staffName}
          staffRole={staffRole}
          onLogout={handleLogout}
          pending={pending}
        />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="min-w-0">
          <Logo
            restaurantName={restaurantName}
            logoUrl={logoUrl}
            size="sm"
            tagline={`${staffRole.replace("_", " ")} · Admin`}
          />
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/${slug}`}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="View public site"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Site</span>
          </Link>
          <UserBlock
            staffName={staffName}
            staffRole={staffRole}
            onLogout={handleLogout}
            pending={pending}
            variant="compact"
          />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Open navigation menu"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-5 py-5 text-left">
                <SheetTitle asChild>
                  <div>
                    <Logo
                      restaurantName={restaurantName}
                      logoUrl={logoUrl}
                      size="sm"
                      tagline="Admin dashboard"
                    />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <NavList
                  items={visibleNav}
                  base={base}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <UserBlock
                staffName={staffName}
                staffRole={staffRole}
                onLogout={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                pending={pending}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 bg-background">
        <div className="hidden items-center justify-between border-b border-border bg-card/40 px-6 py-2.5 md:flex">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View public site
          </Link>
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{staffName}</span>
          </p>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
