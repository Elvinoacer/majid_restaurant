/**
 * Order server actions (PRD §5.4 — Online Ordering + §5.14 — M-Pesa).
 *
 * Lifecycle:
 *   DRAFT → PENDING_PAYMENT → CONFIRMED → PREPARING → READY
 *                                  → OUT_FOR_DELIVERY → DELIVERED → COMPLETED
 *   (any of the above → CANCELLED)
 *
 * Phase 2 ships:
 *   - createOrderFromCart  — guest or logged-in; creates DRAFT
 *   - submitOrder          — kicks off M-Pesa STK Push (->PENDING_PAYMENT)
 *                            or cash (->CONFIRMED)
 *   - cancelOrder          — customer/staff cancel before CONFIRMED
 *   - updateOrderStatus    — staff moves order through the lifecycle
 *
 * All actions are multi-tenant safe via getContextRestaurant() + tenantDb().
 * Customer actions additionally check `getCustomerForCurrentTenant()` for
 * account-scoped flows (order history, "my orders").
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getCustomerForCurrentTenant } from "@/auth";
import { requireStaff } from "@/lib/auth/staff";
import { initiateStkPush, isMpesaConfigured, normalizeMsisdn } from "@/lib/mpesa/daraja";
import { broadcastOrderEvent } from "@/lib/realtime/emit";
import {
  notifyOrderStatusChange,
  notifyStaffNewOrder,
} from "@/lib/notifications/send";
import { db as prisma } from "@/lib/db";
import type { FulfillmentType, OrderStatus, PaymentMethod } from "@/generated/prisma/client";

const CartLineSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().min(1),
  notes: z.string().optional().nullable(),
});

const CreateOrderSchema = z.object({
  lines: z.array(CartLineSchema).min(1, "Cart is empty"),
  fulfillmentType: z.enum(["DELIVERY", "PICKUP", "DINE_IN"]),
  scheduledFor: z.string().optional().nullable(), // ISO or null = asap
  deliveryAddress: z.string().optional().nullable(),
  tableId: z.string().optional().nullable(), // DINE_IN
  specialInstructions: z.string().optional().nullable(),
  guestName: z.string().min(1).max(120),
  guestPhone: z.string().min(5).max(40),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Create a DRAFT order from a cart. Validates that every menu item belongs to
 * the current tenant and is currently available. Captures the unit price as
 * stored on the menu (snapshot — price changes don't rewrite history).
 *
 * Does NOT initiate payment — call `submitOrder` after to start M-Pesa STK or
 * confirm a cash order.
 */
export async function createOrderFromCart(
  input: CreateOrderInput,
): Promise<ActionResult<{ orderId: string; total: number }>> {
  const parsed = CreateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const { restaurant, db: tenant } = await getContextRestaurant();

  // Re-fetch each menu item to verify it belongs to this tenant, is available,
  // and to snapshot the authoritative price (don't trust client-sent unitPrice).
  const menuItemIds = data.lines.map((l) => l.menuItemId);
  const menuItems = await tenant.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, name: true, price: true, isAvailable: true },
  });
  type MenuItemSnap = { id: string; name: string; price: number; isAvailable: boolean };
  const menuById = new Map<string, MenuItemSnap>(
    menuItems.map((m) => [m.id, m as MenuItemSnap]),
  );

  for (const line of data.lines) {
    const item = menuById.get(line.menuItemId);
    if (!item) {
      return { ok: false, error: `Item not found: ${line.name}` };
    }
    if (!item.isAvailable) {
      return { ok: false, error: `Item sold out: ${item.name}` };
    }
  }

  // Subtotal from server-authoritative prices.
  const subtotal = data.lines.reduce(
    (sum, l) => sum + (menuById.get(l.menuItemId)?.price ?? 0) * l.quantity,
    0,
  );
  const total = subtotal; // Phase 2: no delivery fee / tax logic.

  // Attach customer if logged in (guest checkout still works without one).
  const customer = await getCustomerForCurrentTenant();

  const order = await tenant.order.create({
    data: {
      restaurantId: restaurant.id,
      customerId: customer?.id ?? null,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      status: "DRAFT",
      fulfillmentType: data.fulfillmentType as FulfillmentType,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      deliveryAddress: data.deliveryAddress ?? null,
      tableId: data.tableId ?? null,
      specialInstructions: data.specialInstructions ?? null,
      subtotal,
      total,
      items: {
        create: data.lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          unitPrice: menuById.get(l.menuItemId)?.price ?? 0,
          notes: l.notes ?? null,
        })),
      },
    },
    include: { items: true },
  });

  return { ok: true, data: { orderId: order.id, total } };
}

