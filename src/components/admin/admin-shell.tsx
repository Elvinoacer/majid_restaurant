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
  X,
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
import { useState, useTransition } from "react";
import { getNavForRole, type NavItem } from "@/lib/auth/roles";
import type { StaffRole } from "@/generated/prisma/client";

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

  return (
    <nav className="flex flex-col gap-1" aria-label="Admin navigation">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href || "overview"}
            href={`${base}${item.href}`}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors md:py-2",
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground/80 hover:bg-accent/10 hover:text-accent",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
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
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    );
  }

  return (
    <div className="border-t border-border p-3">
      <div className="mb-2 px-2 text-xs text-muted-foreground">
        Signed in as
        <div className="font-medium text-foreground">{staffName}</div>
        <div className="text-[10px] uppercase tracking-wider">
          {staffRole.replace("_", " ")}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        disabled={pending}
        className="w-full justify-start gap-2 text-muted-foreground"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign out
      </Button>
    </div>
  );
}

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
      <aside className="hidden border-r border-border bg-card md:flex md:w-64 md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <p className="font-display text-sm font-bold">{restaurantName}</p>
          <p className="text-xs text-muted-foreground">Admin dashboard</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
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
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold">{restaurantName}</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {staffRole.replace("_", " ")} · Admin
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/${slug}`}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
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
                size="sm"
                className="h-9 w-9 p-0"
                aria-label="Open navigation menu"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-4 py-4 text-left">
                <SheetTitle className="font-display text-sm font-bold">
                  {restaurantName}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">Admin dashboard</p>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-2 py-3">
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
