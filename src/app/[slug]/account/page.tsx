import Link from "next/link";
import { ArrowRight, Package, Gift } from "lucide-react";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getCustomerForCurrentTenant } from "@/auth";
import { listMyOrders } from "@/lib/orders/actions";
import { getCustomerLoyaltySummary } from "@/lib/loyalty/actions";
import { formatKsh } from "@/lib/whatsapp/order";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-foreground",
  PENDING_PAYMENT: "bg-yellow-500/15 text-yellow-700",
  CONFIRMED: "bg-blue-500/15 text-blue-700",
  PREPARING: "bg-orange-500/15 text-orange-700",
  READY: "bg-green-500/15 text-green-700",
  OUT_FOR_DELIVERY: "bg-purple-500/15 text-purple-700",
  DELIVERED: "bg-green-500/15 text-green-700",
  COMPLETED: "bg-muted text-foreground",
  CANCELLED: "bg-red-500/15 text-red-700",
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
      <div className="mx-auto max-w-md px-4 py-12 text-center sm:py-20">
        <h2 className="font-display text-xl font-semibold">Sign in to view your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track orders, earn loyalty points, save your details, and leave reviews.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/${slug}/sign-in`}>Sign in</Link>
        </Button>
      </div>
    );
  }

  const [orders, loyalty] = await Promise.all([
    listMyOrders(),
    getCustomerLoyaltySummary(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Your account</h1>
        <p className="text-sm text-muted-foreground">
          {customer.name ?? customer.email} · {restaurant.name}
        </p>
      </header>

      {/* Loyalty summary */}
      {loyalty && (
        <section className="mb-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Loyalty points
                </p>
                <p className="font-display text-3xl font-bold text-primary">
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
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Available rewards
              </p>
              <ul className="space-y-1.5 text-sm">
                {loyalty.rules.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{r.description}</span>
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
              <p className="mt-2 text-[11px] text-muted-foreground">
                Ask staff to redeem your points when you place your next order.
              </p>
            </div>
          )}

          {loyalty.recentEntries.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent activity
              </p>
              <ul className="space-y-1 text-xs">
                {loyalty.recentEntries.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-2">
                    <span className="text-foreground/90">{e.description}</span>
                    <span className={e.points >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
                      {e.points >= 0 ? "+" : ""}{e.points}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent orders
        </h2>
        {orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No orders yet. Your order history will appear here.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/${slug}/menu`}>Start an order</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/${slug}/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/5 sm:p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                        {order.status.toLowerCase().replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                      {order.items.reduce((s, it) => s + it.quantity, 0)} servings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">KSh {formatKsh(order.total)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export async function generateMetadata() {
  return { title: "Your account" };
}
