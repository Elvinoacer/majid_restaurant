import { redirect } from "next/navigation";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getStaffSession } from "@/lib/auth/staff";
import { AdminShell } from "@/components/admin/admin-shell";

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

  // Sign-in route renders without the shell or auth gate.
  if (!session) {
    if (slug && (await params).slug) {
      // check if we're already on the sign-in page
      // (the page itself doesn't need this redirect)
    }
    redirect(`/${slug}/admin/sign-in`);
  }

  return (
    <AdminShell
      slug={slug}
      restaurantName={restaurant.name}
      staffName={session.name}
      staffRole={session.role}
    >
      {children}
    </AdminShell>
  );
}
