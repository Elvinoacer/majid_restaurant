import { notFound } from "next/navigation";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { EventBookingForm } from "@/components/events/event-booking-form";

export const dynamic = "force-dynamic";

/**
 * Public event space booking page (PRD §5.9).
 *
 * Gated on `restaurant.hasEventSpace` — if the tenant doesn't have bookable
 * event space, we 404 instead of showing a form they can't usefully submit.
 * This matches the PRD requirement: "only relevant if the restaurant has
 * bookable space beyond standard tables — gated behind a `hasEventSpace`
 * flag on `Restaurant` so it doesn't clutter the UI for tenants without this."
 */
export default async function EventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant } = await getContextRestaurant();

  if (!restaurant.hasEventSpace) {
    notFound();
  }

  return (
    <EventBookingForm slug={slug} restaurantName={restaurant.name} />
  );
}

export async function generateMetadata() {
  return { title: "Event space" };
}
