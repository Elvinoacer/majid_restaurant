/**
 * Catering inquiry server actions (PRD §5.8 — Catering Requests).
 *
 * Phase 2 ships:
 *   - createCateringInquiry  — public form submission
 *   - updateInquiryStatus    — staff moves inquiry through workflow
 *                              (NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED / DECLINED)
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { requireStaff } from "@/lib/auth/staff";
import { notifyStaffCateringInquiry } from "@/lib/notifications/send";
import type { InquiryStatus } from "@/generated/prisma/client";

const CreateInquirySchema = z.object({
  contactName: z.string().min(1).max(120),
  contactPhone: z.string().min(5).max(40),
  contactEmail: z.string().email().optional().or(z.literal("")),
  eventDate: z.string().min(1), // ISO date
  guestCount: z.number().int().min(1).max(10000),
  budgetRange: z.string().max(120).optional().nullable(),
  preferredCuisine: z.string().max(500).optional().nullable(),
  eventType: z
    .enum(["wedding", "corporate", "birthday", "school", "other"])
    .optional()
    .nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateInquiryInput = z.infer<typeof CreateInquirySchema>;
export type InquiryResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createCateringInquiry(
  input: CreateInquiryInput,
): Promise<InquiryResult<{ inquiryId: string }>> {
  const parsed = CreateInquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const { restaurant, db: tenant } = await getContextRestaurant();

  const eventDate = new Date(data.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    return { ok: false, error: "Invalid event date" };
  }

  const inquiry = await tenant.cateringInquiry.create({
    data: {
      restaurantId: restaurant.id,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail || null,
      eventDate,
      guestCount: data.guestCount,
      budgetRange: data.budgetRange ?? null,
      preferredCuisine: data.preferredCuisine ?? null,
      eventType: data.eventType ?? null,
      notes: data.notes ?? null,
      status: "NEW",
    },
  });

  await Promise.allSettled([
    notifyStaffCateringInquiry(
      restaurant.id,
      inquiry.id,
      inquiry.contactName,
      inquiry.eventDate,
    ),
  ]);

  revalidatePath(`/${restaurant.slug}/admin/catering`);
  return { ok: true, data: { inquiryId: inquiry.id } };
}

const UpdateInquirySchema = z.object({
  inquiryId: z.string().min(1),
  status: z.enum(["NEW", "CONTACTED", "QUOTED", "CONFIRMED", "COMPLETED", "DECLINED"]),
});

export async function updateInquiryStatus(
  input: z.infer<typeof UpdateInquirySchema>,
): Promise<InquiryResult<{ status: InquiryStatus }>> {
  const parsed = UpdateInquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const inquiry = await tenant.cateringInquiry.findUnique({
    where: { id: parsed.data.inquiryId },
  });
  if (!inquiry) return { ok: false, error: "Inquiry not found" };

  await tenant.cateringInquiry.update({
    where: { id: inquiry.id },
    data: { status: parsed.data.status as InquiryStatus },
  });

  revalidatePath(`/${restaurant.slug}/admin/catering`);
  return { ok: true, data: { status: parsed.data.status as InquiryStatus } };
}
