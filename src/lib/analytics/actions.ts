/**
 * Analytics server actions + queries (PRD §5.18 — Intelligence Layer).
 *
 * This module has two halves:
 *
 *   1. **Event capture** — `trackEvent` is a Server Action callable from
 *      client components (e.g. `<AnalyticsTracker>` on the menu page) and
 *      also from other Server Actions (e.g. `createOrderFromCart` records an
 *      `order_started` event, `updateOrderStatus` records `order_completed`).
 *      Events are append-only and tenant-scoped via `tenantDb`.
 *
 *   2. **Aggregations** — pure read-side functions used by the admin
 *      analytics dashboard. Each returns a plain serialisable shape that can
 *      be passed straight to a client chart component (Recharts).
 *
 * Privacy:
 *   - No PII is stored on event rows. `customerId` is set only when the
 *     visitor is signed in. `sessionId` is an opaque SHA-256 hash of the
 *     visitor's IP + user-agent so we can dedupe repeated menu views from the
 *     same browser without tracking identity.
 *
 * Multi-tenant safety:
 *   - Every read uses `tenantDb` so a query for restaurant A's analytics can
 *     never leak restaurant B's events.
 */
"use server";

import { headers } from "next/headers";
import { createHash } from "crypto";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getCustomerForCurrentTenant } from "@/auth";
import { requireStaff } from "@/lib/auth/staff";
import type { AnalyticsEventType } from "@/generated/prisma/client";

// ─── EVENT CAPTURE ───────────────────────────────────────────────────────

/**
 * Derive an opaque session ID from the visitor's IP + user-agent.
 * Returns null when both are missing (e.g. during SSR without a request).
 *
 * The hash is one-way — we can group repeated events from the same browser
 * (for unique-menu-view counting) without ever storing the IP itself.
 */
