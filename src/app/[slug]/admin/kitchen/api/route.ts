import { NextResponse } from "next/server";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getStaffSession } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

/**
 * Lightweight polling endpoint for the kitchen dashboard.
 *
 * Returns only the orders the kitchen needs to see (PREPARING / READY /
 * DELIVERED within the last 4 hours) — the admin orders list endpoint is
 * heavier and includes DRAFT/PENDING_PAYMENT/etc which the kitchen doesn't
 * care about.
 *
 * Auth: any staff role for this tenant can read.
 */
export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { db: tenant } = await getContextRestaurant();

  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const orders = await tenant.order.findMany({
    where: {
      status: { in: ["PREPARING", "READY", "DELIVERED"] },
      createdAt: { gte: fourHoursAgo },
    },
    orderBy: { createdAt: "asc" },
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      table: { select: { label: true } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      fulfillmentType: o.fulfillmentType,
      total: o.total,
      guestName: o.guestName,
      guestPhone: o.guestPhone,
      deliveryAddress: o.deliveryAddress,
      specialInstructions: o.specialInstructions,
      createdAt: o.createdAt.toISOString(),
      scheduledFor: o.scheduledFor?.toISOString() ?? null,
      tableLabel: o.table?.label ?? null,
      items: o.items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        notes: it.notes,
        name: it.menuItem.name,
      })),
    })),
  });
}
