/**
 * Server-side helper to read the current tenant slug from request headers
 * (set by `src/middleware.ts`) and fetch the matching `Restaurant` row.
 *
 * Use inside Server Components and Server Actions:
 *   const { restaurant, db } = await getContextRestaurant();
 *
 * Throws if the slug is missing or no Restaurant matches — the calling route's
 * `error.tsx` boundary will render a friendly 404-style page in that case.
 */
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { tenantDb, type TenantDb } from "@/lib/db/tenant-scope";
import { DEFAULT_TENANT_SLUG } from "@/proxy";

export type RestaurantContext = {
  restaurant: NonNullable<Awaited<ReturnType<typeof db.restaurant.findUnique>>>;
  db: TenantDb;
  slug: string;
};

export async function getContextRestaurant(): Promise<RestaurantContext> {
  const h = await headers();
  let slug = h.get("x-restaurant-slug");

  // Fallback for direct hits during dev (e.g. when middleware is bypassed).
  if (!slug) slug = DEFAULT_TENANT_SLUG;

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) {
    throw new RestaurantNotFoundError(slug);
  }
  return { restaurant, db: tenantDb(restaurant.id), slug };
}

export class RestaurantNotFoundError extends Error {
  constructor(public slug: string) {
    super(`Restaurant not found for slug: ${slug}`);
    this.name = "RestaurantNotFoundError";
  }
}
