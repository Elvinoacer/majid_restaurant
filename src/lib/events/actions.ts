/**
 * Event & meeting space booking server actions (PRD §5.9).
 *
 * Only relevant for tenants with `hasEventSpace = true` — the public page
 * is gated on this flag, so the actions are tenant-safe even though they
 * don't separately check the flag (the worst case is a tenant without event
 * space gets a submission, which the staff can simply DECLINE).
 *
 * Phase 3 ships:
 *   - createEventBooking        — public form submission
 *   - updateEventBookingStatus  — staff workflow (NEW → CONTACTED → QUOTED
 *                                  → CONFIRMED → COMPLETED / DECLINED)
 *
 * Reuses the InquiryStatus enum from the catering flow (same workflow).
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { requireStaff } from "@/lib/auth/staff";
import type { InquiryStatus } from "@/generated/prisma/client";

const CreateEventBookingSchema = z.object({
  contactName: z.string().min(1).max(120),
  contactPhone: z.string().min(5).max(40),
  eventDate: z.string().min(1), // ISO date
  durationHours: z.number().positive().max(24),
  guestCount: z.number().int().min(1).max(5000),
  setupNeeds: z.string().max(5000).optional().nullable(),
});

export type CreateEventBookingInput = z.infer<typeof CreateEventBookingSchema>;
export type EventBookingResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createEventBooking(
  input: CreateEventBookingInput,
): Promise<EventBookingResult<{ bookingId: string }>> {
  const parsed = CreateEventBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const { restaurant, db: tenant } = await getContextRestaurant();

  if (!restaurant.hasEventSpace) {
    return { ok: false, error: "This restaurant does not accept event bookings." };
  }

  const eventDate = new Date(data.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    return { ok: false, error: "Invalid event date" };
  }
  if (eventDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    return { ok: false, error: "Event date cannot be in the past" };
  }

  const booking = await tenant.eventBooking.create({
    data: {
      restaurantId: restaurant.id,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      eventDate,
      durationHours: data.durationHours,
      guestCount: data.guestCount,
      setupNeeds: data.setupNeeds ?? null,
      status: "NEW",
    },
  });

  revalidatePath(`/${restaurant.slug}/admin/events`);
  return { ok: true, data: { bookingId: booking.id } };
}

const UpdateEventBookingStatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(["NEW", "CONTACTED", "QUOTED", "CONFIRMED", "COMPLETED", "DECLINED"]),
});

export async function updateEventBookingStatus(
  input: z.infer<typeof UpdateEventBookingStatusSchema>,
): Promise<EventBookingResult<{ status: InquiryStatus }>> {
  const parsed = UpdateEventBookingStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const booking = await tenant.eventBooking.findUnique({
    where: { id: parsed.data.bookingId },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  await tenant.eventBooking.update({
    where: { id: booking.id },
    data: { status: parsed.data.status as InquiryStatus },
  });

  revalidatePath(`/${restaurant.slug}/admin/events`);
  return { ok: true, data: { status: parsed.data.status as InquiryStatus } };
}
