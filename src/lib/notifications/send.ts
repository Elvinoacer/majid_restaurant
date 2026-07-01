/**
 * Server-side FCM push helper (PRD §5.15).
 *
 * Sends push notifications to customers and staff on the events listed in
 * PRD §5.15:
 *   - Customer: order confirmed, order status changed, reservation confirmed,
 *     reservation reminder, catering inquiry acknowledged.
 *   - Staff: new order alert, new reservation alert (loud — sound + vibration).
 *
 * Tokens are persisted in the NotificationToken table (Phase 2 — Phase 1 only
 * logged them). If Firebase Admin credentials aren't configured, all `notify*`
 * helpers no-op gracefully — the app continues to function.
 *
 * Multi-tenant: notifications are always scoped to one restaurant. Staff
 * notifications go to all tokens for that restaurant; customer notifications
 * go to that customer's tokens.
 */
import admin, { cert, initializeApp, getApp } from "firebase-admin";
import { db as prisma } from "@/lib/db";
import type { Order, Restaurant, OrderItem } from "@/generated/prisma/client";

let app: admin.App | null = null;

function getFirebaseApp(): admin.App | null {
  if (app) return app;
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    return null;
  }
  try {
    const cred = cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
    try {
      app = initializeApp({ credential: cred });
    } catch (e) {
      if ((e as Error).message.includes("already exists")) {
        app = getApp();
      } else {
        throw e;
      }
    }
    return app;
  } catch (e) {
    console.warn("[fcm] failed to initialize Firebase Admin:", e);
    return null;
  }
}

async function sendMulticast(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<void> {
  if (tokens.length === 0) return;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[fcm] not configured, skipping send:", payload.title);
    }
    return;
  }
  try {
    const messages = tokens.map((t) => ({
      token: t,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: { priority: "high" as const },
    }));
    // `messaging()` is a runtime method on App; the type defs in firebase-admin
    // v14 don't surface it cleanly via the namespace import, so cast.
    const messaging = (firebaseApp as unknown as { messaging: () => { sendEach: (m: unknown[]) => Promise<unknown> } }).messaging();
    await messaging.sendEach(messages);
  } catch (e) {
    console.warn("[fcm] send failed:", e);
  }
}

/**
 * Notify customer that their order was paid & confirmed.
 */
export async function notifyOrderPaidCustomer(
  order: Order & { restaurant?: Restaurant | null },
): Promise<void> {
  if (!order.customerId) return; // guest checkout — no FCM token to send to
  const restaurant = order.restaurant ?? (await prisma.restaurant.findUnique({ where: { id: order.restaurantId } }));
  if (!restaurant) return;

  const tokens = await prisma.notificationToken.findMany({
    where: { customerId: order.customerId, restaurantId: order.restaurantId },
    select: { token: true },
  });
  await sendMulticast(
    tokens.map((t) => t.token),
    {
      title: `Order confirmed — ${restaurant.name}`,
      body: `We've received your KSh ${Math.round(order.total)} order. The kitchen is on it!`,
      data: {
        type: "order.confirmed",
        orderId: order.id,
        restaurantSlug: restaurant.slug,
      },
    },
  );
}

/**
 * Notify customer of an order status change.
 */
export async function notifyOrderStatusChange(
  order: Order & { restaurant?: Restaurant | null },
  newStatus: string,
): Promise<void> {
  if (!order.customerId) return;
  const restaurant = order.restaurant ?? (await prisma.restaurant.findUnique({ where: { id: order.restaurantId } }));
  if (!restaurant) return;

  const messages: Record<string, { title: string; body: string }> = {
    PREPARING: { title: "Your order is being prepared", body: "The kitchen has started your order." },
    READY: { title: "Your order is ready!", body: "Come pick it up or it'll be with you shortly." },
    OUT_FOR_DELIVERY: { title: "Out for delivery", body: "Your order is on its way." },
    DELIVERED: { title: "Order delivered", body: "Enjoy your meal — please leave us a review!" },
    COMPLETED: { title: "Order completed", body: "Thanks for ordering. Tap to leave a review." },
    CANCELLED: { title: "Order cancelled", body: "Your order was cancelled. Call us if this wasn't intentional." },
  };
  const msg = messages[newStatus];
  if (!msg) return;

  const tokens = await prisma.notificationToken.findMany({
    where: { customerId: order.customerId, restaurantId: order.restaurantId },
    select: { token: true },
  });
  await sendMulticast(tokens.map((t) => t.token), {
    ...msg,
    data: {
      type: `order.${newStatus.toLowerCase()}`,
      orderId: order.id,
      restaurantSlug: restaurant.slug,
    },
  });
}

/**
 * Notify all staff tokens for this restaurant that a new order landed.
 * Per PRD §5.15: "loud (sound + vibration where supported)".
 */
export async function notifyStaffNewOrder(
  restaurantId: string,
  order: Order,
): Promise<void> {
  const tokens = await prisma.notificationToken.findMany({
    where: { restaurantId, customerId: null },
    select: { token: true },
  });
  await sendMulticast(tokens.map((t) => t.token), {
    title: "🔔 New order!",
    body: `KSh ${Math.round(order.total)} · ${order.fulfillmentType.toLowerCase().replace("_", " ")}`,
    data: {
      type: "staff.new_order",
      orderId: order.id,
      restaurantId,
    },
  });
}

/**
 * Notify staff of a new reservation.
 */
export async function notifyStaffNewReservation(
  restaurantId: string,
  reservationId: string,
  guestName: string,
  partySize: number,
  reservedFor: Date,
): Promise<void> {
  const tokens = await prisma.notificationToken.findMany({
    where: { restaurantId, customerId: null },
    select: { token: true },
  });
  await sendMulticast(tokens.map((t) => t.token), {
    title: "🔔 New reservation",
    body: `${guestName} · party of ${partySize} · ${reservedFor.toLocaleString()}`,
    data: {
      type: "staff.new_reservation",
      reservationId,
      restaurantId,
    },
  });
}

/**
 * Notify staff of a new catering inquiry.
 */
export async function notifyStaffCateringInquiry(
  restaurantId: string,
  inquiryId: string,
  contactName: string,
  eventDate: Date,
): Promise<void> {
  const tokens = await prisma.notificationToken.findMany({
    where: { restaurantId, customerId: null },
    select: { token: true },
  });
  await sendMulticast(tokens.map((t) => t.token), {
    title: "🍽️ New catering inquiry",
    body: `${contactName} · event on ${eventDate.toLocaleDateString()}`,
    data: {
      type: "staff.catering_inquiry",
      inquiryId,
      restaurantId,
    },
  });
}

/**
 * Notify customer that their reservation was confirmed.
 */
export async function notifyReservationConfirmed(
  restaurantId: string,
  customerId: string | null,
  guestName: string,
  reservedFor: Date,
): Promise<void> {
  if (!customerId) return;
  const tokens = await prisma.notificationToken.findMany({
    where: { customerId, restaurantId },
    select: { token: true },
  });
  await sendMulticast(tokens.map((t) => t.token), {
    title: "Reservation confirmed",
    body: `See you ${reservedFor.toLocaleString()}! Reply to this restaurant directly to change.`,
    data: { type: "reservation.confirmed", restaurantId },
  });
}

/**
 * Helper type re-export for callers that need the full order with items.
 */
export type OrderWithItems = Order & { items: OrderItem[]; restaurant: Restaurant };
