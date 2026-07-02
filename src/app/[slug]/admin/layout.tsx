import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getStaffSession } from "@/lib/auth/staff";
import { AdminShell } from "@/components/admin/admin-shell";
import { isRouteAllowedForRole, ROLE_DEFAULT_ROUTES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Admin layout (PRD §5.17).
 *
 * Gates every /<slug>/admin/* route on a valid staff session for THIS tenant.
 * The sign-in route is the only exempt child.
 *
 * Multi-tenant safety: getStaffSession() re-checks that the session's
 * restaurantId matches the current request's tenant, so a staff JWT for
 * tenant A is useless against tenant B's admin routes.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant } = await getContextRestaurant();
  const session = await getStaffSession();

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Sign-in route renders without the shell or auth gate.
  if (pathname.endsWith("/admin/sign-in")) {
    return <>{children}</>;
  }

  if (!session) {
    redirect(`/${slug}/admin/sign-in`);
  }

  if (!isRouteAllowedForRole(pathname, session.role)) {
    const defaultRoute = ROLE_DEFAULT_ROUTES[session.role] || "/admin";
    redirect(`/${slug}${defaultRoute}`);
  }

  return (
    <AdminShell
      slug={slug}
      restaurantName={restaurant.name}
      logoUrl={restaurant.logoUrl}
      staffName={session.name}
      staffRole={session.role}
    >
      {children}
    </AdminShell>
  );
}
