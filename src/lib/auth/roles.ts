import { StaffRole } from "@/generated/prisma/client";

/**
 * Per-role default landing route after sign-in.
 * Used by the admin layout to redirect staff to the most relevant page
 * for their role (e.g. KITCHEN → kitchen dashboard, not the overview).
 */
export const ROLE_DEFAULT_ROUTES: Record<StaffRole, string> = {
  OWNER: "/admin",
  MANAGER: "/admin",
  KITCHEN: "/admin/kitchen",
  FRONT_OF_HOUSE: "/admin/orders",
};

/**
 * Per-role allowed admin route prefixes.
 *
 * The NAV in `admin-shell.tsx` is derived from a single source of truth
 * (`ROLE_NAV` below) so the visible navigation and the route guard can
 * never drift apart — fixing the previous bug where staff saw nav items
 * that silently redirected them when clicked.
 *
 * OWNER + MANAGER get the root prefix → all access.
 * KITCHEN can only see the kitchen dashboard.
 * FRONT_OF_HOUSE sees the customer-interaction surfaces: orders,
 *   reservations, catering, events, tables, menu (read-only menu
 *   management is allowed per `menu/actions.ts`), loyalty, careers,
 *   reviews. They do NOT see analytics or staff management.
 */
export const ROLE_ALLOWED_ROUTES: Record<StaffRole, string[]> = {
  OWNER: ["/admin"],
  MANAGER: ["/admin"],
  KITCHEN: ["/admin/kitchen", "/admin/sign-in"],
  FRONT_OF_HOUSE: [
    "/admin/orders",
    "/admin/reservations",
    "/admin/catering",
    "/admin/events",
    "/admin/tables",
    "/admin/menu",
    "/admin/loyalty",
    "/admin/careers",
    "/admin/reviews",
    "/admin/sign-in",
  ],
};

/**
 * Single source of truth for the admin sidebar navigation.
 *
 * `roles` is optional — when omitted, the item is visible to every role
 * that is allowed to access the route (after ROLE_ALLOWED_ROUTES filtering).
 * When present, the item is only shown to those roles.
 *
 * `admin-shell.tsx` filters this list by the current staff member's role
 * AND verifies each remaining item is allowed by `isRouteAllowedForRole`
 * — defensive double-check so a misconfiguration here can never expose
 * a link to a forbidden route.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: string; // lucide icon name — mapped to the component in admin-shell
  roles?: StaffRole[];
  section?: NavSection;
};

export type NavSection =
  | "operations"
  | "guests"
  | "content"
  | "insights"
  | "team";

export const ROLE_NAV: NavItem[] = [
  { href: "", label: "Overview", icon: "LayoutDashboard", roles: ["OWNER", "MANAGER"], section: "operations" },
  { href: "/orders", label: "Orders", icon: "ShoppingBag", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "operations" },
  { href: "/kitchen", label: "Kitchen", icon: "ChefHat", roles: ["OWNER", "MANAGER", "KITCHEN"], section: "operations" },
  { href: "/reservations", label: "Reservations", icon: "Calendar", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "guests" },
  { href: "/catering", label: "Catering", icon: "UtensilsCrossed", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "guests" },
  { href: "/events", label: "Events", icon: "CalendarDays", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "guests" },
  { href: "/tables", label: "Tables & QR", icon: "QrCode", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "guests" },
  { href: "/loyalty", label: "Loyalty", icon: "Gift", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "guests" },
  { href: "/menu", label: "Menu", icon: "Utensils", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "content" },
  { href: "/reviews", label: "Reviews", icon: "Star", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "content" },
  { href: "/careers", label: "Careers", icon: "Briefcase", roles: ["OWNER", "MANAGER", "FRONT_OF_HOUSE"], section: "content" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3", roles: ["OWNER", "MANAGER"], section: "insights" },
  { href: "/staff", label: "Staff", icon: "Users", roles: ["OWNER"], section: "team" },
];

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  operations: "Operations",
  guests: "Guests",
  content: "Content",
  insights: "Insights",
  team: "Team",
};

/**
 * Returns the nav items visible to a given role.
 */
export function getNavForRole(role: StaffRole): NavItem[] {
  return ROLE_NAV.filter((item) => !item.roles || item.roles.includes(role));
}

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
