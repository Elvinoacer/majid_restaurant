import { NextRequest, NextResponse } from "next/server";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getOrderForCustomer } from "@/lib/orders/actions";

/**
 * Lightweight GET endpoint the customer-facing order status page polls while
 * waiting for an M-Pesa callback or a kitchen status update.
 *
 * Returns the order with the same shape the client component expects —
 * serializable (no Date objects, only ISO strings).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  try {
    await getContextRestaurant(); // tenant guard
  } catch {
    return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  }

  const order = await getOrderForCustomer(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
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
    },
  });
}
