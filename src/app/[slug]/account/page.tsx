import Link from "next/link";
import { ArrowRight, Package, Gift, UserRound } from "lucide-react";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getCustomerForCurrentTenant } from "@/auth";
import { listMyOrders } from "@/lib/orders/actions";
import { getCustomerLoyaltySummary } from "@/lib/loyalty/actions";
import { formatKsh } from "@/lib/whatsapp/order";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { SectionHeading } from "@/components/premium/section-heading";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/card";
import { StatusPill, type StatusTone } from "@/components/premium/status-pill";

export const dynamic = "force-dynamic";

// Maps an order status to the semantic tone used by StatusPill. Token-driven,
// not hardcoded Tailwind colors — consistent across customer + admin views.
const STATUS_TONE: Record<string, StatusTone> = {
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

export default async function AccountPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant } = await getContextRestaurant();
  const customer = await getCustomerForCurrentTenant();

  if (!customer) {
    return (
      <Container size="narrow" className="py-12 sm:py-20">
        <EmptyState
          icon={<UserRound className="h-7 w-7" />}
          title="Sign in to view your account"
          description="Track orders, earn loyalty points, save your details, and leave reviews."
          action={
            <Button asChild>
              <Link href={`/${slug}/sign-in`}>Sign in</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  const [orders, loyalty] = await Promise.all([
    listMyOrders(),
    getCustomerLoyaltySummary(),
  ]);

  return (
    <Container size="narrow" className="py-6 sm:py-10">
      <PageHeader
        title="Your account"
        subtitle={`${customer.name ?? customer.email} · ${restaurant.name}`}
      />

      {/* Loyalty summary */}
      {loyalty && (
        <PremiumCard className="mb-6 border-2 border-primary/25 bg-primary/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground elevation-1">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Loyalty points
                </p>
                <p className="font-display text-3xl font-bold tabular-nums text-primary sm:text-4xl">
                  {loyalty.balance}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Earn 1 pt per KSh {formatKsh(loyalty.spendPerPoint)} spent</p>
              <p>on completed, paid orders</p>
            </div>
          </div>

          {loyalty.rules.length > 0 && (
            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Available rewards
              </p>
              <ul className="space-y-2 text-sm">
                {loyalty.rules.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <span className="font-medium text-foreground">{r.description}</span>
                    <span className="text-xs text-muted-foreground">
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

          {loyalty.recentEntries.length > 0 && (
            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Recent activity
              </p>
              <ul className="space-y-1.5 text-xs">
                {loyalty.recentEntries.slice(0, 5).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-baseline justify-between gap-2"
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
        </PremiumCard>
      )}

      <section>
        <SectionHeading title="Recent orders" />
        {orders.length === 0 ? (
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
        ) : (
          <ul className="space-y-2.5">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/${slug}/orders/${order.id}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 elevation-1 transition-all hover:elevation-2 hover:border-primary/20 sm:p-5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={STATUS_TONE[order.status] ?? "neutral"}>
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
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}

export async function generateMetadata() {
  return { title: "Your account" };
}
