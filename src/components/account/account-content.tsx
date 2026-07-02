"use client";

import Link from "next/link";
import {
  ArrowRight,
  Package,
  Gift,
  Star,
  Clock,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { formatKsh } from "@/lib/whatsapp/order";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/premium/container";
import { SectionHeading } from "@/components/premium/section-heading";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/card";
import { StatusPill, type StatusTone } from "@/components/premium/status-pill";
import { FadeIn, StaggerContainer, staggerChild, motion } from "@/components/premium/motion";

type Order = {
  id: string;
  status: string;
  createdAt: string;
  total: number;
  items: Array<{ quantity: number }>;
};

type LoyaltyData = {
  balance: number;
  spendPerPoint: number;
  rules: Array<{
    id: string;
    description: string;
    pointsRequired: number | null;
    spendThreshold: number | null;
  }>;
  recentEntries: Array<{
    id: string;
    description: string;
    points: number;
  }>;
} | null;

export function AccountContent({
  slug,
  customerName,
  restaurantName,
  orders,
  loyalty,
  statusToneMap,
}: {
  slug: string;
  customerName: string;
  restaurantName: string;
  orders: Order[];
  loyalty: LoyaltyData;
  statusToneMap: Record<string, StatusTone>;
}) {
  const initials = customerName
    .split(/[\s@]+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Container size="narrow" className="py-8 sm:py-12">
      {/* ── Profile header ───────────────────────────────────── */}
      <FadeIn>
        <div className="mb-8 flex items-center gap-4 sm:gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-primary-foreground elevation-2 sm:h-20 sm:w-20 sm:text-2xl">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Welcome back
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {customerName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{restaurantName}</p>
          </div>
        </div>
      </FadeIn>

      {/* ── Loyalty card ─────────────────────────────────────── */}
      {loyalty && (
        <FadeIn delay={0.1}>
          <div className="relative mb-8 overflow-hidden rounded-2xl border-2 border-primary/25 p-[2px]">
            {/* Animated gradient border */}
            <div className="absolute inset-0 animate-gradient-border rounded-2xl bg-gradient-to-r from-primary/20 via-brand-saffron/30 to-primary/20" />
            <div className="relative rounded-[14px] bg-card p-5 sm:p-6">
              {/* Points header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground elevation-1">
                    <Gift className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Loyalty points
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-4xl font-bold tabular-nums text-primary sm:text-5xl">
                        {loyalty.balance}
                      </p>
                      <Sparkles className="h-4 w-4 text-primary/60" />
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Earn 1 pt per KSh {formatKsh(loyalty.spendPerPoint)} spent</p>
                  <p>on completed, paid orders</p>
                </div>
              </div>

              {/* Available rewards */}
              {loyalty.rules.length > 0 && (
                <div className="mt-5 border-t border-border/70 pt-4">
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Available rewards
                  </p>
                  <ul className="space-y-2 text-sm">
                    {loyalty.rules.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
                      >
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <Star className="h-3.5 w-3.5 text-primary/70" />
                          {r.description}
                        </span>
                        <span className="rounded-full bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary">
                          {r.pointsRequired
                            ? `${r.pointsRequired} pts`
                            : r.spendThreshold
                              ? `KSh ${formatKsh(r.spendThreshold)} spend`
                              : "Staff discretion"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Ask staff to redeem your points when you place your next order.
                  </p>
                </div>
              )}

              {/* Recent activity */}
              {loyalty.recentEntries.length > 0 && (
                <div className="mt-5 border-t border-border/70 pt-4">
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Recent activity
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    {loyalty.recentEntries.slice(0, 5).map((e) => (
                      <li
                        key={e.id}
                        className="flex items-baseline justify-between gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/50"
                      >
                        <span className="text-foreground/85">{e.description}</span>
                        <span
                          className={
                            e.points >= 0
                              ? "font-semibold text-success"
                              : "font-semibold text-danger"
                          }
                        >
                          {e.points >= 0 ? "+" : ""}
                          {e.points}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </FadeIn>
      )}

      {/* ── Quick actions ────────────────────────────────────── */}
      <FadeIn delay={0.15}>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link
            href={`/${slug}/menu`}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center elevation-1 transition-all duration-200 hover:elevation-2 hover:border-primary/25 hover:-translate-y-0.5"
          >
            <ShoppingBag className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <span className="text-sm font-medium">Order food</span>
          </Link>
          <Link
            href={`/${slug}/reservations`}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center elevation-1 transition-all duration-200 hover:elevation-2 hover:border-primary/25 hover:-translate-y-0.5"
          >
            <Clock className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <span className="text-sm font-medium">Reservations</span>
          </Link>
          <Link
            href={`/${slug}/catering`}
            className="group col-span-2 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center elevation-1 transition-all duration-200 hover:elevation-2 hover:border-primary/25 hover:-translate-y-0.5 sm:col-span-1"
          >
            <Gift className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <span className="text-sm font-medium">Catering</span>
          </Link>
        </div>
      </FadeIn>

      {/* ── Orders ───────────────────────────────────────────── */}
      <section>
        <FadeIn>
          <SectionHeading title="Recent orders" />
        </FadeIn>
        {orders.length === 0 ? (
          <FadeIn delay={0.1}>
            <EmptyState
              icon={<Package className="h-7 w-7" />}
              title="No orders yet"
              description="Your order history will appear here once you place your first order."
              action={
                <Button asChild>
                  <Link href={`/${slug}/menu`}>Start an order</Link>
                </Button>
              }
            />
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-2.5">
            {orders.map((order) => (
              <motion.div key={order.id} variants={staggerChild}>
                <Link
                  href={`/${slug}/orders/${order.id}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 elevation-1 transition-all duration-200 hover:elevation-2 hover:border-primary/20 hover:-translate-y-0.5 sm:p-5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={statusToneMap[order.status] ?? "neutral"}>
                        {order.status.toLowerCase().replace("_", " ")}
                      </StatusPill>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                      {order.items.reduce((s, it) => s + it.quantity, 0)} servings
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold tabular-nums text-foreground">
                      <span className="text-xs font-normal text-muted-foreground">KSh </span>
                      {formatKsh(order.total)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </StaggerContainer>
        )}
      </section>
    </Container>
  );
}
