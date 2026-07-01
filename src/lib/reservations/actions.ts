/**
 * Reservation server actions (PRD §5.5 — Table Reservations).
 *
 * Phase 2 ships:
 *   - createReservation         — public guest flow with availability check
 *   - updateReservationStatus   — staff confirms/seats/completes/cancels
 *   - listReservationsForDay    — staff calendar view (day & week)
 *
 * Availability check (PRD §5.5): against table capacity config. Phase 2 uses
 * a simple capacity-based check: total reserved covers in a 2-hour window
 * must not exceed total restaurant capacity × 1.2 (overbook allowance for
 * short-turnover days). A future Phase 3 upgrade can assign specific tables
 * (`tableId`) once a table-management UI exists.
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getCustomerForCurrentTenant } from "@/auth";
import { requireStaff } from "@/lib/auth/staff";
import { broadcastReservationEvent } from "@/lib/realtime/emit";
import {
  notifyStaffNewReservation,
  notifyReservationConfirmed,
} from "@/lib/notifications/send";
import type { ReservationStatus } from "@/generated/prisma/client";

const CreateReservationSchema = z.object({
  guestName: z.string().min(1).max(120),
  guestPhone: z.string().min(5).max(40),
  partySize: z.number().int().min(1).max(50),
  reservedFor: z.string().min(1), // ISO datetime
  occasion: z.enum(["birthday", "anniversary", "business", "casual", "other"]).optional().nullable(),
  seatingPref: z.enum(["indoor", "outdoor", "no preference"]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export type ReservationResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Public action — any visitor can request a reservation. Multi-tenant safe
 * via getContextRestaurant(). If the visitor is logged in as a customer, the
 * reservation is attached to that customer's account.
 */
export async function createReservation(
  input: CreateReservationInput,
): Promise<ReservationResult<{ reservationId: string; status: ReservationStatus }>> {
  const parsed = CreateReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const { restaurant, db: tenant } = await getContextRestaurant();

  const reservedFor = new Date(data.reservedFor);
  if (Number.isNaN(reservedFor.getTime())) {
    return { ok: false, error: "Invalid reservation time" };
  }
  if (reservedFor.getTime() < Date.now() - 60_000) {
    return { ok: false, error: "Reservation time is in the past" };
  }

  // ── Availability check ─────────────────────────────────────
  // Window: same date ± 2 hours. Sum existing party sizes in that window,
  // compare against total restaurant capacity × 1.2 (overbook allowance).
  const windowStart = new Date(reservedFor.getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(reservedFor.getTime() + 2 * 60 * 60 * 1000);

  const tables = await tenant.restaurantTable.findMany({
    where: { location: data.seatingPref === "indoor" ? "indoor" : data.seatingPref === "outdoor" ? "outdoor" : undefined },
    select: { capacity: true },
  });
  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0);

  const overlapping = await tenant.reservation.findMany({
    where: {
      reservedFor: { gte: windowStart, lte: windowEnd },
      status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
    },
    select: { partySize: true },
  });
  const reservedCovers = overlapping.reduce((s, r) => s + r.partySize, 0);

  // 1.2x overbook allowance — restaurants commonly overbook ~15-20% on the
  // assumption that a fraction of parties no-show.
  const allowedCovers = Math.round(totalCapacity * 1.2);
  if (reservedCovers + data.partySize > allowedCovers) {
    return {
      ok: false,
      error: `We're fully booked around that time. Please try a different time or call ${restaurant.contactPhone}.`,
    };
  }

  const customer = await getCustomerForCurrentTenant();

  const reservation = await tenant.reservation.create({
    data: {
      restaurantId: restaurant.id,
      customerId: customer?.id ?? null,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      partySize: data.partySize,
      reservedFor,
      occasion: data.occasion ?? null,
      seatingPref: data.seatingPref ?? null,
      notes: data.notes ?? null,
      status: "PENDING",
    },
  });

  await Promise.allSettled([
    broadcastReservationEvent(restaurant.id, {
      type: "reservation:new",
      reservationId: reservation.id,
      restaurantId: restaurant.id,
      guestName: reservation.guestName,
      partySize: reservation.partySize,
      reservedFor: reservation.reservedFor.toISOString(),
    }),
    notifyStaffNewReservation(
      restaurant.id,
      reservation.id,
      reservation.guestName,
      reservation.partySize,
      reservation.reservedFor,
    ),
  ]);

  revalidatePath(`/${restaurant.slug}/admin/reservations`);
  return { ok: true, data: { reservationId: reservation.id, status: "PENDING" } };
}

const UpdateReservationSchema = z.object({
  reservationId: z.string().min(1),
  status: z.enum(["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

/**
 * Staff action: confirm / seat / complete / cancel / mark no-show.
 * Role-gated to OWNER / MANAGER / FRONT_OF_HOUSE.
 */
export async function updateReservationStatus(
  input: z.infer<typeof UpdateReservationSchema>,
): Promise<ReservationResult<{ status: ReservationStatus }>> {
  const parsed = UpdateReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const reservation = await tenant.reservation.findUnique({
    where: { id: parsed.data.reservationId },
  });
  if (!reservation) return { ok: false, error: "Reservation not found" };

  await tenant.reservation.update({
    where: { id: reservation.id },
    data: { status: parsed.data.status as ReservationStatus },
  });

  if (parsed.data.status === "CONFIRMED") {
    await Promise.allSettled([
      notifyReservationConfirmed(
        restaurant.id,
        reservation.customerId,
        reservation.guestName,
        reservation.reservedFor,
      ),
    ]);
  }

  revalidatePath(`/${restaurant.slug}/admin/reservations`);
  return { ok: true, data: { status: parsed.data.status as ReservationStatus } };
}

/**
 * Staff: list reservations for a specific day (for the calendar day view).
 */
export async function listReservationsForDay(dateIso: string) {
  await requireStaff();
  const { db: tenant } = await getContextRestaurant();
  const start = new Date(dateIso);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return tenant.reservation.findMany({
    where: { reservedFor: { gte: start, lt: end } },
    orderBy: { reservedFor: "asc" },
  });
}

/**
 * Staff: list upcoming reservations (next 7 days) — for the admin dashboard
 * "today" view.
 */
export async function listUpcomingReservations() {
  await requireStaff();
  const { db: tenant } = await getContextRestaurant();
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return tenant.reservation.findMany({
    where: { reservedFor: { gte: now, lte: weekEnd } },
    orderBy: { reservedFor: "asc" },
  });
}
