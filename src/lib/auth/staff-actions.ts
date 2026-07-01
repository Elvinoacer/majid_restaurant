/**
 * Staff auth server actions (PRD §5.17).
 *
 * Wraps the staff auth helpers as Server Actions so the admin login form can
 * call them directly. The staff session is stored in a separate
 * `majidos_staff_session` cookie — never shared with the customer NextAuth
 * session.
 */
"use server";

import { redirect } from "next/navigation";
import { signInStaff, signOutStaff, getStaffSession } from "@/lib/auth/staff";
import { getContextRestaurant } from "@/lib/restaurant/context";

export type StaffLoginResult =
  | { ok: true; role: string }
  | { ok: false; error: string };

export async function staffLoginAction(
  email: string,
  password: string,
): Promise<StaffLoginResult> {
  try {
    const session = await signInStaff(email, password);
    if (!session) {
      return { ok: false, error: "Invalid email or password" };
    }
    return { ok: true, role: session.role };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function staffLogoutAction(): Promise<void> {
  await signOutStaff();
  const { restaurant } = await getContextRestaurant();
  redirect(`/${restaurant.slug}/admin/sign-in`);
}

export async function getStaffSessionAction() {
  return getStaffSession();
}
