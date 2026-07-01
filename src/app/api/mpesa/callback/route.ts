/**
 * M-Pesa Daraja callback handler (PRD §5.14 — idempotency requirement).
 *
 * Daraja POSTs the STK Push result here after the customer enters their PIN.
 * It may retry this callback on transient failures, so we MUST be idempotent.
 *
 * Idempotency strategy:
 *   1. Look up the Order by `mpesaCheckoutRequestId` (unique index).
 *   2. If the order is already `CONFIRMED` (or further along), the callback
 *      is a replay — respond 200 and do nothing.
 *   3. Otherwise, transition the order based on ResultCode:
 *        - 0  → CONFIRMED + paidAt + receipt number + broadcast order:new
 *        - !=0 → CANCELLED with ResultDesc in specialInstructions (preserved
 *                for the customer's order history)
 *
 * Note: this route is exempt from tenant resolution (see proxy.ts) — the
 * Order's restaurantId is read from the order itself, not the request path.
 * This is required because Daraja doesn't know our slugs.
 */
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { parseMpesaCallback, type MpesaCallbackBody } from "@/lib/mpesa/daraja";
import { broadcastOrderEvent } from "@/lib/realtime/emit";
import { notifyOrderPaidCustomer, notifyStaffNewOrder } from "@/lib/notifications/send";
import type { OrderStatus } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: MpesaCallbackBody;
  try {
    body = (await req.json()) as MpesaCallbackBody;
  } catch {
    // Malformed body — Daraja still expects 200, otherwise it retries forever.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const parsed = parseMpesaCallback(body);
  if (!parsed) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // Idempotency: find the order. If not found, the customer may have hit
  // "cancel" before we persisted the CheckoutRequestID — log and 200.
  const order = await prisma.order.findUnique({
    where: { mpesaCheckoutRequestId: parsed.checkoutRequestId },
    include: { restaurant: true, items: true },
  });

  if (!order) {
    console.warn("[mpesa-callback] order not found for checkoutRequestId", parsed.checkoutRequestId);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Idempotency: if the order is already past PENDING_PAYMENT, this is a
  // replay — acknowledge and exit.
  const PAST_PAYMENT: OrderStatus[] = [
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
  ];
  if (PAST_PAYMENT.includes(order.status)) {
    return NextResponse.json({ ok: true, replay: true }, { status: 200 });
  }

  if (parsed.success) {
    // ── Payment succeeded → mark CONFIRMED ───────────────────────
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CONFIRMED",
        paidAt: parsed.transactionDate ?? new Date(),
        // Stash the receipt number on the Order via a JSON-serializable field.
        // We re-use `specialInstructions` to avoid a schema migration; the
        // receipt is also stored in the broadcast payload for the kitchen.
        specialInstructions: [
          order.specialInstructions,
          `[M-PESA receipt: ${parsed.mpesaReceiptNumber ?? "n/a"}]`,
        ].filter(Boolean).join("\n"),
      },
    });

    // Fire-and-forget: notify kitchen dashboard (Socket.IO) + customer (FCM).
    await Promise.allSettled([
      broadcastOrderEvent(order.restaurant.id, {
        type: "order:new",
        orderId: order.id,
        restaurantId: order.restaurant.id,
        status: "CONFIRMED",
        total: order.total,
        fulfillmentType: order.fulfillmentType,
        items: order.items.map((it) => ({
          menuItemId: it.menuItemId,
          quantity: it.quantity,
          notes: it.notes,
        })),
      }),
      notifyOrderPaidCustomer(order),
      notifyStaffNewOrder(order.restaurant.id, order),
    ]);
  } else {
    // ── Payment failed / cancelled → mark CANCELLED ─────────────
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        // Preserve the original notes + add the M-Pesa failure reason.
        specialInstructions: [
          order.specialInstructions,
          `[M-Pesa failed: ${parsed.resultDesc}]`,
        ].filter(Boolean).join("\n"),
      },
    });

    // Tell the kitchen dashboard so it can drop the ticket if it was already
    // shown in a "preparing" state. (Customer gets a separate notification.)
    await Promise.allSettled([
      broadcastOrderEvent(order.restaurant.id, {
        type: "order:status_changed",
        orderId: order.id,
        restaurantId: order.restaurant.id,
        status: "CANCELLED",
      }),
    ]);
  }

  // Always respond 200 to Daraja, regardless of internal errors — Daraja
  // retries on non-200 and our idempotency guard above will handle replays.
  return NextResponse.json({ ok: true }, { status: 200 });
}
