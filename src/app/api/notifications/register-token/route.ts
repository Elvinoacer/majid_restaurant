import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerForCurrentTenant } from "@/auth";

/**
 * FCM token registration endpoint (PRD §5.15).
 *
 * Phase 1 only logged the token to the console. Phase 2 persists it to the
 * NotificationToken table so server-side notifications can actually fire on
 * order & reservation events.
 *
 * Accepts: `{ token, restaurantSlug, platform?, userAgent? }`
 *
 * Security: `customerId` is NEVER trusted from the request body — it is
 * resolved from the NextAuth session via `getCustomerForCurrentTenant()`.
 * This prevents a malicious client from registering push tokens under
 * another customer's ID (which would let them receive that customer's
 * order-status notifications).
 *
 * Anonymous tokens (no session) are allowed — they're how staff devices
 * and not-yet-logged-in browsers subscribe to notifications. Customer
 * tokens are stamped with customerId when the customer signs in.
 *
 * The endpoint is idempotent on (restaurantId, token) — re-registering an
 * existing token bumps `lastSeenAt` instead of inserting a duplicate.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, restaurantSlug, platform, userAgent, customerId: bodyCustomerId } = body ?? {};

    if (!token || !restaurantSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing token or restaurantSlug" },
        { status: 400 },
      );
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, slug: true },
    });
    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Unknown restaurant" },
        { status: 404 },
      );
    }

    // Resolve customerId from the session — never trust the body. If a body
    // customerId is provided AND it doesn't match the session, we silently
    // ignore the body value (defensive — logged for monitoring).
    let customerId: string | null = null;
    try {
      const customer = await getCustomerForCurrentTenant();
      if (customer && customer.restaurantId === restaurant.id) {
        customerId = customer.id;
      } else if (bodyCustomerId) {
        // Body supplied a customerId but no matching session — ignore it.
        console.warn(
          "[FCM] ignoring body customerId — no matching session for restaurant",
          restaurant.slug,
        );
      }
    } catch {
      // Session lookup failed (e.g. no AUTH_SECRET) — register anonymously.
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
        customerId,
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