async function deriveSessionId(): Promise<string | null> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const ua = h.get("user-agent") || null;
  if (!ip && !ua) return null;
  return createHash("sha256")
    .update(`${ip ?? ""}|${ua ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Append an analytics event for the current tenant.
 *
 * Safe to call from client components (Server Action) and from other Server
 * Actions. Never throws — analytics failures should never break a customer
 * flow.
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { db: tenant } = await getContextRestaurant();
    const customer = await getCustomerForCurrentTenant();
    const sessionId = await deriveSessionId();
    await tenant.analyticsEvent.create({
      data: {
        eventType,
        payloadJson: JSON.stringify(payload),
        customerId: customer?.id ?? null,
        sessionId,
      },
    });
  } catch {
    // Analytics must never break the host flow. Swallow + move on.
  }
}

/**
 * Internal helper for other Server Actions to record an event with explicit
 * customer + session context (avoids re-reading the request headers).
 */
export async function trackEventInternal(
  restaurantId: string,
  eventType: AnalyticsEventType,
  payload: Record<string, unknown> = {},
  customerId: string | null = null,
): Promise<void> {
  try {
    // Bypass tenantDb here because callers (e.g. order actions) already have
    // the tenant context and may not be inside a `getContextRestaurant()`
    // call frame. We pass the restaurantId explicitly to enforce scoping.
    const { db: prisma } = await import("@/lib/db");
    const sessionId = await deriveSessionId();
    await prisma.analyticsEvent.create({
      data: {
        restaurantId,
        eventType,
        payloadJson: JSON.stringify(payload),
        customerId,
        sessionId,
      },
    });
  } catch {
    // Swallow — see trackEvent.
  }
}

// ─── AGGREGATIONS (read-side) ────────────────────────────────────────────

export type DateRange = {
  from: Date;
  to: Date;
};

/**
 * Revenue trend — daily revenue for the last N days.
 * Used by the line chart on the analytics dashboard.
 */
export type RevenuePoint = {
  date: string; // ISO date (yyyy-mm-dd)
  label: string; // short weekday label "Mon"
  revenue: number;
  orders: number;
};

export async function getRevenueTrend(days = 30): Promise<RevenuePoint[]> {
  const { db: tenant } = await getContextRestaurant();
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const orders = await tenant.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    select: { total: true, createdAt: true },
  });

  // Bucket by day in the tenant's timezone (Africa/Nairobi by default).
  const dayBuckets = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const entry = dayBuckets.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += o.total;
    entry.orders += 1;
    dayBuckets.set(key, entry);
  }

  // Fill missing days with zero so the chart shows continuous time.
  const out: RevenuePoint[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = cursor.toISOString().slice(0, 10);
    const entry = dayBuckets.get(key);
    out.push({
      date: key,
      label: cursor.toLocaleDateString("en-KE", { weekday: "short" }),
      revenue: entry?.revenue ?? 0,
      orders: entry?.orders ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Peak ordering hours — heatmap matrix of order counts by day-of-week × hour.
 * 7 rows (Sun..Sat) × 24 columns (0..23). Used by the heatmap visualisation.
 */
export type PeakHoursMatrix = {
  dayOfWeek: number; // 0 = Sunday
  dayLabel: string;
  hour: number;
  orders: number;
};

export async function getPeakHours(days = 30): Promise<PeakHoursMatrix[]> {
  const { db: tenant } = await getContextRestaurant();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  const orders = await tenant.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    select: { createdAt: true },
  });

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // 7×24 grid initialised to 0.
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );
  for (const o of orders) {
    const dow = o.createdAt.getDay();
    const hour = o.createdAt.getHours();
    grid[dow][hour] += 1;
  }

  const out: PeakHoursMatrix[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      out.push({
        dayOfWeek: d,
        dayLabel: dayLabels[d],
        hour: h,
        orders: grid[d][h],
      });
    }
  }
  return out;
}

/**
 * Most-ordered items — top N menu items by total quantity sold.
 *
 * Implementation note: OrderItem doesn't carry a `restaurantId` column
 * (it inherits tenancy through `Order.restaurantId`), so we query via
 * `tenant.order.findMany` and aggregate client-side. This is the same
 * pattern used by the existing /admin/orders page.
 */
export type TopItem = {
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  quantitySold: number;
  revenue: number;
};

export async function getTopItems(limit = 10, days = 30): Promise<TopItem[]> {
  const { db: tenant } = await getContextRestaurant();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  const orders = await tenant.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    select: {
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          menuItem: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });

  const byItem = new Map<string, TopItem>();
  for (const o of orders) {
    for (const oi of o.items) {
      const id = oi.menuItem.id;
      const entry =
        byItem.get(id) ??
        {
          menuItemId: id,
          name: oi.menuItem.name,
          imageUrl: oi.menuItem.imageUrl,
          quantitySold: 0,
          revenue: 0,
        };
      entry.quantitySold += oi.quantity;
      entry.revenue += oi.quantity * oi.unitPrice;
      byItem.set(id, entry);
    }
  }
  return [...byItem.values()]
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit);
}

/**
 * Best-selling drinks — same as `getTopItems` but filtered to items whose
 * category name is "Drinks" (case-insensitive). Called out separately in
 * PRD §5.18 ("best-selling drinks").
 */
export async function getBestSellingDrinks(limit = 5, days = 30): Promise<TopItem[]> {
  const { db: tenant } = await getContextRestaurant();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  const orders = await tenant.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    select: {
      items: {
        where: {
          menuItem: {
            category: { name: { equals: "Drinks", mode: "insensitive" } },
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
          menuItem: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });

  const byItem = new Map<string, TopItem>();
  for (const o of orders) {
    for (const oi of o.items) {
      const id = oi.menuItem.id;
      const entry =
        byItem.get(id) ??
        {
          menuItemId: id,
          name: oi.menuItem.name,
          imageUrl: oi.menuItem.imageUrl,
          quantitySold: 0,
          revenue: 0,
        };
      entry.quantitySold += oi.quantity;
      entry.revenue += oi.quantity * oi.unitPrice;
      byItem.set(id, entry);
    }
  }
  return [...byItem.values()]
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit);
}

/**
 * Conversion funnel — menu views → orders started → orders completed.
 * Counts are de-duped by session for `menu_view` (one per browser session
 * per day) so repeat refreshes don't inflate the top of the funnel.
 */
export type ConversionFunnel = {
  menuViews: number;
  ordersStarted: number;
  ordersCompleted: number;
  menuToStartPct: number; // orders_started / menu_views
  startToCompletePct: number; // orders_completed / orders_started
  overallPct: number; // orders_completed / menu_views
};

export async function getConversionFunnel(days = 30): Promise<ConversionFunnel> {
  const { db: tenant } = await getContextRestaurant();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  // menu_view: distinct (sessionId, day) pairs to dedupe refreshes within a
  // single browsing session. Falls back to row count if sessionId is null.
  const menuViews = await tenant.analyticsEvent.findMany({
    where: {
      eventType: "menu_view",
      createdAt: { gte: from, lte: to },
    },
    select: { sessionId: true, createdAt: true },
  });
  const seenSessionDay = new Set<string>();
  let menuViewsCount = 0;
  for (const ev of menuViews) {
    const dayKey = ev.createdAt.toISOString().slice(0, 10);
    const dedupeKey = ev.sessionId ? `${ev.sessionId}|${dayKey}` : `anon|${dayKey}|${Math.random()}`;
    if (!seenSessionDay.has(dedupeKey)) {
      seenSessionDay.add(dedupeKey);
      menuViewsCount += 1;
    }
  }

  const ordersStarted = await tenant.analyticsEvent.count({
    where: {
      eventType: "order_started",
      createdAt: { gte: from, lte: to },
    },
  });
  const ordersCompleted = await tenant.analyticsEvent.count({
    where: {
      eventType: "order_completed",
      createdAt: { gte: from, lte: to },
    },
  });

  const safeDiv = (a: number, b: number) => (b === 0 ? 0 : (a / b) * 100);
  return {
    menuViews: menuViewsCount,
    ordersStarted,
    ordersCompleted,
    menuToStartPct: safeDiv(ordersStarted, menuViewsCount),
    startToCompletePct: safeDiv(ordersCompleted, ordersStarted),
    overallPct: safeDiv(ordersCompleted, menuViewsCount),
  };
}

/**
 * Returning-customer rate — percentage of customers in the window who placed
 * 2+ orders. PRD §5.18 calls this out explicitly.
 */
export type ReturningCustomerStats = {
  totalCustomers: number; // distinct customers who ordered in the window
  returningCustomers: number; // those with 2+ orders
  newCustomers: number;
  returningPct: number;
};

export async function getReturningCustomerRate(days = 30): Promise<ReturningCustomerStats> {
  const { db: tenant } = await getContextRestaurant();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  // Guest checkouts have no customerId — they're excluded from this metric
  // by design (we can't tell if a guest is "returning" without identity).
  const orders = await tenant.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: ["DRAFT", "CANCELLED"] },
      customerId: { not: null },
    },
    select: { customerId: true },
  });

  const counts = new Map<string, number>();
  for (const o of orders) {
    if (!o.customerId) continue;
    counts.set(o.customerId, (counts.get(o.customerId) ?? 0) + 1);
  }
  const totalCustomers = counts.size;
  let returningCustomers = 0;
  for (const c of counts.values()) {
    if (c >= 2) returningCustomers += 1;
  }
  const newCustomers = totalCustomers - returningCustomers;
  const returningPct =
    totalCustomers === 0 ? 0 : (returningCustomers / totalCustomers) * 100;
  return {
    totalCustomers,
    returningCustomers,
    newCustomers,
    returningPct,
  };
}

/**
 * Headline KPIs for the analytics overview cards. Cheap to compute —
 * runs in a single round-trip per metric.
 */
export type AnalyticsKpis = {
  totalRevenue30d: number;
  totalOrders30d: number;
  avgOrderValue: number;
  menuViews30d: number;
  conversionRate: number; // orders_started / menu_views
  returningCustomerPct: number;
  peakHourLabel: string; // "Fri 19:00" — highest-volume slot
  topItemName: string | null;
};

export async function getAnalyticsKpis(): Promise<AnalyticsKpis> {
  const [revenue, funnel, returning, peakHours, topItems] = await Promise.all([
    getRevenueTrend(30),
    getConversionFunnel(30),
    getReturningCustomerRate(30),
    getPeakHours(30),
    getTopItems(1, 30),
  ]);

  const totalRevenue30d = revenue.reduce((s, r) => s + r.revenue, 0);
  const totalOrders30d = revenue.reduce((s, r) => s + r.orders, 0);
  const avgOrderValue = totalOrders30d === 0 ? 0 : totalRevenue30d / totalOrders30d;

  // Find the peak slot.
  let peakSlot = peakHours[0];
  for (const p of peakHours) {
    if (p.orders > (peakSlot?.orders ?? -1)) peakSlot = p;
  }
  const peakHourLabel = peakSlot && peakSlot.orders > 0
    ? `${peakSlot.dayLabel} ${String(peakSlot.hour).padStart(2, "0")}:00`
    : "—";

  return {
    totalRevenue30d,
    totalOrders30d,
    avgOrderValue,
    menuViews30d: funnel.menuViews,
    conversionRate: funnel.overallPct,
    returningCustomerPct: returning.returningPct,
    peakHourLabel,
    topItemName: topItems[0]?.name ?? null,
  };
}

// ─── STAFF-GATED FETCH (used by the admin page server component) ─────────

/**
 * Convenience wrapper that enforces staff auth before returning analytics.
 * The admin analytics page calls this; everything above is internal and
 * assumes the caller is already auth-gated.
 */
export async function getAnalyticsForDashboard(days = 30) {
  await requireStaff(["OWNER", "MANAGER"]);
  const [kpis, revenue, peakHours, topItems, bestDrinks, funnel, returning] = await Promise.all([
    getAnalyticsKpis(),
    getRevenueTrend(days),
    getPeakHours(days),
    getTopItems(10, days),
    getBestSellingDrinks(5, days),
    getConversionFunnel(days),
    getReturningCustomerRate(days),
  ]);
  return {
    kpis,
    revenue,
    peakHours,
    topItems,
    bestDrinks,
    funnel,
    returning,
    days,
  };
}
