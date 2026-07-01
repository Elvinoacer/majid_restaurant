import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * FCM token registration endpoint (PRD §5.15).
 *
 * Phase 1 only logged the token to the console. Phase 2 persists it to the
 * NotificationToken table so server-side notifications can actually fire on
 * order & reservation events.
 *
 * Accepts: `{ token, restaurantSlug, customerId?, platform?, userAgent? }`
 *
 * The endpoint is idempotent on (restaurantId, token) — re-registering an
 * existing token bumps `lastSeenAt` instead of inserting a duplicate.
 *
 * Anonymous tokens (no customerId) are allowed — they're how staff devices
 * and not-yet-logged-in browsers subscribe to notifications. Customer tokens
 * are stamped with customerId when the customer signs in (see sign-in flow).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, restaurantSlug, customerId, platform, userAgent } = body ?? {};

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

    await db.notificationToken.upsert({
      where: {
        restaurantId_token: { restaurantId: restaurant.id, token },
      },
      update: {
        lastSeenAt: new Date(),
        ...(customerId ? { customerId } : {}),
        ...(platform ? { platform } : {}),
        ...(userAgent ? { userAgent } : {}),
      },
      create: {
        restaurantId: restaurant.id,
        token,
        customerId: customerId ?? null,
        platform: platform ?? null,
        userAgent: userAgent ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[FCM] registration failed:", e);
    return NextResponse.json(
      { ok: false, error: "Registration failed" },
      { status: 500 },
    );
  }
}
