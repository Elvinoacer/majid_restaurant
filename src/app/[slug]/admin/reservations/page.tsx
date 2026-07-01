import { AdminReservationsList } from "@/components/admin/admin-reservations-list";
import { listUpcomingReservations } from "@/lib/reservations/actions";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const reservations = await listUpcomingReservations();
  const serialized = reservations.map((r) => ({
    id: r.id,
    status: r.status,
    guestName: r.guestName,
    guestPhone: r.guestPhone,
    partySize: r.partySize,
    reservedFor: r.reservedFor.toISOString(),
    occasion: r.occasion,
    seatingPref: r.seatingPref,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));
  return <AdminReservationsList reservations={serialized} />;
}

export async function generateMetadata() {
  return { title: "Reservations" };
}
