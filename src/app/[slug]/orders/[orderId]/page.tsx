import { OrderStatusView } from "@/components/checkout/order-status-view";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getOrderForCustomer } from "@/lib/orders/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug } = await params;
  const { orderId } = await params;

  // Verify tenant match (getOrderForCustomer is tenant-scoped).
  await getContextRestaurant();
  const order = await getOrderForCustomer(orderId);
  if (!order) notFound();

  // Strip non-serializable fields and pass to client component.
  const initial = {
    id: order.id,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    total: order.total,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    deliveryAddress: order.deliveryAddress,
    specialInstructions: order.specialInstructions,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    items: order.items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      notes: it.notes,
      menuItem: {
        name: it.menuItem.name,
        imageUrl: it.menuItem.imageUrl,
      },
    })),
  };

  return <OrderStatusView slug={slug} orderId={orderId} initialOrder={initial} />;
}

export async function generateMetadata() {
  return { title: "Order status" };
}
