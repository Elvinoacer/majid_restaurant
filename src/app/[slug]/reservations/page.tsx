import { ReservationForm } from "@/components/reservations/reservation-form";

export const dynamic = "force-dynamic";

export default async function ReservationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ReservationForm slug={slug} />;
}

export async function generateMetadata() {
  return { title: "Reserve a table" };
}
