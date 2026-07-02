import Link from "next/link";
import { ArrowRight, Package, Gift, UserRound, ShoppingBag, Star, Clock } from "lucide-react";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getCustomerForCurrentTenant } from "@/auth";
import { listMyOrders } from "@/lib/orders/actions";
import { getCustomerLoyaltySummary } from "@/lib/loyalty/actions";
import { formatKsh } from "@/lib/whatsapp/order";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/premium/container";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/card";
import { StatusPill, type StatusTone } from "@/components/premium/status-pill";
import { AccountContent } from "@/components/account/account-content";

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
      <Container size="narrow" className="py-16 sm:py-24">
        <EmptyState
          icon={<UserRound className="h-7 w-7" />}
          title="Sign in to view your account"
          description="Track orders, earn loyalty points, save your details, and leave reviews."
          action={
            <Button asChild size="lg">
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

  // Serialize dates for client component
  const serializedOrders = orders.map((order) => ({
    ...order,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
  }));

  return (
    <AccountContent
      slug={slug}
      customerName={customer.name ?? customer.email}
      restaurantName={restaurant.name}
      orders={serializedOrders}
      loyalty={loyalty}
      statusToneMap={STATUS_TONE}
    />
  );
}

export async function generateMetadata() {
  return { title: "Your account" };
}
