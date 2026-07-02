import { getContextRestaurant } from "@/lib/restaurant/context";
import { getStaffSession } from "@/lib/auth/staff";
import { AdminKitchenDashboard } from "@/components/admin/admin-kitchen-dashboard";

export const dynamic = "force-dynamic";

/**
 * Kitchen dashboard (PRD §5.16).
 *
 * Tablet-optimized real-time order queue. Three columns: Preparing / Ready /
 * Delivered. Large-touch-target status buttons — designed for a tablet mounted
 * in a kitchen, not a mouse-and-keyboard user.
 *
 * Auth: any staff role can view, but only KITCHEN / MANAGER / OWNER can
 * advance order status (enforced in the client via the staffRole prop and
 * server-side via requireStaff in updateOrderStatus).
 *
 * Real-time: subscribes to the Socket.IO `restaurant:<id>` room and
 * re-fetches the order list on every `order:new` / `order:status_changed`
 * event. Falls back to 15-second polling if Socket.IO is not configured.
 */
export default async function KitchenDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant, db: tenant } = await getContextRestaurant();
  const session = await getStaffSession();

  // Active queue: orders the kitchen actually needs to act on.
  // PREPARING = currently being cooked; READY = waiting for pickup/delivery;
  // DELIVERED = recently served (kept for 4 hours so the kitchen can see
  // what just left the pass without scrolling the full admin list).
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  const orders = await tenant.order.findMany({
    where: {
      status: { in: ["PREPARING", "READY", "DELIVERED"] },
      // Only show orders from the last 4 hours — older ones are stale.
      createdAt: { gte: fourHoursAgo },
    },
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        include: { menuItem: { select: { name: true } } },
      },
      table: { select: { label: true } },
    },
  });

  const serialized = orders.map((o) => ({
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
  }));

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

  return (
    <AdminKitchenDashboard
      slug={slug}
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      staffRole={session?.role ?? "KITCHEN"}
      initialOrders={serialized}
      socketUrl={socketUrl}
    />
  );
}

export async function generateMetadata() {
  return { title: "Kitchen" };
}
