import { getContextRestaurant } from "@/lib/restaurant/context";
import { AdminEventBookings } from "@/components/admin/admin-event-bookings";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant, db: tenant } = await getContextRestaurant();

  const bookings = await tenant.eventBooking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = bookings.map((b) => ({
    id: b.id,
    contactName: b.contactName,
    contactPhone: b.contactPhone,
    eventDate: b.eventDate.toISOString(),
    durationHours: b.durationHours,
    guestCount: b.guestCount,
    setupNeeds: b.setupNeeds,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <AdminEventBookings
      slug={slug}
      restaurantName={restaurant.name}
      hasEventSpace={restaurant.hasEventSpace}
      initialBookings={serialized}
    />
  );
}

export async function generateMetadata() {
  return { title: "Event bookings" };
}
