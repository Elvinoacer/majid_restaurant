import Link from "next/link";
import { ArrowRight, ShoppingBag, Calendar, UtensilsCrossed, Banknote, TrendingUp, ChefHat, Gift, Briefcase, QrCode } from "lucide-react";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { db } from "@/lib/db";
import { formatKsh } from "@/lib/whatsapp/order";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant, db: tenant } = await getContextRestaurant();

  // Daily sales summary (PRD §5.17).
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

  // Phase 3 KPIs
  const newEventBookings = restaurant.hasEventSpace
    ? await tenant.eventBooking.count({ where: { status: "NEW" } })
    : 0;
  const activeJobPostings = await tenant.jobPosting.count({ where: { isActive: true } });
  const newApplications = await db.jobApplication.count({
    where: { jobPosting: { restaurantId: restaurant.id }, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  // Active orders (kitchen queue snapshot)
  const activeOrders = await tenant.order.findMany({
    where: { status: { in: ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } },
    orderBy: { createdAt: "asc" },
    take: 5,
    include: { items: true },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {restaurant.name} · {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Today's revenue"
          value={`KSh ${formatKsh(todaysRevenue)}`}
          icon={<Banknote className="h-4 w-4" />}
          tone="green"
        />
        <KpiCard
          label="Orders today"
          value={String(todaysOrders.length)}
          icon={<ShoppingBag className="h-4 w-4" />}
          tone="blue"
        />
        <KpiCard
          label="Reservations today"
          value={String(upcomingReservations.length)}
          icon={<Calendar className="h-4 w-4" />}
          tone="purple"
        />
        <KpiCard
          label="New inquiries"
          value={String(newCateringInquiries + newEventBookings)}
          icon={<UtensilsCrossed className="h-4 w-4" />}
          tone="orange"
        />
      </div>

      {/* Phase 3 quick links */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink
          href={`/${slug}/admin/kitchen`}
          label="Kitchen"
          icon={<ChefHat className="h-4 w-4" />}
          tone="orange"
        />
        <QuickLink
          href={`/${slug}/admin/loyalty`}
          label="Loyalty"
          icon={<Gift className="h-4 w-4" />}
          tone="purple"
        />
        <QuickLink
          href={`/${slug}/admin/tables`}
          label="Tables & QR"
          icon={<QrCode className="h-4 w-4" />}
          tone="blue"
        />
        <QuickLink
          href={`/${slug}/admin/careers`}
          label={`Careers${newApplications > 0 ? ` (${newApplications} new)` : ""}`}
          icon={<Briefcase className="h-4 w-4" />}
          tone="green"
        />
      </div>

      {/* Active orders */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Active orders</h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/${slug}/admin/kitchen`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Kitchen dashboard <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href={`/${slug}/admin/orders`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              All orders <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        {activeOrders.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No active orders right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeOrders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <div>
                  <p className="font-medium">
                    #{o.id.slice(-6).toUpperCase()} · {o.guestName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
                    {o.fulfillmentType.toLowerCase().replace("_", " ")} ·{" "}
                    {new Date(o.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {o.status.toLowerCase().replace("_", " ")}
                  </span>
                  <p className="mt-1 text-sm font-semibold">KSh {formatKsh(o.total)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming reservations */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Upcoming reservations</h2>
          <Link
            href={`/${slug}/admin/reservations`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {upcomingReservations.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No upcoming reservations today.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcomingReservations.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <div>
                  <p className="font-medium">{r.guestName} · party of {r.partySize}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.reservedFor).toLocaleString()} · {r.guestPhone}
                  </p>
                </div>
                <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                  {r.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pendingReviews > 0 && (
          <Link
            href={`/${slug}/admin/reviews`}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-accent/5"
          >
            <div>
              <p className="font-medium">{pendingReviews} review{pendingReviews === 1 ? "" : "s"} awaiting moderation</p>
              <p className="text-xs text-muted-foreground">Tap to moderate</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </Link>
        )}
        {restaurant.hasEventSpace && newEventBookings > 0 && (
          <Link
            href={`/${slug}/admin/events`}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-accent/5"
          >
            <div>
              <p className="font-medium">{newEventBookings} new event booking{newEventBookings === 1 ? "" : "s"}</p>
              <p className="text-xs text-muted-foreground">Tap to triage</p>
            </div>
            <Calendar className="h-5 w-5 text-primary" />
          </Link>
        )}
        {activeJobPostings > 0 && (
          <Link
            href={`/${slug}/admin/careers`}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-accent/5"
          >
            <div>
              <p className="font-medium">{activeJobPostings} active job posting{activeJobPostings === 1 ? "" : "s"}</p>
              <p className="text-xs text-muted-foreground">Manage postings & applications</p>
            </div>
            <Briefcase className="h-5 w-5 text-primary" />
          </Link>
        )}
      </section>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon,
  tone,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  tone: "green" | "blue" | "purple" | "orange";
}) {
  const toneClasses = {
    green: "bg-green-500/10 text-green-700 hover:bg-green-500/20",
    blue: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20",
    purple: "bg-purple-500/10 text-purple-700 hover:bg-purple-500/20",
    orange: "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20",
  };
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-xl p-3 text-sm font-medium transition-colors ${toneClasses[tone]}`}
    >
      {icon}
      {label}
    </Link>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "green" | "blue" | "purple" | "orange";
}) {
  const toneClasses = {
    green: "bg-green-500/10 text-green-700",
    blue: "bg-blue-500/10 text-blue-700",
    purple: "bg-purple-500/10 text-purple-700",
    orange: "bg-orange-500/10 text-orange-700",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${toneClasses[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 font-display text-xl font-bold sm:text-2xl">{value}</p>
    </div>
  );
}

export async function generateMetadata() {
  return { title: "Overview" };
}
