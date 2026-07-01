/**
 * Reviews server actions (PRD §5.10 — Customer Reviews).
 *
 * Anti-fake-review rule: a customer can only review an order they placed that
 * reached COMPLETED status. The Review row records the orderId for audit.
 *
 * Moderation: reviews default to `isPublished = false`. The owner moderates
 * via the admin dashboard before they appear publicly on the homepage / menu.
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getCustomerForCurrentTenant } from "@/auth";
import { requireStaff } from "@/lib/auth/staff";

const CreateReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
});

export type ReviewResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Create a review tied to a completed order. Multi-tenant safe — order must
 * belong to the current tenant AND to the logged-in customer (or, for guest
 * checkout, the review is associated only with the order via guestPhone match).
 *
 * Phase 2 requires customer login for review submission — this matches the
 * PRD note "tied to a completed order" because we need a stable customer
 * identity. Guest reviewers would be a Phase 3+ enhancement.
 */
export async function createReview(
  input: z.infer<typeof CreateReviewSchema>,
): Promise<ReviewResult<{ reviewId: string }>> {
  const parsed = CreateReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const { restaurant, db: tenant } = await getContextRestaurant();
  const customer = await getCustomerForCurrentTenant();
  if (!customer) {
    return { ok: false, error: "Please sign in to leave a review." };
  }

  const order = await tenant.order.findUnique({
    where: { id: data.orderId },
  });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.customerId !== customer.id) {
    return { ok: false, error: "You can only review your own orders." };
  }
  if (order.status !== "COMPLETED") {
    return { ok: false, error: "Only completed orders can be reviewed." };
  }

  // One review per order.
  const existing = await tenant.review.findFirst({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "You've already reviewed this order." };
  }

  const review = await tenant.review.create({
    data: {
      restaurantId: restaurant.id,
      customerId: customer.id,
      orderId: order.id,
      rating: data.rating,
      comment: data.comment ?? null,
      photoUrl: data.photoUrl ?? null,
      isPublished: false, // moderated
    },
  });

  revalidatePath(`/${restaurant.slug}/admin/reviews`);
  revalidatePath(`/${restaurant.slug}`);
  return { ok: true, data: { reviewId: review.id } };
}

const UpdateReviewSchema = z.object({
  reviewId: z.string().min(1),
  isPublished: z.boolean(),
});

/**
 * Staff: publish or unpublish a review. Role-gated to OWNER / MANAGER.
 */
export async function setReviewPublished(
  input: z.infer<typeof UpdateReviewSchema>,
): Promise<ReviewResult<{ isPublished: boolean }>> {
  const parsed = UpdateReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const review = await tenant.review.findUnique({ where: { id: parsed.data.reviewId } });
  if (!review) return { ok: false, error: "Review not found" };

  await tenant.review.update({
    where: { id: review.id },
    data: { isPublished: parsed.data.isPublished },
  });

  revalidatePath(`/${restaurant.slug}/admin/reviews`);
  revalidatePath(`/${restaurant.slug}`);
  return { ok: true, data: { isPublished: parsed.data.isPublished } };
}
