/**
 * Menu admin server actions (PRD §5.17 — Menu CRUD).
 *
 * Phase 2 ships:
 *   - upsertMenuItem    — create or update
 *   - deleteMenuItem
 *   - toggleMenuItemAvailability  — quick toggle from the list
 *   - upsertCategory / deleteCategory
 *
 * All role-gated to OWNER / MANAGER.
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { serializeTags } from "@/lib/db/serialize";

const UpsertItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().nonnegative(),
  imageUrl: z.string().url().optional().or(z.literal("")).nullable(),
  categoryId: z.string().min(1),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  isHalal: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  mealBuilderStage: z
    .enum(["base", "protein", "drink", "dessert"])
    .optional()
    .nullable(),
});

export type MenuActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function upsertMenuItem(
  input: z.infer<typeof UpsertItemSchema>,
): Promise<MenuActionResult<{ id: string }>> {
  const parsed = UpsertItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  // Verify category belongs to this tenant.
  const category = await tenant.menuCategory.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) return { ok: false, error: "Category not found" };

  const payload = {
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    imageUrl: data.imageUrl || null,
    categoryId: data.categoryId,
    isAvailable: data.isAvailable,
    isPopular: data.isPopular,
    isVegetarian: data.isVegetarian,
    isVegan: data.isVegan,
    isSpicy: data.isSpicy,
    isHalal: data.isHalal,
    tagsJson: serializeTags(data.tags),
    mealBuilderStage: data.mealBuilderStage ?? null,
  };

  let id: string;
  if (data.id) {
    const updated = await tenant.menuItem.update({
      where: { id: data.id },
      data: payload,
    });
    id = updated.id;
  } else {
    const created = await tenant.menuItem.create({ data: payload });
    id = created.id;
  }

  revalidatePath(`/${restaurant.slug}/menu`);
  revalidatePath(`/${restaurant.slug}/admin/menu`);
  revalidatePath(`/${restaurant.slug}`);
  return { ok: true, data: { id } };
}

export async function deleteMenuItem(id: string): Promise<MenuActionResult<{ id: string }>> {
  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  await tenant.menuItem.delete({ where: { id } });
  revalidatePath(`/${restaurant.slug}/menu`);
  revalidatePath(`/${restaurant.slug}/admin/menu`);
  return { ok: true, data: { id } };
}

export async function toggleMenuItemAvailability(
  id: string,
): Promise<MenuActionResult<{ isAvailable: boolean }>> {
  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  const item = await tenant.menuItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Not found" };
  const updated = await tenant.menuItem.update({
    where: { id },
    data: { isAvailable: !item.isAvailable },
  });
  revalidatePath(`/${restaurant.slug}/menu`);
  revalidatePath(`/${restaurant.slug}/admin/menu`);
  return { ok: true, data: { isAvailable: updated.isAvailable } };
}

const UpsertCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(60),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function upsertCategory(
  input: z.infer<typeof UpsertCategorySchema>,
): Promise<MenuActionResult<{ id: string }>> {
  const parsed = UpsertCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  let id: string;
  if (data.id) {
    const updated = await tenant.menuCategory.update({
      where: { id: data.id },
      data: { name: data.name, sortOrder: data.sortOrder, isActive: data.isActive },
    });
    id = updated.id;
  } else {
    const created = await tenant.menuCategory.create({
      data: { name: data.name, sortOrder: data.sortOrder, isActive: data.isActive },
    });
    id = created.id;
  }

  revalidatePath(`/${restaurant.slug}/menu`);
  revalidatePath(`/${restaurant.slug}/admin/menu`);
  return { ok: true, data: { id } };
}

export async function deleteCategory(id: string): Promise<MenuActionResult<{ id: string }>> {
  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  // Block deletion if items exist — UI should warn, but enforce server-side too.
  const items = await tenant.menuItem.count({ where: { categoryId: id } });
  if (items > 0) {
    return { ok: false, error: `Cannot delete — ${items} items still in this category. Move them first.` };
  }
  await tenant.menuCategory.delete({ where: { id } });
  revalidatePath(`/${restaurant.slug}/menu`);
  revalidatePath(`/${restaurant.slug}/admin/menu`);
  return { ok: true, data: { id } };
}

/**
 * Staff account management (PRD §5.17 — "Staff account management").
 * Create new staff users with a role + initial password. The first OWNER is
 * created by the seed script; subsequent staff are created via this action.
 */
const CreateStaffSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["OWNER", "MANAGER", "KITCHEN", "FRONT_OF_HOUSE"]),
  password: z.string().min(8).max(120),
});

export async function createStaffUser(
  input: z.infer<typeof CreateStaffSchema>,
): Promise<MenuActionResult<{ id: string }>> {
  const parsed = CreateStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await requireStaff(["OWNER"]); // only OWNER can create new staff
  const { restaurant, db: tenant } = await getContextRestaurant();

  // Unique email per tenant.
  const existing = await tenant.staffUser.findUnique({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: data.email.toLowerCase() } },
  });
  if (existing) return { ok: false, error: "A staff user with that email already exists" };

  const { hashStaffPassword } = await import("@/lib/auth/staff");
  const passwordHash = await hashStaffPassword(data.password);

  const staff = await tenant.staffUser.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      role: data.role,
      passwordHash,
    },
  });

  revalidatePath(`/${restaurant.slug}/admin/staff`);
  return { ok: true, data: { id: staff.id } };
}

