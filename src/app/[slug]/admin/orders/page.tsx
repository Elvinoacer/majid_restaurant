import { AdminOrdersList } from "@/components/admin/admin-orders-list";
import { getContextRestaurant } from "@/lib/restaurant/context";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db: tenant } = await getContextRestaurant();

  const orders = await tenant.order.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: {
        include: { menuItem: { select: { name: true, imageUrl: true } } },
      },
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
    paidAt: o.paidAt?.toISOString() ?? null,
    items: o.items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      notes: it.notes,
      menuItem: { name: it.menuItem.name, imageUrl: it.menuItem.imageUrl },
    })),
  }));

  return <AdminOrdersList slug={slug} initialOrders={serialized} />;
}

export async function generateMetadata() {
  return { title: "Orders" };
}
