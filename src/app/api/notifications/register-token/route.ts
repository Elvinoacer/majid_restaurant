import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * FCM token registration endpoint (PRD §5.15 — Phase 1 plumbing).
 *
 * Phase 1 only sets up the registration surface so the client-side service
 * worker can register a token. Notification firing begins in Phase 2
 * (order status changes, reservation confirmations).
 *
 * Accepts a POST with `{ token, restaurantSlug, customerId? }` and stores it
 * for later use. For Phase 1 we just acknowledge and log — the actual token
 * store will be added when notification sending lands in Phase 2.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, restaurantSlug, customerId } = body ?? {};

    if (!token || !restaurantSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing token or restaurantSlug" },
        { status: 400 },
      );
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Unknown restaurant" },
        { status: 404 },
      );
    }

    // Phase 1: log only. Phase 2 will persist to a PushSubscription table.
    if (process.env.NODE_ENV !== "production") {
      console.log("[FCM] token registered", {
        restaurantId: restaurant.id,
        customerId: customerId ?? null,
        tokenPreview: token.slice(0, 12) + "…",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[FCM] registration failed:", e);
    return NextResponse.json(
      { ok: false, error: "Registration failed" },
      { status: 500 },
    );
  }
}