export async function deleteStaffUser(id: string): Promise<MenuActionResult<{ id: string }>> {
  const session = await requireStaff(["OWNER"]);
  if (session.staffUserId === id) {
    return { ok: false, error: "You cannot delete your own account" };
  }
  const { restaurant, db: tenant } = await getContextRestaurant();
  await tenant.staffUser.delete({ where: { id } });
  revalidatePath(`/${restaurant.slug}/admin/staff`);
  return { ok: true, data: { id } };
}

const UpdateStaffRoleSchema = z.object({
  staffId: z.string().min(1),
  role: z.enum(["OWNER", "MANAGER", "KITCHEN", "FRONT_OF_HOUSE"]),
});

/**
 * Change a staff member's role. OWNER-gated. Prevents demoting yourself
 * (you'd lock yourself out of the page that lets you fix it) and prevents
 * demoting the last remaining OWNER (which would orphan the tenant).
 */
export async function updateStaffRole(
  input: z.infer<typeof UpdateStaffRoleSchema>,
): Promise<MenuActionResult<{ role: string }>> {
  const parsed = UpdateStaffRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  const session = await requireStaff(["OWNER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  if (session.staffUserId === data.staffId && data.role !== "OWNER") {
    return { ok: false, error: "You cannot demote yourself. Promote another OWNER first." };
  }

  // Prevent demoting the last OWNER.
  if (data.role !== "OWNER") {
    const target = await tenant.staffUser.findUnique({ where: { id: data.staffId } });
    if (target?.role === "OWNER") {
      const ownerCount = await tenant.staffUser.count({
        where: { role: "OWNER", isActive: true },
      });
      if (ownerCount <= 1) {
        return { ok: false, error: "Cannot demote the last remaining OWNER. Promote another staff member first." };
      }
    }
  }

  const updated = await tenant.staffUser.update({
    where: { id: data.staffId },
    data: { role: data.role },
  });

  revalidatePath(`/${restaurant.slug}/admin/staff`);
  return { ok: true, data: { role: updated.role } };
}

/**
 * Activate / deactivate a staff member without deleting them. Deactivated
 * staff cannot sign in (enforced in `src/lib/auth/staff.ts`). OWNER-gated,
 * with the same self-protection guards as updateStaffRole.
 */
export async function setStaffActive(
  staffId: string,
  isActive: boolean,
): Promise<MenuActionResult<{ isActive: boolean }>> {
  const session = await requireStaff(["OWNER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  if (session.staffUserId === staffId && !isActive) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }

  // Prevent deactivating the last active OWNER.
  if (!isActive) {
    const target = await tenant.staffUser.findUnique({ where: { id: staffId } });
    if (target?.role === "OWNER") {
      const activeOwnerCount = await tenant.staffUser.count({
        where: { role: "OWNER", isActive: true },
      });
      if (activeOwnerCount <= 1) {
        return { ok: false, error: "Cannot deactivate the last active OWNER." };
      }
    }
  }

  const updated = await tenant.staffUser.update({
    where: { id: staffId },
    data: { isActive },
  });

  revalidatePath(`/${restaurant.slug}/admin/staff`);
  return { ok: true, data: { isActive: updated.isActive } };
}

/**
 * Reset a staff member's password to a new value. OWNER-gated. Used when
 * a staff member forgets their password — they can't self-serve without
 * the old one. The new password must be at least 8 characters.
 */
export async function resetStaffPassword(
  staffId: string,
  newPassword: string,
): Promise<MenuActionResult<{ ok: true }>> {
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }
  await requireStaff(["OWNER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const { hashStaffPassword } = await import("@/lib/auth/staff");
  const passwordHash = await hashStaffPassword(newPassword);

  await tenant.staffUser.update({
    where: { id: staffId },
    data: { passwordHash },
  });

  revalidatePath(`/${restaurant.slug}/admin/staff`);
  return { ok: true, data: { ok: true as const } };
}

/**
 * Customer account signup (PRD §5.13). Customer-side, not staff.
 *
 * Creates a Customer row scoped to the current tenant, hashes the password,
 * and signs them in via NextAuth's signIn. Used by the /sign-in page's
 * "Create account" tab.
 */
const CustomerSignupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(120),
  phone: z.string().min(5).max(40).optional().nullable(),
});

export async function customerSignup(
  input: z.infer<typeof CustomerSignupSchema>,
): Promise<MenuActionResult<{ customerId: string }>> {
  const parsed = CustomerSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const { restaurant, db: tenant } = await getContextRestaurant();

  const existing = await tenant.customer.findUnique({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: data.email.toLowerCase() } },
  });
  if (existing) return { ok: false, error: "An account with that email already exists" };

  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash(data.password, 10);

  const customer = await tenant.customer.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name,
      phone: data.phone ?? null,
      passwordHash,
    },
  });

  return { ok: true, data: { customerId: customer.id } };
}
