"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";

/**
 * Mounted inside the tenant layout. Ensures the cart store is tagged with the
 * current tenant's slug so carts don't bleed between restaurants — and dumps
 * any existing cart if the user switches tenants.
 */
export function CartTenantSync({ slug }: { slug: string }) {
  const setRestaurantSlug = useCart((s) => s.setRestaurantSlug);
  useEffect(() => {
    setRestaurantSlug(slug);
  }, [slug, setRestaurantSlug]);
  return null;
}
