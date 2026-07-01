/**
 * Socket.IO emit helper (PRD §8).
 *
 * Per PRD, Socket.IO runs as an EXTERNAL service — Vercel serverless can't
 * hold persistent WebSocket connections. This app POSTs events to the external
 * socket service, which then broadcasts them to subscribed rooms.
 *
 * Rooms are namespaced by `restaurantId` — that's the tenant isolation
 * boundary on the socket side, mirroring the DB-level isolation.
 *
 * Configuration: set NEXT_PUBLIC_SOCKET_URL + SOCKET_SERVER_SECRET in .env.
 * If unset, `broadcastOrderEvent` / `broadcastReservationEvent` no-op
 * gracefully — the rest of the app continues to function (kitchen dashboard
 * just won't receive live updates until the socket service is wired up).
 */

type OrderEvent =
  | {
      type: "order:new";
      orderId: string;
      restaurantId: string;
      status: string;
      total: number;
      fulfillmentType: string;
      items: Array<{ menuItemId: string; quantity: number; notes?: string | null }>;
    }
  | {
      type: "order:status_changed";
      orderId: string;
      restaurantId: string;
      status: string;
    };

type ReservationEvent = {
  type: "reservation:new";
  reservationId: string;
  restaurantId: string;
  guestName: string;
  partySize: number;
  reservedFor: string; // ISO
};

type Event = OrderEvent | ReservationEvent;

function socketUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!base) return null;
  return base.replace(/\/$/, "") + "/emit";
}

/**
 * POST an event to the external Socket.IO service. The service is expected to
 * expose an `/emit` endpoint that accepts `{ room, event }` and re-broadcasts
 * `event` to all sockets currently joined to `room`.
 *
 * `room` is always `restaurant:<restaurantId>` — the kitchen dashboard and
 * admin order list join this room on mount.
 */
async function emit(restaurantId: string, event: Event): Promise<void> {
  const url = socketUrl();
  if (!url) {
    // No-op: socket service not configured. This is fine for dev / demo.
    if (process.env.NODE_ENV !== "production") {
      console.debug("[realtime] no NEXT_PUBLIC_SOCKET_URL set, skipping emit:", event.type);
    }
    return;
  }

  const secret = process.env.SOCKET_SERVER_SECRET;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-socket-secret": secret } : {}),
      },
      body: JSON.stringify({
        room: `restaurant:${restaurantId}`,
        event,
      }),
    });
  } catch (e) {
    // Don't throw — the order/reservation is already persisted. Realtime is a
    // best-effort side effect.
    console.warn("[realtime] emit failed:", e);
  }
}

export function broadcastOrderEvent(restaurantId: string, event: OrderEvent): Promise<void> {
  return emit(restaurantId, event);
}

export function broadcastReservationEvent(
  restaurantId: string,
  event: ReservationEvent,
): Promise<void> {
  return emit(restaurantId, event);
}
