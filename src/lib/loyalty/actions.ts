/**
 * Loyalty server actions (PRD §5.11 — Loyalty Program).
 *
 * Phase 3 ships:
 *   - accrueLoyaltyForOrder   — internal: called when an order transitions to
 *                                COMPLETED. Idempotent: skips if a ledger
 *                                entry already exists for that order.
 *   - getCustomerLoyaltySummary — customer-facing: balance + recent ledger.
 *   - upsertLoyaltyRule / deleteLoyaltyRule / toggleLoyaltyRule
 *                              — owner/manager CRUD on LoyaltyRule rows.
 *   - redeemReward             — staff-initiated redemption: deducts points
 *                                and writes a REDEMPTION ledger entry.
 *   - adjustCustomerPoints     — staff-initiated manual adjustment
 *                                (signup bonus, mistake fix, etc).
 *
 * Accrual formula (PRD §5.11 — "configurable ratio per tenant"):
 *   pointsEarned = floor(order.total / restaurant.loyaltySpendPerPoint)
 *
 * All actions multi-tenant safe via tenantDb() + getContextRestaurant().
 * Customer-facing actions additionally check `getCustomerForCurrentTenant()`.
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getCustomerForCurrentTenant } from "@/auth";
import { requireStaff } from "@/lib/auth/staff";
import { db as prisma } from "@/lib/db";
import type {
  LoyaltyLedgerEntryType,
} from "@/generated/prisma/client";

export type LoyaltyResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── Internal: accrual hook (called by orders/actions.ts on COMPLETED) ───────

/**
 * Accrue loyalty points for a completed, paid order. Idempotent: if a ledger
 * entry already exists for this order, this is a no-op. Caller must ensure
 * the order is in COMPLETED status and was paid (paidAt != null).
 *
 * Returns the number of points accrued (0 if order had no customer, was 0
 * total, or was already accrued).
 */
export async function accrueLoyaltyForOrder(orderId: string): Promise<{
  pointsEarned: number;
  customerId: string | null;
}> {
  const { restaurant, db: tenant } = await getContextRestaurant();

  const order = await tenant.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      total: true,
      paidAt: true,
      status: true,
    },
  });
  if (!order) return { pointsEarned: 0, customerId: null };

  // Guard: only accrue for paid, completed orders tied to a logged-in customer.
  if (!order.customerId) return { pointsEarned: 0, customerId: null };
  if (order.status !== "COMPLETED") return { pointsEarned: 0, customerId: null };
  if (!order.paidAt) return { pointsEarned: 0, customerId: null };

  // Idempotency: re-running on an already-accrued order is a no-op.
  const existing = await tenant.loyaltyPointLedger.findFirst({
    where: { orderId: order.id, entryType: "ACCRUAL" },
    select: { id: true, points: true },
  });
  if (existing) return { pointsEarned: existing.points, customerId: order.customerId };

  const ratio = restaurant.loyaltySpendPerPoint > 0
    ? restaurant.loyaltySpendPerPoint
    : 100;
  const pointsEarned = Math.floor(order.total / ratio);
  if (pointsEarned <= 0) return { pointsEarned: 0, customerId: order.customerId };

  // Read current balance and apply.
  const customer = await tenant.customer.findUnique({
    where: { id: order.customerId },
    select: { loyaltyPoints: true },
  });
  if (!customer) return { pointsEarned: 0, customerId: null };

  const balanceAfter = customer.loyaltyPoints + pointsEarned;

  // Run the balance update + ledger insert in a single transaction so the
  // cached balance and the audit trail always agree.
  await prisma.$transaction([
    prisma.customer.update({
      where: { id: order.customerId },
      data: { loyaltyPoints: balanceAfter },
    }),
    prisma.loyaltyPointLedger.create({
      data: {
        restaurantId: restaurant.id,
        customerId: order.customerId,
        entryType: "ACCRUAL" as LoyaltyLedgerEntryType,
        points: pointsEarned,
        balanceAfter,
        orderId: order.id,
        description: `Earned from order #${order.id.slice(-6).toUpperCase()} (KSh ${Math.round(order.total)})`,
      },
    }),
  ]);

  return { pointsEarned, customerId: order.customerId };
}

// ── Customer-facing: summary ────────────────────────────────────────────────

