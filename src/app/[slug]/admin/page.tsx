import Link from "next/link";
import {
  ArrowRight,
  ShoppingBag,
  Calendar,
  UtensilsCrossed,
  Banknote,
  TrendingUp,
  ChefHat,
  Gift,
  Briefcase,
  QrCode,
  BarChart3,
} from "lucide-react";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { formatKsh } from "@/lib/whatsapp/order";
import { getRevenueTrend } from "@/lib/analytics/actions";
import { PageHeader } from "@/components/premium/page-header";
import { StatCard, type StatTone } from "@/components/premium/stat-card";
import { PremiumCard } from "@/components/premium/card";
import { StatusPill, type StatusTone } from "@/components/premium/status-pill";
import { SectionHeading } from "@/components/premium/section-heading";
import { EmptyState } from "@/components/premium/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant, db: tenant } = await getContextRestaurant();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todaysOrders = await tenant.order.findMany({
    where: {
      createdAt: { gte: todayStart, lt: todayEnd },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    select: { total: true, status: true, fulfillmentType: true },
  });
  const todaysRevenue = todaysOrders.reduce((s, o) => s + o.total, 0);

  const last7dRevenue = await getRevenueTrend(7);
  const last7dTotal = last7dRevenue.reduce((s, r) => s + r.revenue, 0);
  const last7dOrders = last7dRevenue.reduce((s, r) => s + r.orders, 0);

  const upcomingReservations = await tenant.reservation.findMany({
    where: {
      reservedFor: { gte: new Date(), lt: todayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    orderBy: { reservedFor: "asc" },
    take: 5,
  });

  const newCateringInquiries = await tenant.cateringInquiry.count({
    where: { status: "NEW" },
  });

  const pendingReviews = await tenant.review.count({
    where: { isPublished: false },
  });

  const newEventBookings = restaurant.hasEventSpace
    ? await tenant.eventBooking.count({ where: { status: "NEW" } })
    : 0;
  const activeJobPostings = await tenant.jobPosting.count({ where: { isActive: true } });

  const activeOrders = await tenant.order.findMany({
    where: { status: { in: ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } },
    orderBy: { createdAt: "asc" },
    take: 5,
    include: { items: true },
  });

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={`${restaurant.name} · ${new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}`}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Today's revenue"
          value={
            <>
              <span className="text-sm font-normal text-muted-foreground">KSh </span>
              {formatKsh(todaysRevenue)}
            </>
          }
          icon={<Banknote className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Orders today"
          value={String(todaysOrders.length)}
          icon={<ShoppingBag className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Reservations today"
          value={String(upcomingReservations.length)}
          icon={<Calendar className="h-4 w-4" />}
          tone="info"
        />
        <StatCard
          label="New inquiries"
          value={String(newCateringInquiries + newEventBookings)}
          icon={<UtensilsCrossed className="h-4 w-4" />}
          tone="warning"
        />
      </div>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <QuickLink href={`/${slug}/admin/kitchen`} label="Kitchen" icon={<ChefHat className="h-4 w-4" />} tone="warning" />
        <QuickLink href={`/${slug}/admin/loyalty`} label="Loyalty" icon={<Gift className="h-4 w-4" />} tone="info" />
        <QuickLink href={`/${slug}/admin/tables`} label="Tables & QR" icon={<QrCode className="h-4 w-4" />} tone="primary" />
        <QuickLink href={`/${slug}/admin/analytics`} label="Analytics" icon={<BarChart3 className="h-4 w-4" />} tone="success" />
      </div>

      {/* 7-day revenue sparkline */}
      <PremiumCard className="mt-4 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Last 7 days
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">
              <span className="text-sm font-normal text-muted-foreground">KSh </span>
              {formatKsh(last7dTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {last7dOrders} order{last7dOrders === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href={`/${slug}/admin/analytics`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            Full analytics <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Sparkline points={last7dRevenue.map((r) => r.revenue)} />
      </PremiumCard>

      {/* Active orders */}
      <section className="mt-6">
        <SectionHeading
          title="Active orders"
          actionHref={`/${slug}/admin/orders`}
          actionLabel="All orders"
        />
        {activeOrders.length === 0 ? (
          <EmptyState
            size="compact"
            icon={<ShoppingBag className="h-6 w-6" />}
            title="No active orders right now"
            description="Orders will appear here as they come in."
          />
        ) : (
          <ul className="space-y-2.5">
            {activeOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/${slug}/admin/orders`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 elevation-1 transition-all hover:elevation-2 hover:border-primary/20"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      <span className="font-display tabular-nums">#{o.id.slice(-6).toUpperCase()}</span>
                      <span className="text-muted-foreground"> · {o.guestName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
                      {o.fulfillmentType.toLowerCase().replace("_", " ")} ·{" "}
                      {new Date(o.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill tone={ORDER_STATUS_TONE[o.status] ?? "neutral"}>
                      {o.status.toLowerCase().replace("_", " ")}
                    </StatusPill>
                    <span className="font-display font-bold tabular-nums text-foreground">
                      <span className="text-xs font-normal text-muted-foreground">KSh </span>
                      {formatKsh(o.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming reservations */}
      <section className="mt-6">
        <SectionHeading
          title="Upcoming reservations"
          actionHref={`/${slug}/admin/reservations`}
          actionLabel="View all"
        />
        {upcomingReservations.length === 0 ? (
          <EmptyState
            size="compact"
            icon={<Calendar className="h-6 w-6" />}
            title="No upcoming reservations today"
            description="New reservations will show up here as they're requested."
          />
        ) : (
          <ul className="space-y-2.5">
            {upcomingReservations.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 elevation-1"
              >
                <div>
                  <p className="font-medium text-foreground">{r.guestName} · party of {r.partySize}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.reservedFor).toLocaleString()} · {r.guestPhone}
                  </p>
                </div>
                <StatusPill tone={r.status === "CONFIRMED" ? "success" : "warning"}>
                  {r.status.toLowerCase()}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Action items */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pendingReviews > 0 && (
          <Link
            href={`/${slug}/admin/reviews`}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 elevation-1 transition-all hover:elevation-2 hover:border-primary/20"
          >
            <div>
              <p className="font-medium text-foreground">
                {pendingReviews} review{pendingReviews === 1 ? "" : "s"} awaiting moderation
              </p>
              <p className="text-xs text-muted-foreground">Tap to moderate</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
        {restaurant.hasEventSpace && newEventBookings > 0 && (
          <Link
            href={`/${slug}/admin/events`}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 elevation-1 transition-all hover:elevation-2 hover:border-primary/20"
          >
            <div>
              <p className="font-medium text-foreground">
                {newEventBookings} new event booking{newEventBookings === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">Tap to triage</p>
            </div>
            <Calendar className="h-5 w-5 text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
        {activeJobPostings > 0 && (
          <Link
            href={`/${slug}/admin/careers`}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 elevation-1 transition-all hover:elevation-2 hover:border-primary/20"
          >
            <div>
              <p className="font-medium text-foreground">
                {activeJobPostings} active job posting{activeJobPostings === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">Manage postings & applications</p>
            </div>
            <Briefcase className="h-5 w-5 text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </section>
    </div>
  );
}

const ORDER_STATUS_TONE: Record<string, StatusTone> = {
  DRAFT: "neutral",
  PENDING_PAYMENT: "warning",
  CONFIRMED: "info",
  PREPARING: "warning",
  READY: "success",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

function QuickLink({
  href,
  label,
  icon,
  tone,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  tone: StatTone;
}) {
  const toneClasses: Record<StatTone, string> = {
    primary: "bg-primary/10 text-primary hover:bg-primary/15",
    success: "bg-success-muted text-success hover:bg-success-muted/70",
    warning: "bg-warning-muted text-warning-foreground hover:bg-warning-muted/70",
    info: "bg-info-muted text-info hover:bg-info-muted/70",
    neutral: "bg-muted text-muted-foreground hover:bg-muted/70",
  };
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-2xl p-4 text-sm font-medium transition-colors elevation-1 hover:elevation-2 ${toneClasses[tone]}`}
    >
      {icon}
      {label}
    </Link>
  );
}

/**
 * Inline SVG sparkline — tiny 7-point revenue trend on the admin overview.
 * Decorative; the full analytics page has the real charts.
 */
function Sparkline({ points }: { points: number[] }) {
  if (points.length === 0) {
    return <div className="mt-3 h-12 rounded-md bg-muted/50" />;
  }
  const w = 280;
  const h = 48;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const pathData = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const areaData = `${pathData} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 h-12 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.62 0.16 50)" stopOpacity={0.4} />
          <stop offset="100%" stopColor="oklch(0.62 0.16 50)" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <path d={areaData} fill="url(#spark-fill)" />
      <path d={pathData} fill="none" stroke="oklch(0.62 0.16 50)" strokeWidth={2} />
    </svg>
  );
}

export async function generateMetadata() {
  return { title: "Overview" };
}