const SubmitOrderSchema = z.object({
  orderId: z.string().min(1),
  paymentMethod: z.enum(["MPESA", "CASH"]),
  // Phone for M-Pesa STK Push. May differ from guestPhone — e.g., customer
  // places order with their main number but pays from a different M-Pesa line.
  mpesaPhone: z.string().optional(),
});

/**
 * Submit a DRAFT order for payment / confirmation.
 *
 * - MPESA: initiates STK Push → status becomes PENDING_PAYMENT. The callback
 *   at /api/mpesa/callback transitions it to CONFIRMED on success.
 * - CASH: skips payment → status becomes CONFIRMED immediately.
 *
 * Either way, on CONFIRMED the kitchen dashboard gets a Socket.IO broadcast
 * and staff/customer get an FCM push.
 */
export async function submitOrder(
  input: z.infer<typeof SubmitOrderSchema>,
): Promise<ActionResult<{
  status: OrderStatus;
  mpesa?: { checkoutRequestId: string; customerMessage: string };
}>> {
  const parsed = SubmitOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { orderId, paymentMethod, mpesaPhone } = parsed.data;

  const { restaurant, db: tenant } = await getContextRestaurant();

  const order = await tenant.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status !== "DRAFT") {
    return { ok: false, error: `Order already submitted (status: ${order.status})` };
  }

  // ── CASH path ───────────────────────────────────────────────
  if (paymentMethod === "CASH") {
    await tenant.order.update({
      where: { id: order.id },
      data: {
        status: "CONFIRMED",
        paymentMethod: "CASH",
        paidAt: new Date(),
      },
    });

    const refreshed = await tenant.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    await Promise.allSettled([
      broadcastOrderEvent(restaurant.id, {
        type: "order:new",
        orderId: order.id,
        restaurantId: restaurant.id,
        status: "CONFIRMED",
        total: order.total,
        fulfillmentType: order.fulfillmentType,
        items: order.items.map((it) => ({
          menuItemId: it.menuItemId,
          quantity: it.quantity,
          notes: it.notes,
        })),
      }),
      notifyStaffNewOrder(restaurant.id, refreshed ?? order),
    ]);

    revalidatePath(`/${restaurant.slug}/orders/${order.id}`);
    revalidatePath(`/${restaurant.slug}/admin/orders`);

    return { ok: true, data: { status: "CONFIRMED" } };
  }

  // ── MPESA path ──────────────────────────────────────────────
  if (!isMpesaConfigured()) {
    return {
      ok: false,
      error: "M-Pesa is not configured for this deployment. Set MPESA_* env vars or use cash on delivery.",
    };
  }

  const phoneToUse = mpesaPhone ?? order.guestPhone;
  if (!phoneToUse) {
    return { ok: false, error: "M-Pesa phone number is required" };
  }
  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeMsisdn(phoneToUse);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // Initiate STK Push. If this fails, leave the order in DRAFT so the customer
  // can retry — don't transition to PENDING_PAYMENT until we have a
  // CheckoutRequestID to anchor the callback on.
  let stk;
  try {
    stk = await initiateStkPush({
      phone: normalizedPhone,
      amount: order.total,
      accountReference: `ORD-${order.id.slice(-6).toUpperCase()}`,
      description: `${restaurant.name} order`,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // Persist the CheckoutRequestID — this is the idempotency key the callback
  // will reference. Status becomes PENDING_PAYMENT so the customer's order
  // status page shows "waiting for M-Pesa confirmation".
  await tenant.order.update({
    where: { id: order.id },
    data: {
      status: "PENDING_PAYMENT",
      paymentMethod: "MPESA",
      mpesaCheckoutRequestId: stk.checkoutRequestId,
    },
  });

  revalidatePath(`/${restaurant.slug}/orders/${order.id}`);
  return {
    ok: true,
    data: {
      status: "PENDING_PAYMENT",
      mpesa: {
        checkoutRequestId: stk.checkoutRequestId,
        customerMessage: stk.customerMessage,
      },
    },
  };
}

/**
 * Customer-initiated cancel. Only allowed while the order is in DRAFT or
 * PENDING_PAYMENT — once it's CONFIRMED, only staff can cancel.
 */
export async function cancelOrder(orderId: string): Promise<ActionResult<{ status: OrderStatus }>> {
  const { restaurant, db: tenant } = await getContextRestaurant();
  const order = await tenant.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found" };

  if (!["DRAFT", "PENDING_PAYMENT"].includes(order.status)) {
    return { ok: false, error: "Cannot cancel — order already confirmed. Call the restaurant." };
  }

  await tenant.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });

  await Promise.allSettled([
    broadcastOrderEvent(restaurant.id, {
      type: "order:status_changed",
      orderId: order.id,
      restaurantId: restaurant.id,
      status: "CANCELLED",
    }),
  ]);

  revalidatePath(`/${restaurant.slug}/orders/${order.id}`);
  revalidatePath(`/${restaurant.slug}/admin/orders`);
  return { ok: true, data: { status: "CANCELLED" } };
}

