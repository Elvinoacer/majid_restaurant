import { StaffRole } from "@/generated/prisma/client";

export const ROLE_DEFAULT_ROUTES: Record<StaffRole, string> = {
  OWNER: "/admin",
  MANAGER: "/admin",
  KITCHEN: "/admin/kitchen",
  FRONT_OF_HOUSE: "/admin/orders",
};

export const ROLE_ALLOWED_ROUTES: Record<StaffRole, string[]> = {
  OWNER: ["/admin"], // Root prefix gives access to all
  MANAGER: ["/admin"], // Root prefix gives access to all
  KITCHEN: ["/admin/kitchen", "/admin/sign-in"],
  FRONT_OF_HOUSE: [
    "/admin/orders",
    "/admin/reservations",
    "/admin/tables",
    "/admin/menu",
    "/admin/sign-in",
  ],
};

/**
 * Checks if a user role is allowed to access a given pathname.
 * The pathname should start with `/<slug>/admin...` or `/admin...`.
 * This strips the slug to match against predefined roles.
 */
export function isRouteAllowedForRole(
  pathname: string,
  role: StaffRole,
): boolean {
  // Strip out the initial /slug part if present (assuming the path looks like /majid-restaurant/admin/...)
  // We want to match paths starting with `/admin`
  const parts = pathname.split("/").filter(Boolean);
  
  // If not starting with something that contains admin as second segment, just return true if it's not an admin route.
  // E.g., pathname = /majid-restaurant/admin/kitchen -> parts = ['majid-restaurant', 'admin', 'kitchen']
  const adminIndex = parts.indexOf("admin");
  if (adminIndex === -1) return true; // Not an admin route

  const adminPath = "/" + parts.slice(adminIndex).join("/");
  
  const allowedPrefixes = ROLE_ALLOWED_ROUTES[role];
  
  // Strict exact match for the admin dashboard root for restricted roles.
  // If the adminPath is exactly "/admin", FRONT_OF_HOUSE and KITCHEN shouldn't be allowed.
  if (adminPath === "/admin" || adminPath === "/admin/") {
    if (role === "KITCHEN" || role === "FRONT_OF_HOUSE") return false;
  }

  // Check if adminPath starts with any allowed prefix
  return allowedPrefixes.some((prefix) => adminPath.startsWith(prefix) || adminPath === prefix);
}
