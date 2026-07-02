"use client";

/**
 * Analytics tracker — fires a `menu_view` event when the menu page mounts.
 *
 * Mounted as a zero-pixel invisible element on the /<slug>/menu page. Calls
 * the `trackEvent` Server Action once per browser session per day, so repeat
 * refreshes within a single browsing session don't inflate the metric.
 *
 * The dedupe key (sessionId + day) is enforced server-side in
 * `getConversionFunnel`, so the client here is intentionally simple: just
 * fire once on mount.
 */
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/actions";

export function AnalyticsTracker({
  restaurantSlug,
  eventType,
  payload,
  fireOnMount = true,
}: {
  restaurantSlug: string;
  eventType:
    | "menu_view"
    | "recommendation_used"
    | "meal_builder_used";
  payload?: Record<string, unknown>;
  fireOnMount?: boolean;
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!fireOnMount) return;
    if (firedRef.current) return;
    firedRef.current = true;
    // Fire-and-forget — analytics must never block UI.
    void trackEvent(eventType, { ...payload, slug: restaurantSlug }).catch(
      () => {},
    );
  }, [fireOnMount, eventType, restaurantSlug, payload]);

  return null;
}