const UpdateStatusSchema = z.object({
  orderId: z.string().min(1),
  // Allow any OrderStatus transition here (validation of legal transitions is
  // done by the UI flow); DRAFT and PENDING_PAYMENT are intentionally included
  // because they're valid rollback targets in edge cases (e.g. payment retry).
  status: z.enum([
    "DRAFT",
    "PENDING_PAYMENT",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
  ]),
});

/**
 * Staff action: advance an order through the lifecycle. Role-gated to
 * OWNER / MANAGER / KITCHEN / FRONT_OF_HOUSE. Emits Socket.IO broadcast and
 * FCM push to customer on every transition.
 */
export async function updateOrderStatus(
  input: z.infer<typeof UpdateStatusSchema>,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const parsed = UpdateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const session = await requireStaff();
  const { restaurant, db: tenant } = await getContextRestaurant();

  const order = await tenant.order.findUnique({
    where: { id: parsed.data.orderId },
  });
  if (!order) return { ok: false, error: "Order not found" };

  await tenant.order.update({
    where: { id: order.id },
    data: { status: parsed.data.status as OrderStatus },
  });

  await Promise.allSettled([
    broadcastOrderEvent(restaurant.id, {
      type: "order:status_changed",
      orderId: order.id,
      restaurantId: restaurant.id,
      status: parsed.data.status,
    }),
    notifyOrderStatusChange(order, parsed.data.status),
  ]);

  revalidatePath(`/${restaurant.slug}/admin/orders`);
  revalidatePath(`/${restaurant.slug}/orders/${order.id}`);
  return { ok: true, data: { status: parsed.data.status as OrderStatus } };
}

/**
 * Get a single order by ID — for customer-facing order status pages.
 * Multi-tenant safe: must belong to the current tenant.
 */
export async function getOrderForCustomer(orderId: string) {
  const { db: tenant } = await getContextRestaurant();
  return tenant.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
    },
  });
}

/**
 * List a customer's recent orders (only if logged in).
 */
export async function listMyOrders() {
  const customer = await getCustomerForCurrentTenant();
  if (!customer) return [];
  const { db: tenant } = await getContextRestaurant();
  return tenant.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { items: true },
  });
}
