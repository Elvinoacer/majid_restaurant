/**
 * Staff authentication (PRD §7.2 note + §5.17).
 *
 * Deliberately separate from the customer NextAuth flow:
 *   - Staff use email + password only (no OAuth).
 *   - Sessions are signed JWTs in a separate `majidos_staff_session` cookie —
 *     never shared with customer `next-auth.session-token`.
 *   - Roles (OWNER / MANAGER / KITCHEN / FRONT_OF_HOUSE) gate admin features.
 *
 * Implementation uses `jose` for JWT signing/verifying — same library
 * NextAuth v5 uses internally, so no extra dependency.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db as prisma } from "@/lib/db";
import { getContextRestaurant } from "@/lib/restaurant/context";
import type { StaffRole, StaffUser } from "@/generated/prisma/client";

const STAFF_COOKIE = "majidos_staff_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error("AUTH_SECRET is required for staff session signing");
  }
  return new TextEncoder().encode(s);
}

export type StaffSession = {
  staffUserId: string;
  restaurantId: string;
  email: string;
  name: string;
  role: StaffRole;
};

/**
 * Sign in a staff user against the current tenant (resolved via request
 * headers). Returns a session object on success, or null on bad credentials.
 *
 * On success, also sets the httpOnly staff session cookie via the cookies()
 * API — the caller doesn't need to handle cookie writing.
 */
export async function signInStaff(
  email: string,
  password: string,
): Promise<StaffSession | null> {
  const { restaurant } = await getContextRestaurant();

  const staff = await prisma.staffUser.findUnique({
    where: {
      restaurantId_email: { restaurantId: restaurant.id, email: email.toLowerCase() },
    },
  });
  if (!staff || !staff.isActive || !staff.passwordHash) return null;

  const ok = await bcrypt.compare(password, staff.passwordHash);
  if (!ok) return null;

  const session: StaffSession = {
    staffUserId: staff.id,
    restaurantId: restaurant.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
  };

  const jwt = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const c = await cookies();
  c.set(STAFF_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return session;
}

/**
 * Sign out staff by clearing the cookie.
 */
export async function signOutStaff(): Promise<void> {
  const c = await cookies();
  c.delete(STAFF_COOKIE);
}

/**
 * Read the current staff session, scoped to the current tenant.
 *
 * Multi-tenant safety: even if a staff JWT is valid, we re-check that the
 * session's `restaurantId` matches the current request's tenant. A staff user
 * for tenant A cannot operate against tenant B's admin routes even if they
 * somehow visit the URL.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const c = await cookies();
  const jwt = c.get(STAFF_COOKIE)?.value;
  if (!jwt) return null;

  try {
    const { payload } = await jwtVerify(jwt, getSecret(), { algorithms: [ALG] });
    const session = payload as unknown as StaffSession;

    // Tenant re-check: must match the current request's tenant.
    const { restaurant } = await getContextRestaurant();
    if (session.restaurantId !== restaurant.id) return null;

    return session;
  } catch {
    return null;
  }
}

/**
 * Require a staff session with one of the given roles. Throws if not allowed —
 * the calling admin page can catch and render a 403.
 */
export async function requireStaff(
  allowedRoles: StaffRole[] = ["OWNER", "MANAGER", "KITCHEN", "FRONT_OF_HOUSE"],
): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) {
    throw new StaffAuthError("Not signed in");
  }
  if (!allowedRoles.includes(session.role)) {
    throw new StaffAuthError(`Role ${session.role} not permitted for this action`);
  }
  return session;
}

export class StaffAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffAuthError";
  }
}

/**
 * Hash a password for storage. Used by the seed script and the admin
 * "create staff user" form.
 */
export async function hashStaffPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export type { StaffUser };