export type LoyaltyLedgerEntry = {
  id: string;
  entryType: LoyaltyLedgerEntryType;
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export type LoyaltySummary = {
  balance: number;
  spendPerPoint: number;
  rules: Array<{
    id: string;
    description: string;
    pointsRequired: number | null;
    spendThreshold: number | null;
    rewardDescription: string;
  }>;
  recentEntries: LoyaltyLedgerEntry[];
};

export async function getCustomerLoyaltySummary(): Promise<LoyaltySummary | null> {
  const customerAuth = await getCustomerForCurrentTenant();
  if (!customerAuth) return null;

  const { restaurant, db: tenant } = await getContextRestaurant();

  // The auth helper only returns id/email/name/restaurantId — we need the
  // loyaltyPoints column too, so re-fetch.
  const customer = await tenant.customer.findUnique({
    where: { id: customerAuth.id },
    select: { loyaltyPoints: true },
  });
  if (!customer) return null;

  const [rules, recentEntries] = await Promise.all([
    tenant.loyaltyRule.findMany({
      where: { isActive: true },
      orderBy: { pointsRequired: "asc" },
    }),
    tenant.loyaltyPointLedger.findMany({
      where: { customerId: customerAuth.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    balance: customer.loyaltyPoints ?? 0,
    spendPerPoint: restaurant.loyaltySpendPerPoint,
    rules: rules.map((r) => ({
      id: r.id,
      description: r.description,
      pointsRequired: r.pointsRequired,
      spendThreshold: r.spendThreshold,
      rewardDescription: r.rewardDescription,
    })),
    recentEntries: recentEntries.map((e) => ({
      id: e.id,
      entryType: e.entryType,
      points: e.points,
      balanceAfter: e.balanceAfter,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

// ── Staff: LoyaltyRule CRUD ─────────────────────────────────────────────────

const UpsertRuleSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1).max(200),
  pointsRequired: z.number().int().positive().optional().nullable(),
  spendThreshold: z.number().nonnegative().optional().nullable(),
  rewardDescription: z.string().min(1).max(300),
  isActive: z.boolean().default(true),
});

export async function upsertLoyaltyRule(
  input: z.infer<typeof UpsertRuleSchema>,
): Promise<LoyaltyResult<{ id: string }>> {
  const parsed = UpsertRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const payload = {
    description: data.description,
    pointsRequired: data.pointsRequired ?? null,
    spendThreshold: data.spendThreshold ?? null,
    rewardDescription: data.rewardDescription,
    isActive: data.isActive,
  };

  let id: string;
  if (data.id) {
    const updated = await tenant.loyaltyRule.update({
      where: { id: data.id },
      data: payload,
    });
    id = updated.id;
  } else {
    const created = await tenant.loyaltyRule.create({ data: payload });
    id = created.id;
  }

  revalidatePath(`/${restaurant.slug}/admin/loyalty`);
  revalidatePath(`/${restaurant.slug}/account`);
  return { ok: true, data: { id } };
}

export async function deleteLoyaltyRule(id: string): Promise<LoyaltyResult<{ id: string }>> {
  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  await tenant.loyaltyRule.delete({ where: { id } });
  revalidatePath(`/${restaurant.slug}/admin/loyalty`);
  return { ok: true, data: { id } };
}

export async function toggleLoyaltyRule(id: string): Promise<LoyaltyResult<{ isActive: boolean }>> {
  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  const rule = await tenant.loyaltyRule.findUnique({ where: { id } });
  if (!rule) return { ok: false, error: "Rule not found" };
  const updated = await tenant.loyaltyRule.update({
    where: { id },
    data: { isActive: !rule.isActive },
  });
  revalidatePath(`/${restaurant.slug}/admin/loyalty`);
  return { ok: true, data: { isActive: updated.isActive } };
}

// ── Staff: customer lookup + redemption / adjustment ────────────────────────

export type CustomerLoyaltyAdmin = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  loyaltyPoints: number;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export async function searchCustomersForLoyalty(
  query: string,
): Promise<CustomerLoyaltyAdmin[]> {
  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { db: tenant } = await getContextRestaurant();

  const q = query.trim();
  if (!q) return [];

  // Email/name/phone substring match. Tenant scope is enforced by `tenant`.
  const customers = await tenant.customer.findMany({
    where: {
      OR: [
        { email: { contains: q.toLowerCase() } },
        { name: { contains: q } },
        { phone: { contains: q } },
      ],
    },
    take: 20,
    orderBy: { loyaltyPoints: "desc" },
    include: {
      orders: {
        where: { status: "COMPLETED" },
        select: { total: true, createdAt: true },
      },
    },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    loyaltyPoints: c.loyaltyPoints ?? 0,
    orderCount: c.orders.length,
    totalSpent: c.orders.reduce((s, o) => s + o.total, 0),
    lastOrderAt: c.orders.length
      ? new Date(
          c.orders
            .map((o) => o.createdAt.getTime())
            .sort((a, b) => b - a)[0]
        ).toISOString()
      : null,
  }));
}

export async function getCustomerLoyaltyAdmin(
  customerId: string,
): Promise<CustomerLoyaltyAdmin | null> {
  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { db: tenant } = await getContextRestaurant();
  const c = await tenant.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        where: { status: "COMPLETED" },
        select: { total: true, createdAt: true },
      },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    loyaltyPoints: c.loyaltyPoints ?? 0,
    orderCount: c.orders.length,
    totalSpent: c.orders.reduce((s, o) => s + o.total, 0),
    lastOrderAt: c.orders.length
      ? new Date(
          c.orders
            .map((o) => o.createdAt.getTime())
            .sort((a, b) => b - a)[0]
        ).toISOString()
      : null,
  };
}

const RedeemSchema = z.object({
  customerId: z.string().min(1),
  ruleId: z.string().optional().nullable(),
  pointsToRedeem: z.number().int().positive(),
  description: z.string().min(1).max(300),
});

export async function redeemReward(
  input: z.infer<typeof RedeemSchema>,
): Promise<LoyaltyResult<{ balanceAfter: number }>> {
  const parsed = RedeemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const session = await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const customer = await tenant.customer.findUnique({
    where: { id: data.customerId },
    select: { loyaltyPoints: true },
  });
  if (!customer) return { ok: false, error: "Customer not found" };
  if (customer.loyaltyPoints < data.pointsToRedeem) {
    return {
      ok: false,
      error: `Customer only has ${customer.loyaltyPoints} points (tried to redeem ${data.pointsToRedeem}).`,
    };
  }

  const balanceAfter = customer.loyaltyPoints - data.pointsToRedeem;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: data.customerId },
      data: { loyaltyPoints: balanceAfter },
    }),
    prisma.loyaltyPointLedger.create({
      data: {
        restaurantId: restaurant.id,
        customerId: data.customerId,
        entryType: "REDEMPTION",
        points: -data.pointsToRedeem,
        balanceAfter,
        loyaltyRuleId: data.ruleId ?? null,
        description: data.description,
        staffUserId: session.staffUserId,
      },
    }),
  ]);

  revalidatePath(`/${restaurant.slug}/admin/loyalty`);
  revalidatePath(`/${restaurant.slug}/account`);
  return { ok: true, data: { balanceAfter } };
}

const AdjustSchema = z.object({
  customerId: z.string().min(1),
  pointsDelta: z.number().int(), // signed: positive for bonus, negative for fix
  description: z.string().min(1).max(300),
});

export async function adjustCustomerPoints(
  input: z.infer<typeof AdjustSchema>,
): Promise<LoyaltyResult<{ balanceAfter: number }>> {
  const parsed = AdjustSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const session = await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const customer = await tenant.customer.findUnique({
    where: { id: data.customerId },
    select: { loyaltyPoints: true },
  });
  if (!customer) return { ok: false, error: "Customer not found" };

  const balanceAfter = Math.max(0, customer.loyaltyPoints + data.pointsDelta);
  const actualDelta = balanceAfter - customer.loyaltyPoints;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: data.customerId },
      data: { loyaltyPoints: balanceAfter },
    }),
    prisma.loyaltyPointLedger.create({
      data: {
        restaurantId: restaurant.id,
        customerId: data.customerId,
        entryType: "ADJUSTMENT",
        points: actualDelta,
        balanceAfter,
        description: data.description,
        staffUserId: session.staffUserId,
      },
    }),
  ]);

  revalidatePath(`/${restaurant.slug}/admin/loyalty`);
  revalidatePath(`/${restaurant.slug}/account`);
  return { ok: true, data: { balanceAfter } };
}

// ── Staff: tenant-wide accrual ratio config ─────────────────────────────────

const UpdateRatioSchema = z.object({
  spendPerPoint: z.number().positive(),
});

export async function updateLoyaltyAccrualRatio(
  input: z.infer<typeof UpdateRatioSchema>,
): Promise<LoyaltyResult<{ spendPerPoint: number }>> {
  const parsed = UpdateRatioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await requireStaff(["OWNER"]);
  const { restaurant } = await getContextRestaurant();

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { loyaltySpendPerPoint: parsed.data.spendPerPoint },
  });

  revalidatePath(`/${restaurant.slug}/admin/loyalty`);
  revalidatePath(`/${restaurant.slug}/account`);
  return { ok: true, data: { spendPerPoint: parsed.data.spendPerPoint } };
}
